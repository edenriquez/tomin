# mocks/ — referencias de diseño pre-rename (junio 2026)

Siete carpetas, cada una con `code.html` + `screen.png`, generadas el 1 y el 19
de junio de 2026 como referencias visuales **antes** del rename a Tomin y antes
del rediseño. Son historia, no especificación:

| Carpeta | Marca que usa | Nota |
|---|---|---|
| `financial_forecasts_&_optimization/` | Tomin | — |
| `financial_overview_dashboard/` | Tomin | Home de totales que `docs/redesign-plan.md` §Context descarta |
| `spending_insights/` | **FinanzaAI** | pre-rename |
| `stitch_transaction_management_filters /` | Tomin | el nombre del directorio termina en espacio; no renombrar sin revisar referencias |
| `tomin_landing_page/` | Tomin | landing anterior; la vigente vive en `landing/` ("Señal oscura") |
| `transaction_management_&_filters/` | **Finanzas AI** | pre-rename |
| `user_profile_&_settings/` | **FinanzAI** | pre-rename; `/ajustes` se retiró (redirect a `/`) |

Estado al 2026-09-05: **obsoletas** frente a `docs/redesign-plan.md` §10
(restyle Seline, 2026-08-12) y a la IA enviada (seis vistas fijas —
Movimientos, Categorías, Fijos, Pronóstico, Precios, Documentos — más
Lecturas/`/workspace`; ver `frontend/src/components/AppShell.tsx`). Ninguna
pantalla actual se construyó a partir de estos HTML; los tokens vigentes están
en `frontend/src/design/tokens.ts`.

Se conservan intactas como registro. No borrar sin decisión explícita.
