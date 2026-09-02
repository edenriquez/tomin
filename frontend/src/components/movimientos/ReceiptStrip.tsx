"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { mxn2 } from "@/lib/format";
import { receiptsApi, type Receipt } from "@/lib/prices";

/**
 * The basket behind a charge, when there is one.
 *
 * A statement line is one number for a whole trip to the supermarket. If the
 * user photographed the ticket on their phone, this is where the other half
 * shows up: what was actually in the bag, at what price each.
 *
 * Renders **nothing** when the movement has no ticket, which is almost every
 * movement. An empty "no hay ticket" block under every row would be noise on
 * the 99% to serve the 1%, and the capture flow lives on the phone anyway —
 * there is nothing to offer here that a user could act on.
 *
 * When the lines do not add up to the printed total, it says so. OCR drops
 * lines, and a basket that is quietly short is worse than a visible gap: the
 * first invites you to trust a total you should not.
 */
export function ReceiptStrip({ transactionId }: { transactionId: string }) {
    const [receipt, setReceipt] = useState<Receipt | null>(null);

    useEffect(() => {
        let stale = false;
        setReceipt(null);
        receiptsApi
            .forTransaction(transactionId)
            .then((res) => !stale && setReceipt(res.receipt))
            // A movement with no ticket is the ordinary case, and a backend
            // that is briefly unreachable should not put an error under a row
            // the user was editing for another reason.
            .catch(() => undefined);
        return () => {
            stale = true;
        };
    }, [transactionId]);

    if (!receipt || receipt.items.length === 0) return null;

    const short =
        receipt.total !== null && Math.abs(receipt.items_total - receipt.total) > 0.5;

    return (
        <div className="rounded-card border border-mist bg-canvas px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 text-body-sm text-ink">
                    <ReceiptText size={14} aria-hidden className="text-ash" />
                    {receipt.store ?? "Ticket"}
                    <span className="text-ash">
                        · {receipt.items.length} partida
                        {receipt.items.length === 1 ? "" : "s"}
                    </span>
                </span>
                <Link href="/precios" className="text-label text-graphite hover:text-ink">
                    Comparar precios
                </Link>
            </div>

            <ul className="mt-2 space-y-1">
                {receipt.items.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-4 text-body-sm"
                        // The OCR line behind the interpretation, one hover away.
                        title={item.raw_text}
                    >
                        <span className="min-w-0 truncate text-graphite">
                            {item.description}
                            {item.quantity !== null && (
                                <span className="text-ash"> ×{item.quantity}</span>
                            )}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">
                            {mxn2(item.amount)}
                            {item.each !== null && item.quantity !== null && (
                                <span className="ml-2 text-label text-ash">
                                    {mxn2(item.each)} c/u
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>

            {short && receipt.total !== null && (
                <p className="mt-2 text-label text-ash">
                    Las partidas suman {mxn2(receipt.items_total)} y el ticket dice{" "}
                    {mxn2(receipt.total)}: alguna línea no se leyó.
                </p>
            )}
        </div>
    );
}
