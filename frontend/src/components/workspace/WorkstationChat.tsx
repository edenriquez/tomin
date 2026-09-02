"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib/api";
import type { Period } from "@/lib/metrics";
import { conversationsApi, type Conversation } from "@/lib/workstations";
import { Select } from "@/components/ui";
import { ChatMarkdown } from "./ChatMarkdown";
import { useWorkspace } from "./WorkspaceProvider";

type Turn = { role: "user" | "assistant"; content: string };

type Status = { available: boolean; model: string };

/**
 * Ask about this set, in words.
 *
 * The band below the numbers, not instead of them. The tiles and the chart
 * answer the questions the product anticipated; this is for the ones it did
 * not, and it is deliberately the *last* thing on the page — a chat box at the
 * top would suggest the numbers above it need interpreting.
 *
 * The thread scrolls inside its own panel, never the page: the figures the
 * answer talks about stay on screen while the answer arrives. Only this
 * container's scrollTop moves — the reader's viewport is theirs.
 *
 * Which thread is open lives in the URL (`?c=`), owned by nobody and read by
 * everybody: the sidebar rail highlights it, this panel renders it, and a
 * reload or a shared link lands on the same conversation. The thread *list*
 * lives in `WorkspaceProvider` for the same reason the lens list does — the
 * rail shows it and this panel appends to it, and two copies would disagree.
 * Below `lg` there is no rail, so a compact picker appears here instead.
 *
 * Everything here is written for the case where no model is configured, because
 * that is the state of a fresh clone and of every contributor who has not set up
 * a key. The band renders, disabled, with its reason. It never disappears (which
 * would make the feature look absent) and never errors (which would make an
 * optional integration look like a bug).
 */
export function WorkstationChat({
    workstationId,
    period,
}: {
    workstationId: string;
    period: Period;
}) {
    const { conversationsFor, loadConversations, addConversation, touchConversation } =
        useWorkspace();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const conversationId = searchParams.get("c");

    const [status, setStatus] = useState<Status | null>(null);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [question, setQuestion] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        let stale = false;
        fetch(`${API_URL}/api/workstations/chat/status`)
            .then((r) => r.json())
            .then((s: Status) => !stale && setStatus(s))
            .catch(() => !stale && setStatus({ available: false, model: "" }));
        return () => {
            stale = true;
        };
    }, []);

    useEffect(() => loadConversations(workstationId), [workstationId, loadConversations]);
    const conversations = conversationsFor(workstationId);

    // Which thread the `turns` on screen belong to. A ref, not state: it exists
    // to stop the URL-sync effect from re-fetching the transcript this panel
    // just wrote — mid-stream, that re-fetch would erase the answer as it
    // arrives (the assistant turn is only stored once complete).
    const shownConversation = useRef<string | null>(null);

    useEffect(() => {
        if (conversationId === shownConversation.current) return;
        shownConversation.current = conversationId;
        setError(null);
        if (conversationId === null) {
            setTurns([]);
            return;
        }
        let stale = false;
        conversationsApi
            .get(conversationId)
            .then((thread) => {
                if (stale) return;
                setTurns(thread.messages.map((m) => ({ role: m.role, content: m.content })));
            })
            .catch((e) => {
                if (stale) return;
                setTurns([]);
                setError((e as Error).message);
            });
        return () => {
            stale = true;
        };
    }, [conversationId]);

    // Scroll the *panel*, not the page. scrollIntoView on a page-level node is
    // what used to drag the stats out of sight with every answer.
    const threadRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [turns]);

    const openThread = useCallback(
        (id: string | null) => {
            router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });
        },
        [router, pathname]
    );

    const ask = useCallback(async () => {
        const text = question.trim();
        if (!text || streaming) return;

        setQuestion("");
        setError(null);
        setTurns((cur) => [
            ...cur,
            { role: "user", content: text },
            { role: "assistant", content: "" },
        ]);
        setStreaming(true);

        try {
            const resp = await fetch(`${API_URL}/api/workstations/${workstationId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // History is not sent: the server owns the transcript and
                // replays it from storage. The client only names the thread.
                body: JSON.stringify({
                    question: text,
                    conversation_id: conversationId,
                    ...period,
                }),
            });
            if (!resp.ok || !resp.body) {
                throw new Error((await resp.json().catch(() => null))?.error ?? "Falló la consulta");
            }

            // Frames can split across chunks, so the tail is held back until a
            // blank line proves it complete. Parsing per-chunk would drop the
            // first half of every message that straddles a boundary.
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let threadId = conversationId;

            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const frames = buffer.split("\n\n");
                buffer = frames.pop() ?? "";

                for (const frame of frames) {
                    const line = frame.trim();
                    if (!line.startsWith("data:")) continue;
                    const payload = JSON.parse(line.slice(5).trim()) as {
                        delta?: string;
                        error?: string;
                        done?: boolean;
                        conversation?: Conversation;
                    };
                    if (payload.conversation) {
                        // First question of a fresh thread: the server just
                        // opened it. Mark it as the one on screen *before*
                        // putting it in the URL, so the sync effect above
                        // does not refetch a transcript that is still being
                        // streamed into.
                        threadId = payload.conversation.id;
                        shownConversation.current = threadId;
                        addConversation(payload.conversation);
                        openThread(threadId);
                    }
                    if (payload.error) setError(payload.error);
                    if (payload.delta) {
                        setTurns((cur) => {
                            const next = [...cur];
                            const last = next[next.length - 1];
                            next[next.length - 1] = {
                                ...last,
                                content: last.content + payload.delta,
                            };
                            return next;
                        });
                    }
                }
            }
            // The thread just got new messages: it is the most recent now, and
            // the rail's order should say so.
            if (threadId) touchConversation(workstationId, threadId);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setStreaming(false);
        }
    }, [
        question,
        streaming,
        workstationId,
        period,
        conversationId,
        addConversation,
        touchConversation,
        openThread,
    ]);

    if (status === null) return null;

    return (
        <section className="border-t border-mist pt-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3 className="text-body font-medium text-ink">Pregunta sobre este conjunto</h3>

                {/* Below `lg` the sidebar rail — where threads normally live —
                    does not exist, so the picker appears here. `null` is the
                    placeholder row: "new conversation" is the not-yet-chosen
                    state, not a mode. */}
                {status.available && conversations !== null && conversations.length > 0 && (
                    <span className="lg:hidden">
                        <Select<string>
                            variant="quiet"
                            aria-label="Conversaciones"
                            value={conversationId}
                            placeholder="Nueva conversación"
                            options={conversations.map((c) => ({ value: c.id, label: c.title }))}
                            onChange={openThread}
                        />
                    </span>
                )}
            </div>

            {!status.available ? (
                <p className="mt-1.5 text-body-sm text-graphite">
                    No hay un modelo configurado. Define{" "}
                    <code className="text-ink">LLM_BASE_URL</code>,{" "}
                    <code className="text-ink">LLM_API_KEY</code> y{" "}
                    <code className="text-ink">LLM_MODEL</code> en el backend para activarlo.
                    El resto de esta lectura funciona sin eso.
                </p>
            ) : (
                <>
                    {/* The disclosure. Shown before the first question, not after
                        — the user is entitled to know their movements are about
                        to leave the server, and which third party gets them,
                        while they can still decide not to ask. */}
                    {!acknowledged && turns.length === 0 && conversations?.length === 0 && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-card border border-mist bg-fog px-4 py-3">
                            <Info size={15} aria-hidden className="mt-0.5 shrink-0 text-graphite" />
                            <div className="min-w-0 text-body-sm text-graphite">
                                <p>
                                    Para responder, los movimientos de este conjunto y sus totales
                                    se envían a <span className="text-ink">{status.model}</span>.
                                    El resto de tu información no sale.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setAcknowledged(true)}
                                    className="mt-1.5 text-ink underline underline-offset-4"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    )}

                    {turns.length > 0 && (
                        <div
                            ref={threadRef}
                            className={cn(
                                "mt-4 max-h-[26rem] space-y-4 overflow-y-auto overscroll-contain",
                                "rounded-card border border-mist bg-canvas px-4 py-4"
                            )}
                        >
                            {turns.map((turn, i) =>
                                turn.role === "user" ? (
                                    <p
                                        key={i}
                                        className="whitespace-pre-wrap text-body font-medium text-graphite"
                                    >
                                        — {turn.content}
                                    </p>
                                ) : (
                                    <div key={i} className="space-y-2 text-body text-ink">
                                        <ChatMarkdown text={turn.content} />
                                        {/* A caret while the answer arrives, so
                                            a slow first token reads as thinking
                                            rather than as nothing happening. */}
                                        {streaming && i === turns.length - 1 && (
                                            <span className="ml-0.5 animate-pulse text-signal">
                                                ▍
                                            </span>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {error && <p className="mt-3 text-body-sm text-negative">{error}</p>}

                    <div className="mt-4 flex items-center gap-2">
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && ask()}
                            disabled={streaming}
                            placeholder={
                                turns.length > 0
                                    ? "Sigue preguntando"
                                    : "¿Me conviene recargar $200 al mes?"
                            }
                            className={cn(
                                "h-10 min-w-0 flex-1 rounded-control border border-mist bg-paper px-3.5",
                                "text-body text-ink outline-none placeholder:text-ash focus:border-ink",
                                "disabled:opacity-60"
                            )}
                        />
                        <button
                            type="button"
                            onClick={ask}
                            disabled={streaming || !question.trim()}
                            aria-label="Preguntar"
                            className={cn(
                                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
                                "bg-soot text-paper transition-opacity duration-100",
                                "disabled:opacity-30"
                            )}
                        >
                            <ArrowUp size={16} aria-hidden />
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
