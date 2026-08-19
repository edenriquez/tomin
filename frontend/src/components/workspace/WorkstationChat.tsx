"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib/api";
import type { Period } from "@/lib/metrics";

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

    // A new lens is a new conversation. Carrying turns across would let an
    // answer about top-ups sit under a heading about withdrawals.
    useEffect(() => {
        setTurns([]);
        setError(null);
    }, [workstationId]);

    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: "nearest" });
    }, [turns]);

    const ask = useCallback(async () => {
        const text = question.trim();
        if (!text || streaming) return;

        const history = turns;
        setQuestion("");
        setError(null);
        setTurns([...history, { role: "user", content: text }, { role: "assistant", content: "" }]);
        setStreaming(true);

        try {
            const resp = await fetch(`${API_URL}/api/workstations/${workstationId}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: text, history, ...period }),
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
                    };
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
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setStreaming(false);
        }
    }, [question, streaming, turns, workstationId, period]);

    if (status === null) return null;

    return (
        <section className="border-t border-mist pt-5">
            <h3 className="text-body font-medium text-ink">Pregunta sobre este conjunto</h3>

            {!status.available ? (
                <p className="mt-1.5 text-body-sm text-graphite">
                    No hay un modelo configurado. Define{" "}
                    <code className="text-ink">LLM_BASE_URL</code>,{" "}
                    <code className="text-ink">LLM_API_KEY</code> y{" "}
                    <code className="text-ink">LLM_MODEL</code> en el backend para activarlo.
                    El resto de este análisis funciona sin eso.
                </p>
            ) : (
                <>
                    {/* The disclosure. Shown before the first question, not after
                        — the user is entitled to know their movements are about
                        to leave the server, and which third party gets them,
                        while they can still decide not to ask. */}
                    {!acknowledged && turns.length === 0 && (
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
                        <div className="mt-4 space-y-4">
                            {turns.map((turn, i) => (
                                <div key={i} className={cn(turn.role === "user" && "text-graphite")}>
                                    <p className="whitespace-pre-wrap text-body text-inherit">
                                        {turn.role === "user" ? `— ${turn.content}` : turn.content}
                                        {/* A caret while the answer arrives, so
                                            a slow first token reads as thinking
                                            rather than as nothing happening. */}
                                        {streaming && i === turns.length - 1 && (
                                            <span className="ml-0.5 animate-pulse text-signal">▍</span>
                                        )}
                                    </p>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {error && <p className="mt-3 text-body-sm text-negative">{error}</p>}

                    <div className="mt-4 flex items-center gap-2">
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && ask()}
                            disabled={streaming}
                            placeholder="¿Me conviene recargar $200 al mes?"
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
