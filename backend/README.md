# Tomin Backend

Hexagonal (ports & adapters) Flask API.

Pipeline: transient upload -> extract (PDF text / OCR / SAT XML) -> classify template
-> parse -> categorize -> persist structured data (raw file discarded) -> feed DuckDB cube.

## Layout

```
src/tomin/
  domain/         # pure business model: entities, value objects, services
  application/    # use cases + outbound port interfaces + DTOs
  adapters/
    inbound/http/ # Flask blueprints (the HTTP inbound adapter)
    outbound/     # persistence, extraction, parsing, cube, storage adapters
  config/         # settings + composition root (DI container)
  main.py         # create_app()
```

The `domain` and `application` layers never import Flask, SQLAlchemy, DuckDB, etc.
All infrastructure is injected via interfaces defined in `application/ports/outbound`.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"          # add ".[ocr]" for image OCR support
cp .env.example .env
flask --app tomin.main run --debug   # or: python -m tomin.main
```

Defaults to a local SQLite DB and disabled auth so it runs offline. Point
`DATABASE_URL` at Supabase Postgres and set `SUPABASE_JWT_SECRET` +
`AUTH_DISABLED=false` for a real deployment.

## The analytics cube is disposable

The DuckDB cube holds only *derived* state; the relational tables are the
record of truth. `POST /api/admin/cube/rebuild` drops the calling user's rows
in `fact_transactions` and re-derives them by streaming the full transaction
history back through the projection.

That is deliberate leverage, not a debugging tool: every later change to the
fact table (transfer flags, dedup fingerprints, tags) becomes "change the
projection, rebuild" instead of a bespoke DuckDB migration — and it keeps the
cost of replacing DuckDB with Postgres down to one adapter.

There are no rollup tables. `rollup_monthly` and `rollup_category` were written
on every upload and delete, read by nothing, and `refresh_rollups` ignored its
`user_id` and rebuilt every user's rollups each time; they were deleted rather
than fixed.

## Database schema & migrations

`adapters/outbound/persistence/models.py` is the **single source of truth** for
the schema. Alembic (`backend/migrations/`) is how that truth reaches a
database. `../supabase_setup.sql` is reduced to what SQLAlchemy cannot express:
the `profiles` table, the `handle_new_user` trigger on `auth.users`, and grants.

`Container.bootstrap()` runs `alembic upgrade head` in-process on startup, so
there is no separate "remember to migrate" deploy step. Set
`RUN_MIGRATIONS=false` to manage the schema out of band.

`migrations/env.py` takes the URL from `get_settings().database_url`, not from
`alembic.ini`, so the CLI, the app and the tests can never disagree.

```bash
alembic upgrade head              # apply
alembic downgrade -1              # roll back one
alembic revision --autogenerate -m "add foo"   # after editing models.py
alembic current                   # where am I
```

### Existing databases created before Alembic (stamp, don't migrate)

Revision `0001` reproduces exactly what the old `Database.create_all()`
produced. A database built that way already *has* those tables, so running
`upgrade` against it would fail on "table already exists". Mark it instead:

```bash
alembic stamp 0001      # "you are already at the baseline"
alembic upgrade head    # now apply 0002+ (created_at, RLS, amount CHECK)
```

A brand-new database just runs `alembic upgrade head`.

### Tests use `create_all`, deliberately

Every test builds a throwaway SQLite file, so the fixture sets
`run_migrations=False` and calls `metadata.create_all` — replaying the
migration history per test would measure Alembic, not the app.
`tests/test_migrations.py` guards the seam by asserting that a migrated
database and a `create_all` database have identical tables and columns; if a
migration is ever forgotten after a `models.py` edit, that test fails.

## Test

```bash
pytest
```
