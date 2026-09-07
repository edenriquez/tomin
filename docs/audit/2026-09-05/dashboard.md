# Auditoría B — Dashboard (frontend) — 2026-09-05

Auditor: head of product (persona). Alcance: `frontend/` contra el backend local con datos reales. Screenshots antes/después en `scratchpad/audit/dashboard/` (rutas absolutas al final). Decisión de IA publicada temprano en `scratchpad/audit/dashboard/IA-DECISION.md`.

## 1. Resumen ejecutivo

Tomin enviaba seis tabs para tres preguntas; dos de ellos (Fijos, Pronóstico) partían "¿me alcanza?" en mitades que no se veían entre sí, uno (Precios) estaba vacío para el 100% de usuarios solo-web porque los tickets solo entran por una app móvil no distribuida, y uno (Documentos) es mantenimiento, no lectura. El nav queda en **3 tabs + 1 condicional** (Movimientos, Categorías, Plan; Precios aparece con el primer ticket) y Documentos pasa al header junto a "Subir documento". Se eliminaron dos afirmaciones falsas sobre el dinero del usuario: Pronóstico ya no imprime "Te entran $0" cuando no hay nada etiquetado, y el periodo ya no se dibuja gris con "30 días" seleccionado en vistas que leen todo el historial. El root sin datos va directo al onboarding (la landing in-app duplicaba `landing/`), y las cinco vistas que no medían nada ahora emiten eventos. **Bloqueo comercial #1 para deploy público: no hay autenticación** — cualquiera con la URL ve los datos; es backend y no se tocó.

## 2. Hallazgos

| # | Severidad | Qué | Evidencia | Por qué importa comercialmente |
|---|---|---|---|---|
| 1 | alta | Sin auth: no hay Supabase ni sesión en `src/`; cualquiera con la URL ve todos los movimientos. | `frontend/src/lib/api.ts:5` (solo comentario), `.env.local` con `NEXT_PUBLIC_SUPABASE_*` vacíos | No se puede compartir una URL con un solo inversionista o beta tester sin exponer el ledger. Bloquea cualquier deploy público. |
| 2 | alta | Pronóstico imprimía **"Te entran $0 · Nómina $0 · Extra $0 · Fijos $0 · Tablas $0"** cuando el usuario no había etiquetado nada. Cero como dato, no como ausencia. | `before-pronostico-desktop.png`; `PronosticoView.tsx` Headline (antes de la edición) | Un cero afirma que no entra dinero; el usuario piensa "no me entendió" y no vuelve. Viola la regla de diseño escrita en `redesign-plan.md` §4. |
| 3 | alta | Precios como tab de primer nivel siempre visible, pero los tickets solo entran por `POST /api/ingest/receipt` desde `mobile/` (no distribuida). Un usuario solo-web ve "Todavía no hay tickets" para siempre. | `AppShell.tsx:32` (antes), `ReceiptGroups.tsx:221-232` | Un tab vacío permanente es una promesa rota en el primer minuto. Cuesta atención y confianza al 100% de los usuarios web. |
| 4 | alta | Fijos y Pronóstico: mismas dos llamadas (`api.recurring`, `api.transactions?limit=10000`), mismo `useFijos`, mismo horizonte, mismo `buildTimeline`; el horizonte elegido en uno cambiaba el otro sin que se viera. | `FijosView.tsx:92-129`, `PronosticoView.tsx:87-118`; ambos `fijos.state.horizon` | Dos tabs para una pregunta duplican el costo de aprendizaje y esconden la respuesta ("sobra/faltan") en el segundo. |
| 5 | media | `Landing.tsx` (280 líneas) duplicaba la landing standalone `landing/` (puerto 3001, Vercel propio); el root sin datos mostraba el pitch dos veces al visitante que ya venía convencido. | `frontend/src/app/page.tsx` (antes), `Landing.tsx`, `landing/UploadStory.tsx` | Dos landings con copy distinto divergen; el visitante lee el pitch dos veces antes de subir un archivo. |
| 6 | media | `RootSkeleton` dibujaba "título + tres tiles + gráfica", geometría que la vista real nunca tuvo. | `page.tsx:120-135` (antes) | Salto de layout al cargar; el skeleton prometía un command center que no existe. |
| 7 | media | `TimeWindowBar` deshabilitado al 55% con "30 días" seleccionado en Fijos/Pronóstico/Precios/Documentos, vistas que leen todo el historial. | `before-fijos-desktop.png`, `TimeWindowBar.tsx:81-99` (antes) | Un control gris que dice "30 días" sobre una proyección a 6 meses es una afirmación falsa sobre lo que hay en pantalla. |
| 8 | media | Fijos e ingresos etiquetados viven en `localStorage` (`tomin.fijos`, `tomin.ingresos`) y la UI no lo advertía; un cambio de dispositivo los pierde. | `lib/fijos.ts:18`, `lib/ingresos.ts`, `useFijos.ts` | El trabajo del usuario (su plan) desaparece sin aviso; churn silencioso. Requiere backend para resolverse de fondo. |
| 9 | media | Cero telemetría en Fijos, Pronóstico, Precios, Documentos, Workspace: no se podía saber si alguien fijaba un cargo o etiquetaba nómina. | `grep track(` solo en Movimientos, Categorías, lectura, AppShell | Sin datos de uso no hay forma de decidir qué tab merece vivir. |
| 10 | media | Fijos con nada fijado decía "Fijos $0 · Resto recurrente $70,139" y la cifra grande "Necesitas $70,139" sin marcar que es una estimación del resto no fijado. | `before-fijos-desktop.png` | "$0" de fijos cuando simplemente no has elegido es un cero como dato; "Necesitas" sin "estimado" sobre-afirma. |
| 11 | media | Nav de 6 items se cortaba en 390px sin scroll (`ul` sin `overflow-x`); "Precios/Documentos" invisibles en móvil. | `AppShell.tsx:83` (antes), `before-home-mobile.png` | Un tab que no se ve es una vista que no existe para el usuario móvil. |
| 12 | media | El `Home` no orientaba: scatter sin una frase que diga cuánto salió ni en qué días; el total solo aparecía en Categorías. | `before-home-desktop.png` vs `before-categorias-desktop.png` | El primer pantallazo debe responder "¿qué pasó?" en una línea antes de pedir que se lea una gráfica. |
| 13 | media | `ReviewStatement` mostraba "Detectamos 0 movimientos" con botón "Confirmar y continuar" cuando el parser no leyó nada. | `ReviewStatement.tsx:100-104` (antes) | El fracaso del OCR se vestía de éxito; el usuario entra a una app vacía sin saber por qué. |
| 14 | baja | `src/app/recurrentes/page.tsx` renderizaba `FijosView` verbatim aunque el redirect ya existía. | `next.config.mjs`, `recurrentes/page.tsx` | Ruta zombi; código muerto que hay que mantener. |
| 15 | baja | Sin captura del origen (`?from=landing`, `utm_*`) al llegar al root; imposible medir conversión landing → upload. | `page.tsx` (antes) | El Auditor A añade UTMs a los CTAs; sin receptor no hay embudo. |
| 16 | baja | `npm run lint` no está configurado (no hay `.eslintrc`; `next lint` abre un prompt interactivo). | `frontend/package.json` `lint: next lint` | La verificación pedida ("lint en verde") no es ejecutable hoy; no se creó config para no tocar tooling sin pedirlo. |
| 17 | baja (backend) | "Sugeridos" propone como fijo "PAGO INTERBANCARIO A NU MEXICO AL BENEF. EDUARDO ENRIQUEZ… $72,358/mes" — una transferencia propia. | `after-plan-desktop-full.png` | Si el usuario la fija, el plan se infla ~$430k a 6 meses. Es detección backend (commit d58a841 tocó autotransferencias por wording, pero esta serie sigue saliendo). |

## 3. Arquitectura de información: antes → después

| Antes (6 tabs) | Después | Decisión y porqué |
|---|---|---|
| Movimientos `/` | **Movimientos** `/` | Se queda. Es el ledger y la casa de las lecturas de atención. Gana una línea de orientación ("Salieron $261,091 en 118 cargos del 13 jul al 11 ago"). |
| Categorías `/categorias` | **Categorías** `/categorias` | Se queda como tab. Responde otra pregunta ("¿en qué se va?") con otro control de lista (chips vs búsqueda). Meterla como modo de gráfica en Movimientos obligaría a controles de panel que cambian por modo y arriesga el drag-to-zoom. |
| Fijos `/fijos` | **Plan** `/plan` (cara "Lo que se va") | Fusionado. Mismos datos, mismo motor, mismo horizonte; ahora un enlace "¿Y cuánto te entra? →" lleva a la otra cara sin cambiar de tab. |
| Pronóstico `/pronostico` | **Plan** `/plan?cara=ingresos` (cara "Lo que entra") | Fusionado. Encabezado honesto: sin etiquetas dice "Todavía no lo sabemos · Hay 10 sin etiquetar"; con etiquetas muestra Nómina/Extra/Fijos y Sobra/Faltan solo cuando ambos lados existen. |
| Precios `/precios` | **Precios** condicional (`≥1` ticket) | Demotado a condicional. Sin tickets no aparece; la puerta es `ReceiptStrip` bajo un movimiento y una nota en Documentos que explica que los tickets entran por el teléfono. Con tickets (este usuario tiene 1) el tab está. |
| Documentos `/documentos` | **Documentos** en el header (icono + label; solo icono en móvil) | Demotado a header. Es mantenimiento (subir, etiquetar, borrar) y vive al lado del único botón que ya estaba en todas las vistas. |
| — | Rail: Bancos · Periodo/**Historial completo** · Lecturas | En vistas de historial completo el periodo se sustituye por una cápsula estática con tooltip que dice qué periodo sigue puesto en Movimientos y Categorías. |

Redirects: `/fijos → /plan`, `/pronostico → /plan?cara=ingresos`, `/recurrentes → /plan` (verificados 307), `/statements → /documentos` y los antiguos al root sin cambio.

### Clics para las 5 tareas más frecuentes

| Tarea | Antes | Después | Nota |
|---|---|---|---|
| Ver qué salió este mes | 0 (aterrizas) + leer lista | 0 + una frase lo dice | La cifra total ya está en la primera línea. |
| Subir un estado de cuenta | 1 | 1 | Botón en el header, sin cambio. |
| Saber si me alcanza (fijar un cargo y ver ingresos contra fijos) | 3 clics y 2 tabs (Fijos → Fijar → Pronóstico) | 3 clics y 1 tab (Plan → Fijar → "¿Y cuánto te entra?") | Mismo conteo; un destino menos que memorizar y el horizonte compartido queda explícito. |
| Etiquetar el banco/tipo de un documento | 3 (Documentos → select → opción) | 3 (icono header → select → opción) | Sin cambio de clics; un tab menos en la fila. |
| Ver los movimientos de una categoría | 2 (Categorías → chip) | 2 | Sin cambio. |
| Comparar precios de un ticket | 2 (Precios → abrir ticket) para quien tiene tickets; **1 clic a un callejón sin salida** para quien no | 2 para quien tiene tickets; **0 callejones** para quien no | El tab no existe hasta que tiene contenido. |

La ganancia no es de clics: es de destinos (6 → 3+1), de callejones sin salida (2 → 0: Precios vacío y Pronóstico "$0") y de afirmaciones falsas en pantalla (3 → 0).

## 4. Aplicado

Verificación: `cd frontend && npx tsc --noEmit` en verde. `npm run lint` no es ejecutable (hallazgo #16). Nunca se corrió `next build`. Redirects confirmados con `curl -sI`. Telemetría confirmada en `GET localhost:8000/api/telemetry/events?days=1`: `view.open` (42), `plan.face` (12), `app.arrive` (3), `nav.view` con `source`.

**Navegación y rutas**
- `frontend/next.config.mjs`: redirects `/fijos`, `/pronostico`, `/recurrentes` → Plan.
- Borrados: `frontend/src/app/fijos/page.tsx`, `frontend/src/app/pronostico/page.tsx`, `frontend/src/app/recurrentes/page.tsx`.
- Nuevo `frontend/src/app/plan/page.tsx` + `frontend/src/components/plan/PlanView.tsx` (dos caras con `role=tablist`, cara en la URL, aviso discreto "Tus fijos y etiquetas se guardan en este navegador", eventos `plan.face`).
- `frontend/src/components/AppShell.tsx`: NAV = Movimientos, Categorías, Plan; Precios condicional vía `useReceiptCount`; Documentos como `NavLink compact` en el header; `ul` con `overflow-x-auto` para móvil; `nav.view` con `source`.
- Nuevo `frontend/src/components/precios/useReceiptCount.ts`.

**Honestidad de estados**
- `frontend/src/components/pronostico/PronosticoView.tsx`: Headline reescrito (sin `$0`; "Todavía no lo sabemos" + cuántos depósitos faltan; Sobra/Faltan solo si hay ambos lados, con `positive`/`negative` solo en el signo); empty state con botón "Ir a lo que se va"; prop `onGoToFijos`.
- `frontend/src/components/fijos/FijosView.tsx`: "Nada fijado aún" en vez de "Fijos $0"; eyebrow "Necesitas · estimado del resto recurrente" cuando nada está fijado; enlace "¿Y cuánto te entra? →"; prop `onGoToIngresos`.
- `frontend/src/components/TimeWindowBar.tsx`: `disabled` renderiza cápsula estática "Historial completo" (icono `History`, borde punteado) con tooltip que nombra el periodo que sigue puesto.
- `frontend/src/components/onboarding/ReviewStatement.tsx`: estado "Sin movimientos legibles" con explicación cuando `transactions_created === 0`.

**Primer minuto**
- `frontend/src/app/page.tsx`: sin `Landing`, sin `tomin.started`; root sin datos → `Onboarding`; `RootSkeleton` con la geometría real (header con pills, rail, card de gráfica con subtítulo, card de lista); evento `app.arrive` una vez por sesión con `from`/`utm_*`/referrer host.
- Borrados: `frontend/src/components/Landing.tsx`, `frontend/src/components/landing/UploadStory.tsx`.
- `frontend/src/components/Onboarding.tsx`: enlace "¿Qué es Tomin?" a `NEXT_PUBLIC_LANDING_URL` (default `http://localhost:3001`); paso 3 menciona el Plan; eventos `onboarding.view`, `onboarding.uploaded`, `onboarding.to_landing`.

**Home**
- `frontend/src/components/ChartCard.tsx`: prop `subtitle`.
- `frontend/src/components/movimientos/MovimientosView.tsx`: línea de orientación calculada de las filas en pantalla (ausente si no hay filas; "Sin cargos…; N abonos" si solo hay ingresos). Gráfica y drag-to-zoom intactos.

**Telemetría nueva**
- `frontend/src/components/AppChrome.tsx`: `view.open` {path, time_scoped, window} en cada llegada a una vista.
- Fijos: `plan.fijo_pin`, `plan.fijo_unpin`, `plan.fijo_add_manual`, `plan.rest_add`, `plan.horizon`.
- Ingresos: `plan.ingreso_label`, `plan.ingreso_unlabel`, `plan.horizon`.
- `frontend/src/components/precios/ReceiptGroups.tsx`, `PriceChat.tsx`: `precios.ticket_open`, `precios.ticket_delete`, `precios.term_set`, `precios.ask`.
- `frontend/src/components/documentos/DocumentosView.tsx`: `documentos.label_kind`, `documentos.delete`; nota `TicketsNote` (de dónde vienen los tickets / "N tickets · Ver precios").
- `frontend/src/components/workspace/useWorkstations.ts`: `workspace.create`.
- Onboarding/Review: `onboarding.review` {decision, changed}.

**Screenshots** (en `/private/tmp/claude-501/-Users-eduardoenriquez-dev-tomin/844c830a-519a-4a6e-83a9-b399f6f86603/scratchpad/audit/dashboard/`)
- Antes: `before-{home,categorias,fijos,pronostico,precios,documentos,workspace}-{desktop,mobile}.png`.
- Después: `after-{home,plan,plan-ingresos,categorias,precios,documentos,workspace}-{desktop,mobile}.png`, `after-plan-desktop-full.png`.
- Nota metodológica: Chrome headless impone un ancho mínimo de ventana (~500px), así que los `before-*-mobile` son un layout de ~500px recortado a 390 y exageran el recorte. Los `after-*-mobile` se tomaron dentro de un iframe de 390px (`frames/*.html`) y sí son fieles. El hallazgo #11 (nav cortado) se confirmó en código, no solo en la captura.

## 5. Propuesto y no aplicado

| Qué | Por qué no se aplicó | Quién |
|---|---|---|
| **Autenticación** (Supabase o sesión propia) y scoping de datos por usuario. Bloqueo comercial #1: sin esto no hay deploy público, ni beta cerrada por URL, ni demo a inversionistas con datos reales. | Backend + infra. | Backend |
| Persistir fijos e ingresos etiquetados en el backend (`profiles`/`fijos` por usuario). El `FijosStore` ya es async a propósito; el cambio es un adaptador. Hasta entonces el aviso "se guardan en este navegador" es lo honesto. | Requiere auth primero (sin usuario, un store servidor sería una mentira sobre "tu" plan). | Backend |
| Excluir autotransferencias (PAGO INTERBANCARIO … AL BENEF. EDUARDO ENRIQUEZ) de `GET /api/analytics/recurring` o marcarlas `is_transfer` para que no aparezcan en Sugeridos. | Detección backend. | Backend |
| Distribuir la app móvil (TestFlight/APK) o habilitar captura de ticket desde la web. Mientras no exista, Precios seguirá siendo condicional. | Decisión de negocio y trabajo en `mobile/`. | Negocio |
| Configurar ESLint (`.eslintrc.json` con `next/core-web-vitals`) para que `npm run lint` sea ejecutable. | Tooling nuevo fuera del pedido; una línea, pero es decisión del repo. | Usuario |
| Fusionar `LecturaPanel` con `WorkstationDetail` (duplican queries y chat). | Fuera del alcance de IA de tabs; refactor de 2 componentes grandes con riesgo al chat de threads durables. | Siguiente iteración |
| Actualizar el mapa de rutas de `/dev/telemetria` (`TelemetryView.tsx:363-368`) con `/plan`. | Regla: no tocar `src/app/dev` ni `components/dev`. Hoy `/plan` se muestra como ruta cruda. | Usuario |
| Landing: los CTAs deben llevar `?from=landing` (o `utm_source=landing`); el receptor `app.arrive` ya está. `NEXT_PUBLIC_LANDING_URL` debe configurarse en Vercel del frontend con la URL pública de `landing/`. | Territorio del Auditor A y config de deploy. | Auditor A / Usuario |

## Segunda pasada (rupturas de historia)

Fuente: `scratchpad/audit/historia/para-B.md` (Auditor C, 10 items, escrito contra HEAD antes de la primera pasada) y la petición del Auditor A. Todo con `npx tsc --noEmit` en verde; redirects re-verificados (`/fijos`, `/pronostico`, `/recurrentes` → Plan; `/statements` → Documentos); `/?utm_source=landing&utm_medium=cta&utm_content=hero` y `/?buscar=transferencia` responden 200. Screenshots: `after-plan2-desktop.png`, `after-plan-ingresos2-desktop.png`, `after-documentos2-desktop.png`, `after-documentos2-tail.png`, `after-home-buscar2-desktop.png`, `after-precios2-desktop.png`.

| Item | Decisión | Dónde / razón |
|---|---|---|
| 1. Landing in-app duplicada | (a) ya cubierto | `Landing.tsx` y `landing/UploadStory.tsx` borrados; root sin datos → `Onboarding` con enlace "¿Qué es Tomin?" a `NEXT_PUBLIC_LANDING_URL`. |
| 2. `<title>`/description prometen "control de tu peso" y "crece con IA" | (b) aplicado | `frontend/src/app/layout.tsx`: título "Tomin — Tu estado de cuenta, leído", description idéntica a `landing/src/lib/site.ts`, sin IA. |
| 3. "Nunca pedimos la contraseña de tu banco" sobre un dropzone que pide contraseña de PDF | (b) aplicado | `Onboarding.tsx` paso 1: "Nunca pedimos la contraseña de tu banca en línea; si el PDF trae una, la pedimos solo para abrirlo y no la guardamos." |
| 4. ReviewStatement no avisa cuando se leyó con plantilla genérica | (b) aplicado | `ReviewStatement.tsx`: `Notice` cuando `result.template === "generic_bank"` ("Leído con la plantilla genérica: Nu todavía no tiene lector propio. Revisa fechas y montos en Movimientos"). El evento `onboarding.uploaded` ya lleva `template`. |
| 5. Pronóstico "$0" con depósitos quincenales sin etiquetar | (a) cubierto + (b) ampliado | Plan › Lo que entra: "Todavía no lo sabemos · Hay 10 sin etiquetar" y ahora nombra el candidato mayor ("El mayor: Vech Soluciones, ~$81,707/mes en 20 depósitos. ¿Es tu nómina?") con botón "Sí, es mi nómina" que etiqueta en un clic (`PronosticoView.tsx` Headline `candidate`). No se usa la frecuencia detectada porque `clusterIncome` no la expone; el conteo y el mensual sí son del ledger. |
| 6. Fijos abre con "$70,139 · Fijos $0" que nadie eligió | (a) cubierto + (b) ampliado | Plan › Lo que se va, sin fijos: eyebrow "Para empezar", titular "14 series detectadas", cuerpo "Confirma abajo las que sí o sí se cobran; el total aparece con la primera", y el resto recurrente baja a letra pequeña con "~" (`FijosView.tsx` Headline `unstarted`). |
| 7. PriceChat se contradice sobre internet | (b) aplicado | `PriceChat.tsx`: una sola frase, con la fuente real (`chat.reference`): "Sabe lo que dicen tus tickets. Solo cuando preguntas por una línea, dentro de un ticket, la compara con Profeco…; aquí responde con tus tickets nada más." |
| 8. Precios vacío para usuarios sin app | (a) cubierto + copy | Tab condicional (≥1 ticket) en `AppShell.tsx`; `TicketsNote` en Documentos; empty state de `ReceiptGroups.tsx` ahora dice "aún no está en tiendas" y qué verá cuando fotografíe uno. |
| 9. Documentos sin chip de custodia para web | (b) aplicado | `DocumentosView.tsx` `StatementRow`: chip "Leído en el servidor y desechado" (icono `Server`, title con el mecanismo) para `source === "web"`; "Custodiado en tu teléfono" se conserva para `device`; los anteriores a la columna siguen sin chip (ausente, nunca negado). |
| 10. Emparejamiento de transferencias solo existe dentro de `TransactionEditor` | (b) aplicado | `DocumentosView.tsx` `TransfersNote` cuando hay ≥2 bancos: cuenta desde el ledger los `is_transfer` (y cuántos marcó el usuario), explica "Es entre mis cuentas" y enlaza a `/?buscar=transferencia`; `MovimientosView.tsx` acepta `?buscar=` para sembrar la búsqueda. No se muestra un número de "pares" porque el backend no lo expone; se cuenta lo marcado, que sí es verificable. |
| A. CTA de la landing debe terminar en acción | (b) aplicado | `page.tsx` detecta `utm_source=landing` o `from=landing` → `Onboarding fromLanding` → `StatementDropzone autoFocus`: el botón "Elegir archivo" recibe foco y se centra en pantalla (Enter/Espacio abre el selector). El navegador no permite abrir el selector sin gesto, así que esto es lo más cerca posible de "selector listo". `app.arrive` registra `utm_content` (hero/nav/band/footer/faq) y `onboarding.view` lleva `from_landing`. |

Rechazos: ninguno. Lo no verificable visualmente en esta sesión: el Onboarding con foco y el aviso de plantilla genérica (requieren una cuenta sin datos / una subida nueva; no se tocó la base de datos).

## 6. Qué medir después

| Evento | Pregunta que responde |
|---|---|
| `app.arrive` {from, utm_*, referrer} | ¿Cuántas sesiones vienen de la landing vs directas? Denominador del embudo. |
| `onboarding.view` {from_landing} → `onboarding.uploaded` {template} → `onboarding.review` {decision} | ¿Qué fracción de visitantes sin datos sube un archivo, y cuántos confirman banco/tipo vs "corregir después"? Tasa de conversión del primer minuto. |
| `view.open` {path, time_scoped, window} | ¿Qué vistas se abren realmente y bajo qué periodo? Decide si Categorías merece su tab o si Plan se visita. |
| `nav.view` {to, source: nav/header/documentos} | ¿Se encuentra Documentos en el header? Si `source=header` cae a cero, hay que reconsiderar. |
| `plan.face` {face, source: arrive/switch} | ¿La gente pasa de "lo que se va" a "lo que entra"? Si nadie cambia de cara, las dos caras no se leen como una pregunta. |
| `plan.fijo_pin` / `plan.fijo_unpin` {kind} | ¿Se fijan cargos? ¿Cuántos se deshacen (sugerencias malas, p. ej. autotransferencias)? |
| `plan.fijo_add_manual`, `plan.rest_add` | ¿La detección se queda corta (mucho manual) o sobra? |
| `plan.ingreso_label` {kind} / `plan.ingreso_unlabel` | ¿Alguien etiqueta nómina? Es el requisito para que Plan responda "¿me alcanza?". |
| `plan.horizon` {horizon, face} | ¿6 o 12 meses? Si nadie toca 12, el control puede desaparecer. |
| `precios.ticket_open`, `precios.ask` {scope}, `precios.term_set` | Con la app móvil distribuida: ¿los tickets se abren, se preguntan, se asocian a términos? Justifica o no que Precios vuelva a ser tab fijo. |
| `documentos.label_kind`, `documentos.delete` | ¿Se etiquetan documentos después del onboarding? ¿Cuánto se borra (parses malos)? |
| `workspace.create` {clauses, excluded} | ¿Se crean lecturas desde cero, o solo desde el dock ("Leer conjunto")? |
