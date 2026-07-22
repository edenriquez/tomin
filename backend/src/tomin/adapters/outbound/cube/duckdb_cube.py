from __future__ import annotations

import threading
from datetime import date
from decimal import Decimal
from uuid import UUID

import duckdb

from ....application.dtos.analytics import (
    CategorySpend,
    MonthlyPoint,
    SpendingSummary,
)
from ....domain.entities import Category, Transaction


class DuckDbCube:
    """DuckDB-backed analytics cube (implements CubeWriter + CubeReader).

    Structured transactions are streamed into ``fact_transactions`` as they are
    processed; rollup tables (``rollup_monthly``, ``rollup_category``) are
    rebuilt on demand so dashboards can query pre-aggregated data quickly.
    """

    def __init__(self, path: str = ":memory:") -> None:
        self._con = duckdb.connect(path)
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._con.execute(
                """
                CREATE TABLE IF NOT EXISTS fact_transactions (
                    tx_id VARCHAR PRIMARY KEY,
                    user_id VARCHAR,
                    tx_date DATE,
                    amount DECIMAL(14,2),
                    currency VARCHAR,
                    tx_type VARCHAR,
                    category_id VARCHAR,
                    merchant_id VARCHAR,
                    description VARCHAR
                );
                """
            )
            self._con.execute(
                "CREATE TABLE IF NOT EXISTS dim_category "
                "(category_id VARCHAR PRIMARY KEY, name VARCHAR);"
            )

    # --- writer ----------------------------------------------------------
    def sync_categories(self, categories: list[Category]) -> None:
        with self._lock:
            for c in categories:
                self._con.execute(
                    "INSERT OR REPLACE INTO dim_category VALUES (?, ?)",
                    [str(c.id), c.name],
                )

    def upsert_transactions(self, transactions: list[Transaction]) -> None:
        if not transactions:
            return
        with self._lock:
            for t in transactions:
                self._con.execute(
                    "INSERT OR REPLACE INTO fact_transactions VALUES "
                    "(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        str(t.id),
                        str(t.user_id),
                        t.tx_date,
                        t.amount,
                        t.currency,
                        t.tx_type.value,
                        str(t.category_id) if t.category_id else None,
                        str(t.merchant_id) if t.merchant_id else None,
                        t.description or t.raw_description,
                    ],
                )

    def refresh_rollups(self, user_id: UUID) -> None:
        with self._lock:
            self._con.execute(
                """
                CREATE OR REPLACE TABLE rollup_monthly AS
                SELECT user_id,
                       strftime(tx_date, '%Y-%m') AS month,
                       tx_type,
                       SUM(amount) AS total
                FROM fact_transactions
                GROUP BY user_id, month, tx_type;
                """
            )
            self._con.execute(
                """
                CREATE OR REPLACE TABLE rollup_category AS
                SELECT f.user_id,
                       f.category_id,
                       COALESCE(d.name, 'Sin Categoria') AS category_name,
                       SUM(f.amount) AS total
                FROM fact_transactions f
                LEFT JOIN dim_category d ON f.category_id = d.category_id
                WHERE f.tx_type = 'expense'
                GROUP BY f.user_id, f.category_id, category_name;
                """
            )

    # --- reader ----------------------------------------------------------
    def spending_by_category(
        self, user_id: UUID, start: date | None = None, end: date | None = None
    ) -> list[CategorySpend]:
        clause, params = self._filter(user_id, start, end)
        with self._lock:
            rows = self._con.execute(
                f"""
                SELECT f.category_id,
                       COALESCE(d.name, 'Sin Categoria') AS name,
                       SUM(f.amount) AS total
                FROM fact_transactions f
                LEFT JOIN dim_category d ON f.category_id = d.category_id
                WHERE f.tx_type = 'expense' {clause}
                GROUP BY f.category_id, name
                ORDER BY total DESC
                """,
                params,
            ).fetchall()
        total = sum((r[2] for r in rows), Decimal("0")) or Decimal("1")
        return [
            CategorySpend(
                category_id=r[0],
                category_name=r[1],
                amount=Decimal(str(r[2])),
                percentage=round(float(r[2]) / float(total) * 100, 1),
            )
            for r in rows
        ]

    def monthly_series(self, user_id: UUID, months: int = 12) -> list[MonthlyPoint]:
        with self._lock:
            rows = self._con.execute(
                """
                SELECT strftime(tx_date, '%Y-%m') AS month,
                       SUM(CASE WHEN tx_type = 'income' THEN amount ELSE 0 END) AS income,
                       SUM(CASE WHEN tx_type = 'expense' THEN amount ELSE 0 END) AS expense
                FROM fact_transactions
                WHERE user_id = ?
                GROUP BY month
                ORDER BY month DESC
                LIMIT ?
                """,
                [str(user_id), months],
            ).fetchall()
        points = [
            MonthlyPoint(month=r[0], income=Decimal(str(r[1])), expense=Decimal(str(r[2])))
            for r in rows
        ]
        points.reverse()
        return points

    def spending_summary(
        self, user_id: UUID, start: date | None = None, end: date | None = None
    ) -> SpendingSummary:
        clause, params = self._filter(user_id, start, end)
        with self._lock:
            income, expense = self._con.execute(
                f"""
                SELECT
                    SUM(CASE WHEN tx_type = 'income' THEN amount ELSE 0 END),
                    SUM(CASE WHEN tx_type = 'expense' THEN amount ELSE 0 END)
                FROM fact_transactions f
                WHERE 1=1 {clause}
                """,
                params,
            ).fetchone()

        by_category = self.spending_by_category(user_id, start, end)
        monthly = self.monthly_series(user_id)
        return SpendingSummary(
            total_income=Decimal(str(income or 0)),
            total_expense=Decimal(str(expense or 0)),
            top_category=by_category[0].category_name if by_category else None,
            by_category=by_category,
            monthly=monthly,
        )

    @staticmethod
    def _filter(user_id: UUID, start: date | None, end: date | None):
        clause = "AND f.user_id = ?"
        params: list = [str(user_id)]
        if start:
            clause += " AND f.tx_date >= ?"
            params.append(start)
        if end:
            clause += " AND f.tx_date <= ?"
            params.append(end)
        return clause, params
