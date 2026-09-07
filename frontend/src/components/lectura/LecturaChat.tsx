"use client";

import { ChatOffNotice } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Info, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib/api";
import type { Period } from "@/lib/metrics";
import { conversationsApi, type Conversation } from "@/lib/workstations";
import { ChatMarkdown } from "@/components/workspace/ChatMarkdown";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

type Turn = { role: "user" | "assistant"; content: string };
type Status = { available: boolean; model: string };

/**
 * Ask about this set, as a column: titled threads, the open transcript, then
 * the composer. Clicking a title is how you remember; Nueva conversación
 * clears the pane without leaving the set.
 */
export function LecturaChat({
    workstationId,
    period,
}: {
    workstationId: string;
    period: Period;
}) {
    const {
        conversationsFor,
        loadConversations,
        addConversation,
        touchConversation,
        removeConversation,
        renameConversation,
    } = useWorkspace();

    const [conversationId, setConversationId] = useState<string | null>(null);
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

    const shownConversation = useRef<string | null>(null);

    useEffect(() => {
        shownConversation.current = null;
        setConversationId(null);
        setTurns([]);
        setError(null);
        setAcknowledged(false);
    }, [workstationId]);

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

    const threadRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [turns]);

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
                body: JSON.stringify({
                    question: text,
                    conversation_id: conversationId,
                    ...period,
                }),
            });
            if (!resp.ok || !resp.body) {
                throw new Error((await resp.json().catch(() => null))?.error ?? "Falló la consulta");
            }

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
                        title?: string;
                        conversation_id?: string;
                        conversation?: Conversation;
                    };
                    if (payload.conversation) {
                        threadId = payload.conversation.id;
                        shownConversation.current = threadId;
                        addConversation(payload.conversation);
                        setConversationId(threadId);
                    }
                    if (payload.title && (payload.conversation_id || threadId)) {
                        renameConversation(
                            workstationId,
                            payload.conversation_id ?? threadId!,
                            payload.title
                        );
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
        renameConversation,
    ]);

    if (status === null) return null;

    const threads = conversations ?? [];

    return (
        <section className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-body font-medium text-ink">Conversaciones</h3>
                {conversationId && (
                    <button
                        type="button"
                        onClick={() => setConversationId(null)}
                        className="inline-flex items-center gap-1 text-label text-graphite hover:text-ink"
                    >
                        <Plus size={12} aria-hidden />
                        Nueva
                    </button>
                )}
            </div>

            {threads.length > 0 && (
                <ul className="mt-2 space-y-px">
                    {threads.map((c) => {
                        const current = c.id === conversationId;
                        return (
                            <li key={c.id} className="group relative">
                                <button
                                    type="button"
                                    title={c.title}
                                    aria-current={current ? "true" : undefined}
                                    onClick={() => setConversationId(c.id)}
                                    className={cn(
                                        "flex w-full items-center rounded-control py-1.5 pl-2 pr-7 text-left text-body-sm",
                                        "transition-colors duration-100",
                                        current
                                            ? "bg-fog font-medium text-ink"
                                            : "text-graphite hover:bg-fog hover:text-ink"
                                    )}
                                >
                                    <span className="min-w-0 truncate">{c.title}</span>
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Borrar conversación «${c.title}»`}
                                    onClick={async () => {
                                        if (await removeConversation(workstationId, c.id)) {
                                            if (current) setConversationId(null);
                                        }
                                    }}
                                    className={cn(
                                        "absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1",
                                        "text-ash opacity-0 transition-opacity duration-100",
                                        "hover:text-negative focus-visible:opacity-100",
                                        "group-hover:opacity-100"
                                    )}
                                >
                                    <Trash2 size={12} aria-hidden />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!status.available ? (
                <ChatOffNotice className="mt-3" />
            ) : (
                <>
                    {!acknowledged && turns.length === 0 && threads.length === 0 && (
                        <div className="mt-3 flex items-start gap-2 rounded-card border border-mist bg-fog px-3 py-2.5">
                            <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-graphite" />
                            <div className="min-w-0 text-body-sm text-graphite">
                                <p>
                                    Para responder, los movimientos de este conjunto se envían a{" "}
                                    <span className="text-ink">{status.model}</span>.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setAcknowledged(true)}
                                    className="mt-1 text-ink underline underline-offset-4"
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
                                "mt-3 max-h-[22rem] space-y-3 overflow-y-auto overscroll-contain",
                                "rounded-card border border-mist bg-canvas px-3 py-3"
                            )}
                        >
                            {turns.map((turn, i) =>
                                turn.role === "user" ? (
                                    <p
                                        key={i}
                                        className="whitespace-pre-wrap text-body-sm font-medium text-graphite"
                                    >
                                        — {turn.content}
                                    </p>
                                ) : (
                                    <div key={i} className="space-y-2 text-body-sm text-ink">
                                        <ChatMarkdown text={turn.content} />
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

                    {(acknowledged || threads.length > 0 || turns.length > 0) && (
                        <div className="mt-3 flex items-end gap-2">
                            <textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void ask();
                                    }
                                }}
                                disabled={streaming}
                                rows={2}
                                placeholder={
                                    turns.length > 0
                                        ? "Sigue preguntando"
                                        : "Preguntar sobre este conjunto…"
                                }
                                className={cn(
                                    "min-h-10 min-w-0 flex-1 resize-none rounded-control border border-mist bg-paper px-3 py-2",
                                    "text-body text-ink outline-none placeholder:text-ash focus:border-ink",
                                    "disabled:opacity-60"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => void ask()}
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
                    )}
                </>
            )}
        </section>
    );
}
