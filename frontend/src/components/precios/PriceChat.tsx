"use client";

import { ChatOffNotice } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib/api";
import { pricesApi } from "@/lib/prices";
import { track } from "@/lib/telemetry";
import { ChatMarkdown } from "@/components/workspace/ChatMarkdown";

export type Turn = { role: "user" | "assistant"; content: string };

/** A line of the user's ticket pinned to the question. */
export type Attachment = { key: string; label: string };
type Status = {
    available: boolean;
    model: string;
    /** The external price source, when one is configured. Empty otherwise. */
    reference: string;
};

const EXAMPLES = [
    "¿Dónde me sale más barata la leche?",
    "¿Qué producto se me encareció más?",
    "¿Cuánto pagué de más la última vez que fui al Oxxo?",
];

/* -------------------------------------------------------------------------- */
/* Whether a model is configured — asked once for the whole page               */
/* -------------------------------------------------------------------------- */

let cached: Status | null = null;
let inFlight: Promise<Status> | null = null;

/**
 * The chat's availability, fetched once per page load however many chats are
 * on screen. With a chat inside every ticket, a per-instance fetch would be one
 * request per open basket to answer a question whose answer is the same for all
 * of them.
 */
export function usePriceChatStatus(): Status | null {
    const [status, setStatus] = useState<Status | null>(cached);

    useEffect(() => {
        if (cached) return;
        const pending = (inFlight ??= pricesApi
            .chatStatus()
            .catch((): Status => ({ available: false, model: "", reference: "" })));
        let alive = true;
        pending.then((s) => {
            cached = s;
            if (alive) setStatus(s);
        });
        return () => {
            alive = false;
        };
    }, []);

    return status;
}

/* -------------------------------------------------------------------------- */
/* The band                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Ask about your own prices, in words.
 *
 * Next to the evidence, never instead of it. The rows beside it answer the
 * questions the product anticipated; this is for the ones it did not — "¿qué se
 * me encareció este mes?" is a real question and no column answers it.
 *
 * The band is honest about its reach in two ways, and both matter more than the
 * feature itself. It has **no internet**: it compares the tickets the user
 * photographed and nothing else, which the placeholder says out loud so nobody
 * asks it what milk costs at the Walmart down the street and believes the
 * answer. And it names the model, because the user is entitled to know which
 * third party their grocery list is about to be described to.
 *
 * **The transcript is owned by the caller.** That is what makes one chat per
 * ticket possible: each basket keeps its own thread, so collapsing a ticket and
 * opening it again finds the conversation where it was, and two tickets never
 * share a history. With `receiptId` the server scopes its brief to that basket
 * too — otherwise the answers would be separate but the questions would all be
 * about the same pantry.
 *
 * Unlike the Análisis chat, no thread is stored server-side: a price question
 * is a lookup, not an investigation, and these live exactly as long as the page.
 */
export function PriceChat({
    turns,
    onTurns,
    receiptId,
    attachments = [],
    onDetach,
    onAnswered,
    title = "Pregunta por tus precios",
    examples = EXAMPLES,
    placeholder = "¿Dónde me sale más barata la leche?",
    variant = "card",
}: {
    turns: Turn[];
    /** Always called with an updater: a streamed answer arrives token by token
     *  and a stale closure would drop everything typed before it. */
    onTurns: (update: (current: Turn[]) => Turn[]) => void;
    /** Scopes the answer to one ticket. Omit for the whole price book. */
    receiptId?: string;
    /** The products the question is *about*, stated by pointing rather than by
     *  wording. These, and only these, are looked up against the external
     *  reference — a question with none attached makes no outbound call. */
    attachments?: Attachment[];
    onDetach?: (key: string) => void;
    /** Called once an answer has fully arrived. The caller uses it to clear the
     *  chips: an attachment is the subject of *one* question, and the next one
     *  starts clean unless the user points at a line again. */
    onAnswered?: () => void;
    title?: string;
    examples?: string[];
    placeholder?: string;
    variant?: "card" | "bare";
}) {
    const chat = usePriceChatStatus();
    const [question, setQuestion] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // What the server says it is doing before it can say anything else. An
    // external price lookup costs a couple of seconds, and a panel that sits
    // blank for them reads as a hang rather than as work.
    const [status, setStatus] = useState<string | null>(null);

    // Scroll the *panel*, not the page: the prices the answer talks about have
    // to stay on screen while the answer arrives.
    const threadRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [turns]);

    async function ask(text: string) {
        const asked = text.trim();
        if (!asked || streaming) return;
        track("precios.ask", {
            scope: receiptId ? "ticket" : "all",
            attachments: attachments.length,
            turn: turns.length,
        });

        // The transcript as it stood *before* this question: what the server
        // needs to understand a follow-up, without the empty answer slot the
        // next line is about to add.
        const history = turns.filter((t) => t.content.trim().length > 0);

        setQuestion("");
        setError(null);
        setStatus(null);
        const about = attachments.length
            ? ` · sobre: ${attachments.map((a) => a.label).join(", ")}`
            : "";
        onTurns((cur) => [
            ...cur,
            { role: "user", content: asked + about },
            { role: "assistant", content: "" },
        ]);
        setStreaming(true);

        try {
            const resp = await fetch(`${API_URL}/api/prices/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: asked,
                    history,
                    ...(receiptId ? { receipt_id: receiptId } : {}),
                    product_keys: attachments.map((a) => a.key),
                }),
            });
            if (!resp.ok || !resp.body) {
                throw new Error(
                    (await resp.json().catch(() => null))?.error ?? "Falló la consulta"
                );
            }

            // Frames can split across chunks, so the tail is held back until a
            // blank line proves it complete. Parsing per-chunk would drop the
            // first half of every message that straddles a boundary.
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

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
                        status?: string;
                        error?: string;
                        done?: boolean;
                    };
                    if (payload.error) setError(payload.error);
                    if (payload.status) setStatus(payload.status);
                    if (payload.delta) {
                        // The first token retires the notice: it described the
                        // wait, and the wait is over.
                        setStatus(null);
                        onTurns((cur) => {
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
            onAnswered?.();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setStreaming(false);
            setStatus(null);
        }
    }

    const disabled = chat !== null && !chat.available;
    const Wrapper = variant === "card" ? "section" : "div";

    return (
        <Wrapper
            className={cn(
                variant === "card" &&
                    "rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6"
            )}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                    className={cn(
                        "font-normal text-ink",
                        variant === "card" ? "text-title-sm" : "text-body"
                    )}
                >
                    {title}
                </h2>
                {chat?.available && (
                    <span className="flex items-center gap-1.5 text-label text-ash">
                        <Info size={13} aria-hidden />
                        Tus tickets se le describen a {chat.model}
                        {/* Two parties receive something, so two are named. The
                            search terms leave for the reference source even
                            though the basket does not. */}
                        {chat.reference && ` · precios de referencia de ${chat.reference}`}
                    </span>
                )}
            </div>

            {disabled ? (
                <ChatOffNotice className="mt-2"> Todo lo demás de esta pantalla funciona sin él.</ChatOffNotice>
            ) : (
                <>
                    <p className="mt-1 text-body-sm text-graphite">
                        {receiptId
                            ? `Sabe lo que dice este ticket. Toca «Preguntar» en una línea para compararla con ${chat?.reference ?? "precios de referencia"}.`
                            : `Sabe lo que dicen tus tickets. Solo cuando preguntas por una línea, dentro de un ticket, la compara con ${chat?.reference ?? "precios de referencia"}; aquí responde con tus tickets nada más.`}
                    </p>

                    {turns.length > 0 && (
                        <div
                            ref={threadRef}
                            className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1"
                        >
                            {turns.map((turn, i) => (
                                <div key={i} className="text-body-sm">
                                    <p className="text-label text-ash">
                                        {turn.role === "user" ? "Tú" : "Tomin"}
                                    </p>
                                    <div className="mt-1 text-ink">
                                        {turn.role === "assistant" ? (
                                            <ChatMarkdown text={turn.content} />
                                        ) : (
                                            turn.content
                                        )}
                                        {turn.role === "assistant" &&
                                            streaming &&
                                            i === turns.length - 1 &&
                                            turn.content.length === 0 && (
                                                <span className="animate-pulse text-ash">
                                                    {status ?? "Pensando…"}
                                                </span>
                                            )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <p className="mt-3 text-body-sm text-negative">{error}</p>}

                    {turns.length === 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {examples.map((example) => (
                                <li key={example}>
                                    <button
                                        type="button"
                                        className="rounded-input border border-mist px-3 py-1.5 text-body-sm text-graphite hover:bg-fog"
                                        onClick={() => ask(example)}
                                    >
                                        {example}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {attachments.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Productos en la pregunta">
                            {attachments.map((a) => (
                                <li
                                    key={a.key}
                                    className="flex items-center gap-1 rounded-control bg-fog px-2 py-1 text-label text-ink"
                                >
                                    {a.label}
                                    {onDetach && (
                                        <button
                                            type="button"
                                            aria-label={`Quitar ${a.label}`}
                                            onClick={() => onDetach(a.key)}
                                            className="text-ash hover:text-ink"
                                        >
                                            <X size={12} aria-hidden />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <form
                        className="mt-3 flex items-center gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            ask(question);
                        }}
                    >
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={placeholder}
                            aria-label={title}
                            className="min-w-0 flex-1 rounded-input border border-muted bg-canvas px-3 py-2 text-body-sm text-ink placeholder:text-ash focus:border-edge focus:outline-none"
                        />
                        <button
                            type="submit"
                            aria-label="Preguntar"
                            disabled={streaming || question.trim().length === 0}
                            className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-input bg-signal text-ink",
                                (streaming || question.trim().length === 0) && "opacity-40"
                            )}
                        >
                            <ArrowUp size={16} aria-hidden />
                        </button>
                    </form>
                </>
            )}
        </Wrapper>
    );
}
