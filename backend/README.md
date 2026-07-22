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

## Test

```bash
pytest
```
