# Advisor Principles — the corpus

Curated financial truths that become product features. This is the seed corpus
for the Financial Advisor pillar (see `docs/redesign-plan.md` §3, "Financial
Advisor").

## The rule for this file

A principle only enters the corpus when it declares **all four**:

1. **La frase** — the human wording, as it will appear in the product.
2. **Why it's true** — the mechanism, one paragraph, no mysticism.
3. **The trigger** — the computable condition on the user's own data that makes
   the advice *timely*, not just true. If we can't compute when to say it, it's
   a poster, not a product.
4. **The product hook** — what the user can do about it in one tap.

The advisor never shows an unexplained score and never fires on vibes: every
surfaced advice carries the user's actual numbers in the reason. Precision over
recall — one wrong "urgent" and the feature is muted forever (same rule as
anomaly detection).

---

## P1 — El arbol nunca llega al cielo

**La frase:** «Si te va muy bien, ahorra… urgentemente; un arbol nunca llega
al cielo.»

**Why it's true.** Outlier income months feel like a new baseline but almost
never are — bonuses, aguinaldo, a good freelance run, a market spike. Spending
adjusts upward within weeks (lifestyle inflation is fast); income reverts to
trend (mean reversion is faster). The asymmetry is the whole point: money saved
in a peak month is cheap — it displaces no habitual spending — while money
saved in a normal month is expensive. So the *urgency* of saving is highest
exactly when things feel best, which is when people feel it least. The proverb
is Kostolany's market rule; the household version is the same shape.

**The trigger** (v1, explainable):

- Requires ≥ 4 months of history (`months:4`).
- `baseline` = trailing 6-month mean of monthly income (excluding the current
  month, excluding transfers — `is_transfer` already filters).
- Fires when `latest_month_income ≥ 1.30 × baseline` **and** the absolute
  excess is material (≥ MXN 3,000 — a 30% jump on a tiny base is noise).
- The surfaced reason uses the user's numbers: «Este mes ingresaste $X, 42%
  arriba de tu promedio de $Y. Los meses asi no se repiten: aparta la
  diferencia ($Z) antes de que el gasto se acomode.»
- The suggested amount is the **excess over baseline**, not a generic
  percentage — that's the "cheap money" the mechanism identifies.
- Anti-trigger: if the latest month's *expenses* also rose ≥ 20% vs their
  baseline, sharpen the copy (lifestyle inflation is already happening) rather
  than congratulate.

**The product hook (v1):** the advice card shows the excess amount; "Etiquetar
como ahorro" deep-links to /movimientos pre-filtered to the month, so the user
can tag the set-aside (tags exist since B6). Later (B8): one tap to record it
as a balance contribution on an investment account, feeding
`investment_projection`.

**Dormant state:** when the trigger is off, the principle renders quietly as a
"principio" card (the phrase + one line of mechanism), never with urgency
styling. True always; urgent only when the data says so.

---

## Backlog (phrases captured, triggers not yet designed)

Add candidates here with at least a trigger sketch before promoting them to
numbered principles.

*(empty)*
