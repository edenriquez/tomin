# Tomin

Financial visibility tool for the Mexican market ("Toma el control de tu peso").
Aggregates messy bank data into clear insights, forecasts, and goals.

The **phone is the durable source of truth** for raw statements: the mobile app
stores bank statements / SAT XML on-device and uploads only a *transient* copy
to the backend, which parses it, stores the structured data, discards the raw
file, and feeds an analytics cube. Web and mobile are display layers over that
cube.

## Architecture

```
mobile/     React Native (Expo) app - on-device statement store + display
frontend/   Next.js web app - display layer over the cube
backend/    Flask hexagonal API - OCR/parse pipeline + DuckDB analytics cube
mocks/      Design references (7 screens)
supabase_setup.sql   Postgres schema + RLS + auth trigger
```

Ingestion pipeline (backend): `upload -> extract (PDF text / OCR / SAT XML)
-> classify template -> parse -> categorize -> persist structured data
(raw file discarded) -> feed DuckDB cube`.

- Backend: hexagonal (ports & adapters), Flask HTTP, SQLAlchemy (Supabase
  Postgres or SQLite), local OCR (pdfplumber + optional Tesseract), DuckDB cube.
- Auth: Supabase (JWT verified server-side); disabled by default for local dev.

## Quickstart

```bash
# Backend (Python 3.10+)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && cp .env.example .env
python -m tomin.main               # http://localhost:8000

# Web
cd frontend && npm install && npm run dev   # http://localhost:3000

# Mobile
cd mobile && npm install && npx expo start
```

See each package's `README.md` for details.
