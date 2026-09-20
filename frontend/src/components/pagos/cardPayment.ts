/**
 * The card payment Pagos puts first, from the statements the user has.
 *
 * Three states, and the row says which one it is in:
 * - **none**: no statement is labelled as a card, so there is nothing to
 *   read. The row points at Documentos, where the label is given.
 * - **pending**: a card statement exists but its text did not carry the
 *   figures (an old upload, or a layout the reader does not know yet). The
 *   row says so rather than showing a dash that could be read as "nothing
 *   due".
 * - **read**: the newest card statement printed a payment and, usually, a
 *   due date. That is the line the calendar draws.
 *
 * "Newest" is by period end, which is what a card statement is about; the
 * upload time is only the fallback for a statement whose period the parser
 * could not read.
 */

import type { Statement } from "@/lib/api";
import { fromIso } from "@/lib/porMes";
import { isoOf, type CardPayment } from "./dueMonth";

export type CardState =
    | { kind: "none" }
    | { kind: "pending"; bank: string; periodEnd: string | null }
    | {
          kind: "read";
          bank: string;
          periodEnd: string | null;
          amount: number;
          minimum: number | null;
          due: Date | null;
          payment: CardPayment | null;
      };

export function cardStateFrom(statements: Statement[] | null): CardState {
    if (!statements) return { kind: "none" };
    const cards = statements.filter(
        (s) => s.account_kind === "credit" || (s.credit_no_interest_payment ?? null) !== null
    );
    if (cards.length === 0) return { kind: "none" };

    const newest = [...cards].sort((a, b) => stamp(b).localeCompare(stamp(a)))[0]!;
    const bank = newest.bank ?? "Tarjeta";
    const amount = newest.credit_no_interest_payment ?? null;
    if (amount === null) {
        return { kind: "pending", bank, periodEnd: newest.period_end ?? null };
    }

    const due = newest.credit_due_date ? fromIso(newest.credit_due_date) : null;
    return {
        kind: "read",
        bank,
        periodEnd: newest.period_end ?? null,
        amount,
        minimum: newest.credit_minimum_payment ?? null,
        due,
        payment: due
            ? {
                  key: `card:${newest.id}`,
                  label: `${bank} · pago de tarjeta`,
                  amount,
                  date: due,
                  iso: isoOf(due),
              }
            : null,
    };
}

function stamp(s: Statement): string {
    return s.period_end ?? s.uploaded_at?.slice(0, 10) ?? "";
}

/** The day the newest statement on record ends: how far the reading sees. */
export function latestStatementEnd(statements: Statement[] | null): string | null {
    if (!statements?.length) return null;
    const ends = statements.map((s) => s.period_end).filter((d): d is string => !!d);
    if (ends.length === 0) return null;
    return ends.sort().at(-1) ?? null;
}
