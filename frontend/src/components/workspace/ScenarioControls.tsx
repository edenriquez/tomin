"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { NumberField } from "@/components/ui";
import { mxn } from "@/lib/format";
import type { CohortProfile } from "@/lib/workstations";

/** Days per period. 30.4375 is the average month over a 4-year cycle. */
const CADENCE = {
    week: { label: "semana", days: 7 },
    fortnight: { label: "quincena", days: 15.21875 },
    month: { label: "mes", days: 30.4375 },
} as const;

export type Cadence = keyof typeof CADENCE;

export type Scenario = { amount: number; cadence: Cadence };

/**
 * "What if I did it this way instead?"
 *
 * Pure client arithmetic over the profile the server already computed. It is
 * instant and reversible, which is what makes it a thinking tool rather than a
 * form: the user drags the amount around and watches the delta move. Sending
 * each keystroke to the server would turn that into a wait.
 *
 * This is what answers the two questions the tiles cannot: "should I top up
 * $200 monthly instead of $15 several times a week", and "how much should I
 * withdraw each week".
 */
export function ScenarioControls({
    profile,
    scenario,
    onChange,
}: {
    profile: CohortProfile;
    scenario: Scenario | null;
    onChange: (next: Scenario | null) => void;
}) {
    const current = currentMonthly(profile);
    const proposed = scenario ? monthlyCost(scenario) : null;

    const delta = useMemo(() => {
        if (current === null || proposed === null) return null;
        return current - proposed;
    }, [current, proposed]);

    // Without a monthly baseline there is nothing to compare against, and a
    // scenario shown alone would look like a recommendation.
    if (current === null) return null;

    const active = scenario ?? { amount: Math.round(current), cadence: "month" as Cadence };

    return (
        <section className="border-t border-mist pt-5">
            <h3 className="text-body font-medium text-ink">¿Y si en vez de eso…?</h3>
            <p className="mt-0.5 text-body-sm text-graphite">
                Hoy te sale en {mxn(current)} al mes.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">Monto</span>
                    <NumberField
                        value={active.amount}
                        min={0}
                        // Well past any personal-finance habit; the field needs
                        // a bound and a low one would fight a real user.
                        max={1_000_000}
                        aria-label="Monto del escenario"
                        onChange={(amount) => onChange({ ...active, amount })}
                        className="w-32"
                    />
                </label>

                <div className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">Cada</span>
                    {/* Three options, one choice: a segmented control, not a
                        dropdown. A dropdown would hide two of the three answers
                        behind a click for no gain. */}
                    <div
                        role="radiogroup"
                        aria-label="Cada"
                        className="inline-flex rounded-control border border-mist bg-paper p-0.5"
                    >
                        {(Object.keys(CADENCE) as Cadence[]).map((key) => {
                            const selected = active.cadence === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onChange({ ...active, cadence: key })}
                                    className={cn(
                                        "rounded-control px-3 py-1 text-body-sm capitalize",
                                        "transition-colors duration-100",
                                        selected
                                            ? "bg-fog font-medium text-ink"
                                            : "text-graphite hover:text-ink"
                                    )}
                                >
                                    {CADENCE[key].label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {scenario && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="pb-1 text-body-sm text-graphite underline-offset-4 hover:text-ink hover:underline"
                    >
                        Quitar
                    </button>
                )}
            </div>

            {proposed !== null && delta !== null && (
                <p className="mt-4 text-body">
                    <span className="text-graphite">Serían </span>
                    <span className="tabular text-ink">{mxn(proposed)}</span>
                    <span className="text-graphite"> al mes — </span>
                    {/* The sign of a number is information in a ledger, not
                        decoration. This is the one place the single-accent rule
                        is deliberately broken. */}
                    <span
                        className={cn(
                            "tabular font-medium",
                            delta > 0 ? "text-positive" : delta < 0 ? "text-negative" : "text-graphite"
                        )}
                    >
                        {verdict(delta)}
                    </span>
                </p>
            )}
        </section>
    );
}

/** What the scenario costs per month. */
export function monthlyCost(scenario: Scenario): number {
    return (scenario.amount * CADENCE.month.days) / CADENCE[scenario.cadence].days;
}

/**
 * What the set costs per month today, or `null` when we cannot say.
 *
 * `null` rather than a guess: with under two months of history the backend
 * withholds `per_month`, and inventing a baseline here would let the comparison
 * claim a saving the data cannot support — precisely the number the whole
 * feature would be judged on.
 */
export function currentMonthly(profile: CohortProfile): number | null {
    if (profile.per_month === null || profile.mean === null) return null;
    return Number(profile.per_month) * Number(profile.mean);
}

function verdict(delta: number): string {
    if (delta === 0) return "lo mismo";
    const yearly = Math.abs(delta) * 12;
    const direction = delta > 0 ? "ahorras" : "gastas";
    return `${direction} ${mxn(Math.abs(delta))} al mes · ${mxn(yearly)} al año`;
}
