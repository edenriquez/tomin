# Auditoría comercial + UX de Tomin — 2026-09-05

Tres auditores en paralelo con ojo de startup, sobre el working tree de `main` sin commits:

| Auditor | Territorio | Reporte |
|---|---|---|
| A — Landing (growth) | `landing/` | [landing.md](landing.md) |
| B — Dashboard (head of product) | `frontend/` | [dashboard.md](dashboard.md) |
| C — Historia del producto (due diligence) | `docs/`, `README.md`, `mocks/README.md` | [historia.md](historia.md) |

Verificación global al cierre: `tsc --noEmit` en verde en `landing/` y `frontend/`; `npm run lint` en verde en `landing/` (en `frontend/` no hay config de ESLint, ver bloqueos); redirects `/fijos`, `/pronostico`, `/recurrentes` → `/plan…` y `/statements` → `/documentos` responden 307; `/privacidad` responde 200; `git status` limitado a `landing/`, `frontend/`, `docs/`, `README.md`, `mocks/README.md`. No se corrió `next build`.

## Veredicto en cinco líneas

La tesis es clara y el motor existe: parsers, cubo de métricas, emparejado de transferencias propias, custodia real en móvil. La historia se rompía en tres costuras: la landing mandaba a un app **sin login** que muestra el ledger de quien sea; el banco que la landing nombraba primero, **Nu**, es el peor leído (parser genérico); y dos de las seis "lecturas" vendidas abrían en `$0` o dependían de una app que no se distribuye. El dashboard tenía **seis tabs para tres preguntas**. Todo lo que era copy, flujo o arquitectura de información se corrigió hoy; lo que queda es backend y decisiones de negocio.

## Dashboard: de 6 tabs a 3 + 1 condicional

| Antes | Después | Por qué |
|---|---|---|
| Movimientos | **Movimientos** (`/`) + línea de orientación "Salieron $X en N cargos del … al …" | El primer pantallazo responde "¿qué pasó?" antes de pedir que se lea una gráfica. |
| Categorías | **Categorías** (`/categorias`) | Pregunta distinta ("¿en qué se va?") con controles distintos; meterla como modo de gráfica arriesgaba el drag-to-zoom. |
| Fijos + Pronóstico | **Plan** (`/plan` "Lo que se va", `/plan?cara=ingresos` "Lo que entra") | Mismas dos llamadas, mismo motor de proyección, mismo horizonte; la pregunta del usuario es una sola: "¿me alcanza?". |
| Precios | **Precios**, solo visible con ≥1 ticket | Los tickets entran únicamente por la app móvil, no distribuida; un tab vacío para el 100 % de usuarios web es deuda de confianza. |
| Documentos | Header, junto a "Subir documento" | Es mantenimiento (subir, etiquetar, borrar), no una lectura del dinero. |

Además: el root sin datos va directo a Onboarding (la `Landing.tsx` in-app duplicaba `landing/`); ningún `$0` se pinta como dato (Plan dice "14 series detectadas — confirma las fijas" y "Todavía no lo sabemos · Hay 10 sin etiquetar" con el candidato mayor y botón "Sí, es mi nómina"); el periodo deshabilitado en gris se sustituye por la cápsula "Historial completo"; telemetría en las cinco vistas que no medían nada; llegada desde la landing (`utm_source=landing`) registrada como `app.arrive` y con el dropzone enfocado.

## Landing: nuevo orden y objeciones respondidas

Orden final: Hero → Cómo funciona → Seis lecturas → Reconoce a quien te cobra → Custodia → Bancos → Preguntas → CTA → Footer. Una sola promesa en H1, `<title>` y OG: "Tu estado de cuenta, leído." El número del hero pasó de "$4,812 en cafés" a "$487.00/mes en 3 cobros recurrentes que no recordabas", que ilustra literalmente el subtítulo.

Nuevo: sección **Bancos** honesta por niveles (lectura dedicada: Banamex y Banco Azteca; genérica: Nu, BBVA, Santander, Banorte, HSBC; XML del SAT), **FAQ** de cinco preguntas (costo, datos, bancos, app, PDF con contraseña), ruta **`/privacidad`** escrita contra el código real (el PDF se lee en memoria y se desecha; el servidor sí ve los movimientos; no es E2EE), footer con links reales, UTMs en los cinco CTAs. El bento quedó alineado con la IA final del dashboard: Movimientos, Atención, Categorías, Plan · Lo que se va, Plan · Lo que entra, Precios · desde el teléfono ("app en pruebas"). Las tarjetas de Plan ya prometen lo que la pantalla hace: "Tú confirmas cuáles son fijas" y "Etiqueta un depósito como nómina una vez".

## Historia: las rupturas y su estado

| Ruptura (C) | Estado |
|---|---|
| Landing → app sin login; cualquiera con la URL ve el ledger | **Abierta.** Backend. Bloqueo #1 para cualquier deploy público. |
| Nu nombrado primero, leído con parser genérico (84/90 filas como transferencia en un estado real) | **Mitigada en copy** (Bancos por niveles; `ReviewStatement` avisa "leído con plantilla genérica: revisa fechas y montos"). El parser sigue pendiente. |
| Pronóstico abría en "Te entran $0" con depósitos quincenales sin etiquetar | **Resuelta** en Plan · Lo que entra. |
| Precios promete la foto del ticket sin app disponible | **Mitigada**: tab condicional, copy "app en pruebas", estado vacío que explica de dónde llegan los tickets. Distribuir la app sigue pendiente. |
| "Nunca pedimos la contraseña" justo encima del diálogo que pide la del PDF | **Resuelta** en hero, pasos, FAQ y Onboarding: banco vs PDF desambiguado. |
| Una sola frase de custodia para dos garantías distintas (web transitorio / móvil custodio) | **Resuelta** en CustodyB, FAQ, `/privacidad` y chip "Leído en el servidor y desechado" en Documentos. |
| Transferencias entre cuentas propias: el concepto solo existía dentro del editor | **Resuelta en superficie**: paso 3 de la landing y nota en Documentos con ≥2 bancos. Los bordes del emparejado (Bitso $4,999 vs $1.00) son backend. |
| `PriceChat` se contradecía sobre si consulta internet | **Resuelta**: una sola frase verdadera. |
| Tres headlines distintas entre H1, título, OG y app | **Resuelta**: una promesa en los cuatro. |
| Docs obsoletos (`redesign-plan.md` "nothing implemented", reversión web-only sin registrar, `mocks/` pre-rename) | **Resuelta** en `docs/`, `README.md`, `mocks/README.md`. |

## Bloqueos que requieren backend o decisión del usuario

Orden recomendado por C, con costo aproximado para 1–2 personas:

1. **Auth** (Supabase en web, bearer en `lib/api.ts`, `AUTH_DISABLED=false`, sesión en móvil, CORS explícito). 1–2 semanas. Sin esto no hay URL pública ni usuario #2.
2. **Aviso de privacidad legal + contacto** (razón social, domicilio, derechos ARCO; `/privacidad` hoy es técnica y veraz, no un aviso LFPDPPP). 1–2 días + revisión legal.
3. **Parser dedicado de Nu** (hay 6 estados reales como fixtures). 3–5 días.
4. **Fijos e ingresos etiquetados al backend** y sugerir nómina desde `/recurring`. 3–5 días, después de auth.
5. **Precios**: distribuir la app (2–4 semanas) o retirar la tarjeta y la pestaña (media jornada).
6. **Emparejado de transferencias**: correr `pair-transfers` tras cada subida y revisar los bordes. 2–3 días.
7. **Modelo de negocio**: hoy la landing dice "Hoy no cobramos" sin comprometer modelo. Recomendación de A: freemium por profundidad de historial, nunca por seguridad ni datos.
8. **Tooling**: `frontend/` no tiene config de ESLint, así que `npm run lint` pide crearla de forma interactiva. Una línea con `next/core-web-vitals`.
9. Menores: `NEXT_PUBLIC_LANDING_URL` en Vercel del frontend; `/dev/telemetria` aún muestra `/plan` como ruta cruda; `Sugeridos` propone una autotransferencia (PAGO INTERBANCARIO A NU, $72k/mes) como fijo.

## Qué medir después

Los eventos nuevos (`view.open`, `app.arrive` con `utm_content`, pin/unpin de fijos, etiquetar nómina, cambiar horizonte, abrir ticket, etiquetar documento) permiten responder en 30 días: qué CTA de la landing convierte, cuántos llegan a Plan y etiquetan nómina, si alguien abre Precios, y si Categorías merece seguir siendo tab. Lectura en `/dev/telemetria`.

## Screenshots

- Landing y `/privacidad`: `scratchpad/audit/landing/{before,after,after2}-*.png` (móvil fiel vía `shot.mjs` con emulación CDP; el `--screenshot` de Chrome headless impone ~500 px de ancho mínimo).
- Dashboard antes/después por ruta: `scratchpad/audit/dashboard/`.
- Recorridos de C a las 20:05, antes de los cambios: `historia/0N-*.png` en esta carpeta.
- Estado final verificado por el coordinador: `scratchpad/audit/final/`.
