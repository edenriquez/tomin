"""Answering a question about one saved lens.

Two halves, and the first is the one that matters. **The brief** is built from
the same metrics the panel above renders, so the model and the screen cannot
disagree -- if the chat says "gastas $331 al mes" the tile says $331 too, because
both read one `cohort_profile` call. Re-deriving the numbers for the prompt
would create a second arithmetic nobody is checking.

**The system prompt** carries this product's posture into a component that has
none of its own. Everything else in Tomin can say "no lo sé" -- the advisor
returns a dormant principle, the metric layer withholds a rate it cannot state.
A language model will not do that unless told, repeatedly and specifically, and
one confident invented peso figure would cost more trust than the feature buys.
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from datetime import date
from typing import Any
from uuid import UUID

from ...application.dtos.metrics import MetricQuery, Period, ResolverContext
from ...domain.entities import Workstation
from ...domain.metrics.catalog import COHORT_ACTIVITY, COHORT_PROFILE
from ..ports.outbound.chat import ChatMessage, ChatPort

#: The ledger rows that travel with the brief. The cohort is user-chosen and
#: small; without the rows, "which days do I top up most?" has no answer at all.
#: The cap is what keeps a pathological rule from turning one question into a
#: very large request.
MAX_ROWS = 300

SYSTEM = """\
Eres el analista de Tomin, una app de finanzas personales mexicana.

Respondes preguntas sobre UN conjunto de movimientos que el usuario definió con
una regla. Todo lo que sabes está en el resumen que te dan abajo.

Reglas, en orden de importancia:

1. NUNCA inventes una cifra. Cada número que escribas debe estar en el resumen o
   ser una operación aritmética simple sobre esos números, y si haces la
   operación, dila.
2. Si el resumen no alcanza para responder, dilo claramente: «con estos
   movimientos no puedo saberlo». Es una respuesta correcta y preferible a una
   estimación. Vale más ser preciso que completo.
3. Cuando el resumen diga que una frecuencia o un ritmo no está disponible, es
   porque no hay suficiente historia. No la estimes tú.
4. No afirmes una tendencia con menos de dos meses de datos.
5. Habla en español de México, en segunda persona, directo y sin adornos. Sin
   emojis. Sin listas largas cuando basta un párrafo.
6. Los montos van en pesos con el formato que ya traen. No los reformatees.
7. Si el usuario pregunta algo fuera de este conjunto de movimientos (otras
   categorías, su patrimonio, consejos generales de inversión), dile que esta
   ventana solo ve este conjunto.
8. Formato: Markdown ligero solamente — **negritas** para la cifra que
   responde, listas con guiones cuando enumeres movimientos. NUNCA uses LaTeX
   ni notación matemática (nada de \\[, \\frac, \\approx): la pantalla no lo
   dibuja. Una operación se escribe en línea y en texto plano, por ejemplo:
   11 476,56 ÷ 8,71 ≈ 1 317,60.

No repitas el resumen de vuelta. Responde la pregunta."""


class AnswerWorkstationQuestion:
    """Streams an answer about one lens, grounded in that lens's own numbers."""

    def __init__(self, chat: ChatPort, engine, profile_resolver, transactions) -> None:
        self._chat = chat
        self._engine = engine
        # The resolver, not the engine, because `cohort_profile` is a computed
        # metric: the rhythm has no SQL and the engine would refuse it. Reading
        # it through the same object the query endpoint uses is the guarantee
        # that the brief and the panel cannot report different numbers.
        self._profile_resolver = profile_resolver
        self._transactions = transactions

    @property
    def available(self) -> bool:
        return self._chat.available

    @property
    def model_label(self) -> str:
        return self._chat.model_label

    def stream(
        self,
        *,
        user_id: UUID,
        workstation: Workstation,
        period: Period,
        question: str,
        history: Sequence[ChatMessage] = (),
    ) -> Iterator[str]:
        brief = self.build_brief(user_id=user_id, workstation=workstation, period=period)
        # The brief rides on the user turn rather than in the system prompt, so
        # the system half stays byte-identical between questions and a gateway
        # that caches prefixes can.
        messages = [
            *history,
            ChatMessage(role="user", content=f"{brief}\n\nPregunta: {question.strip()}"),
        ]
        return self._chat.stream(system=SYSTEM, messages=messages)

    # --- the brief -------------------------------------------------------
    def build_brief(
        self, *, user_id: UUID, workstation: Workstation, period: Period
    ) -> str:
        """Everything the model is allowed to know, as plain text.

        Public because it is the thing worth testing: a brief that omits a
        number the panel shows is how the chat and the screen start disagreeing.
        """
        filters = workstation.to_filters()

        profile = self._one_row(
            self._profile_resolver.resolve(
                user_id,
                MetricQuery(
                    key="brief",
                    metric=COHORT_PROFILE.id,
                    filters=filters,
                    period=period,
                ),
                ResolverContext(spec=COHORT_PROFILE),
            )
        )
        activity = self._engine.execute(
            user_id,
            COHORT_ACTIVITY,
            MetricQuery(
                key="brief",
                metric=COHORT_ACTIVITY.id,
                filters=filters,
                grain="month",
                period=period,
            ),
        )
        rows = self._rows(user_id, workstation, period)

        return "\n".join(
            [
                f"CONJUNTO: {workstation.name}",
                f"REGLA: {_rule_prose(workstation)}",
                f"PERIODO: {period.start or 'inicio'} a {period.end or 'hoy'}",
                "",
                "RESUMEN:",
                *_summary_lines(profile),
                "",
                "POR MES (mes, gasto, movimientos):",
                *[
                    f"  {r.get('month')}  {r.get('expense_amount')}  {r.get('tx_count')}"
                    for r in activity.rows
                ],
                "",
                "POR DIA DE LA SEMANA (movimientos):",
                *_weekday_lines(rows),
                "",
                f"MOVIMIENTOS ({len(rows)}{' — truncado' if len(rows) == MAX_ROWS else ''}):",
                *[f"  {r[0]}  {r[1]}  {r[2]}" for r in rows],
            ]
        )

    def _rows(
        self, user_id: UUID, workstation: Workstation, period: Period
    ) -> list[tuple[str, str, str]]:
        """The cohort's movements as (date, description, amount).

        Read through the transaction repository and filtered here rather than
        through the cube: the cube holds facts for aggregation, and this needs
        the text the user reads.
        """
        page = self._transactions.list_for_user(
            user_id,
            start=_as_date(period.start),
            end=_as_date(period.end),
            limit=10000,
            offset=0,
        )
        rule = workstation.rule
        excluded = {str(i) for i in workstation.excluded_tx_ids}
        needle = _fold(rule.description_contains or "")

        out: list[tuple[str, str, str]] = []
        for t in page:
            if str(t.id) in excluded:
                continue
            if t.excluded_from_stats or t.is_transfer:
                continue
            if t.tx_type.value != "expense":
                continue
            label = t.description or t.raw_description
            if needle and needle not in _fold(label):
                continue
            if rule.amount_min is not None and t.amount < rule.amount_min:
                continue
            if rule.amount_max is not None and t.amount > rule.amount_max:
                continue
            out.append((t.tx_date.isoformat(), label, f"{t.amount}"))
            if len(out) == MAX_ROWS:
                break
        return out

    @staticmethod
    def _one_row(result) -> dict[str, Any]:
        return result.rows[0] if result.rows else {}


def _summary_lines(profile: dict[str, Any]) -> list[str]:
    """The profile as labelled lines, with absent figures said out loud.

    "no disponible (falta historia)" rather than omitting the line: a model that
    never sees the field will happily estimate it, and an explicit absence is
    the instruction that stops it.
    """
    labels = [
        ("count", "movimientos"),
        ("total", "total"),
        ("mean", "promedio por movimiento"),
        ("median", "monto tipico (mediana)"),
        ("min", "monto minimo"),
        ("max", "monto maximo"),
        ("months_covered", "meses cubiertos"),
        ("per_week", "movimientos por semana"),
        ("per_month", "movimientos por mes"),
        ("median_days_between", "dias entre movimientos (mediana)"),
    ]
    lines = []
    for key, label in labels:
        value = profile.get(key)
        lines.append(
            f"  {label}: {value if value is not None else 'no disponible (falta historia)'}"
        )
    return lines


def _weekday_lines(rows: Sequence[tuple[str, str, str]]) -> list[str]:
    """A day-of-week histogram, precomputed.

    Handing the model 300 dates and expecting it to bucket them by weekday is
    asking it to do arithmetic it is bad at, on the one question ("cuando
    recargo mas") that a list of dates invites.
    """
    names = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    counts = [0] * 7
    for iso, _, _ in rows:
        try:
            counts[date.fromisoformat(iso).weekday()] += 1
        except ValueError:
            continue
    return [f"  {name}: {count}" for name, count in zip(names, counts)]


def _rule_prose(workstation: Workstation) -> str:
    rule = workstation.rule
    parts = []
    if rule.description_contains:
        parts.append(f"la descripcion contiene «{rule.description_contains}»")
    if rule.amount_min is not None:
        parts.append(f"el monto es al menos {rule.amount_min}")
    if rule.amount_max is not None:
        parts.append(f"el monto es a lo mas {rule.amount_max}")
    if workstation.excluded_tx_ids:
        parts.append(f"{len(workstation.excluded_tx_ids)} movimientos excluidos a mano")
    return "; ".join(parts)


def _fold(text: str) -> str:
    import unicodedata

    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


def _as_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
