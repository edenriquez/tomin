"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Landmark } from "lucide-react";
import { cn } from "@/lib/cn";
import {
    accountIsOn,
    bankIsOn,
    toggleAccount,
    toggleBank,
    type BankScope,
} from "@/lib/banks";
import { track } from "@/lib/telemetry";

/**
 * The global bank scope, in the shell — it travels with the user across every
 * tab, because "which accounts am I looking at" is a property of the session,
 * not of one view. A pill that names its state ("Todos", "Nu", "2 cuentas")
 * opening a checklist; empty selection = todas, so there is no way to filter
 * yourself into a blank app.
 *
 * A bank the user has labelled more than one way — Banamex crédito and
 * Banamex débito — opens into its accounts, so the scope can be one card
 * inside one bank. A bank with a single account stays a single row: the
 * sublist would be furniture.
 */
export function BankFilter({ scope }: { scope: BankScope }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // One account in total is not a choice; the control would be furniture.
    const choices = scope.nodes.reduce((n, node) => n + Math.max(node.accounts.length, 1), 0);
    if (choices < 2) return null;

    const whole = scope.selected.every((key) => scope.nodes.some((n) => n.bank === key));
    const label =
        scope.labels.length === 0
            ? "Todos los bancos"
            : scope.labels.length === 1
              ? scope.labels[0]
              : `${scope.labels.length} ${whole ? "bancos" : "cuentas"}`;

    // Every bank still reading as one undivided account: the label is missing,
    // not the account.
    const unlabelled = scope.nodes.every(
        (n) => n.accounts.length === 1 && n.accounts[0].kind === null
    );

    function commit(next: string[]) {
        track("bank.select", { count: next.length });
        scope.setSelected(next);
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    // The same capsule as the period control beside it: a hairline
                    // on Fog, and the chosen state raised on Paper. Two filters
                    // that look like one family read as one rail.
                    "inline-flex h-9 items-center gap-2 rounded-control border border-mist bg-fog p-1 pl-3 pr-2",
                    "text-body-sm transition-colors duration-100",
                    scope.selected.length ? "text-ink" : "text-graphite hover:text-ink"
                )}
            >
                <Landmark size={14} aria-hidden className="text-ash" />
                <span
                    className={cn(
                        "max-w-40 truncate rounded-control px-2 py-0.5",
                        scope.selected.length && "bg-paper font-medium shadow-card"
                    )}
                >
                    {label}
                </span>
                <ChevronDown
                    size={13}
                    aria-hidden
                    className={cn("transition-transform duration-100", open && "rotate-180")}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label="Bancos"
                    aria-multiselectable
                    className={cn(
                        "absolute right-0 z-modal mt-2 min-w-48 overflow-hidden",
                        "animate-reveal rounded-card border border-mist bg-paper py-1 shadow-card"
                    )}
                >
                    <li
                        role="option"
                        aria-selected={scope.selected.length === 0}
                        onClick={() => {
                            commit([]);
                        }}
                        className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2",
                            "text-body-sm",
                            scope.selected.length === 0 ? "text-ink" : "text-graphite hover:bg-fog"
                        )}
                    >
                        Todos
                        {scope.selected.length === 0 && (
                            <Check size={14} aria-hidden className="text-signal" />
                        )}
                    </li>
                    {scope.nodes.map((node) => {
                        const on = bankIsOn(scope.selected, node);
                        // A bank the user never split has nothing to open:
                        // its one account *is* the bank.
                        const split = node.accounts.length > 1;
                        return (
                            <Fragment key={node.bank}>
                                <Row
                                    label={node.bank}
                                    on={on}
                                    onSelect={() => commit(toggleBank(scope.selected, node))}
                                />
                                {split &&
                                    node.accounts.map((account) => (
                                        <Row
                                            key={account.key}
                                            label={account.label}
                                            nested
                                            on={accountIsOn(scope.selected, node, account)}
                                            onSelect={() =>
                                                commit(
                                                    toggleAccount(scope.selected, node, account)
                                                )
                                            }
                                        />
                                    ))}
                            </Fragment>
                        );
                    })}
                    {unlabelled && (
                        // The split is only as good as the labels: a bank whose
                        // statements are all unlabelled has one account, and the
                        // user has no way to guess why it will not open.
                        <li className="border-t border-mist px-3.5 pb-1 pt-2 text-label text-ash">
                            Para separar crédito y débito, etiqueta cada estado de
                            cuenta en{" "}
                            <Link
                                href="/documentos"
                                onClick={() => setOpen(false)}
                                className="underline decoration-mist underline-offset-2 hover:text-graphite"
                            >
                                Documentos
                            </Link>
                            .
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}

/** One line of the checklist. Nested lines are the accounts of the bank above
 *  them: indented, quieter, and checked on their own. */
function Row({
    label,
    on,
    nested,
    onSelect,
}: {
    label: string;
    on: boolean;
    nested?: boolean;
    onSelect: () => void;
}) {
    return (
        <li
            role="option"
            aria-selected={on}
            onClick={onSelect}
            className={cn(
                "flex cursor-pointer items-center justify-between gap-3",
                "py-2 pr-3.5 text-body-sm hover:bg-fog",
                nested ? "pl-7 text-body-sm" : "pl-3.5",
                on ? "text-ink" : "text-graphite"
            )}
        >
            <span className="truncate">{label}</span>
            {on && <Check size={14} aria-hidden className="shrink-0 text-signal" />}
        </li>
    );
}
