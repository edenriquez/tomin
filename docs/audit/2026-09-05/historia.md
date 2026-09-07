# Auditoría C — Historia del producto (Tomin)

**Fecha:** 2026-09-05, 20:05–20:30 CST. **Base auditada:** commit `a9ba1a9` (HEAD) con
landing en :3001, dashboard en :3000 y backend Flask en :8000 con los datos reales del
usuario (25 estados de cuenta: Banamex débito y crédito, Nu, Banco Azteca; 1 ticket).
**Screenshots:** `docs/audit/2026-09-05/historia/0N-*.png`, tomados a las 20:05 antes de
que los auditores A y B cambiaran la UI. A las 20:15 el working tree ya traía cambios
sin commitear de ambos (landing: HeroB/CustodyB/StepsB/Nav/Footer + `FaqB`/`BanksB`
nuevos; frontend: `Landing.tsx` borrado, `fijos/page.tsx` y `pronostico/page.tsx`
borrados, `AppShell` modificado). Todo lo que sigue describe **HEAD**, y marco con
"[en vuelo]" lo que A o B ya estaban tocando.

Persona del auditor: socio operador haciendo due diligence de producto. Solo lectura
sobre `landing/`, `frontend/`, `backend/`, `mobile/`, `mocks/`; solo `GET` contra el
backend.

---

## 1. Resumen ejecutivo

Tomin tiene una tesis clara y defendible — "sube el PDF, te lo leemos, lo desechamos" —
y el motor que la sostiene existe: parsers, cubo de métricas, emparejado de
transferencias propias, custodia real en móvil. La historia se rompe en tres costuras:
(1) la landing manda a una app **sin login** que muestra el ledger de quien sea,
(2) el banco que la landing nombra primero, **Nu**, es el peor leído (parser genérico:
84 de 90 filas de un estado real terminan como "transferencia" y ningún ingreso trae
contraparte), y (3) dos de las seis "lecturas" vendidas — Pronóstico y Precios — abren
en `$0` o dependen de una app que no se distribuye. Nada de esto es fatal; todo es
ordenable: auth, un parser de Nu, y bajar el copy a lo que la pantalla cumple hoy.

---

## 2. Hallazgos

| # | Sev. | Qué | Evidencia | Por qué importa comercialmente |
|---|---|---|---|---|
| 1 | alta | **Sin autenticación.** El backend tiene verificación JWT de Supabase pero está apagada por defecto; el frontend nunca manda `Authorization`; CORS `*`. La landing manda tráfico a esa app. | `backend/.env.example:13` `AUTH_DISABLED=true`, `:20` `CORS_ORIGINS=*`; `backend/src/tomin/adapters/inbound/http/auth.py:29-35`; `grep -rn Authorization frontend/src` → 0; `landing/src/lib/site.ts` `APP_URL`; `docs/redesign-plan.md` §8.3 "No auth in v1" | Bloqueo #1 para cualquier URL pública: un deploy es un ledger compartido. Ningún otro arreglo vale hasta este. |
| 2 | alta | **Nu, primer banco nombrado, va al parser genérico** y el resultado es inutilizable para un usuario solo-Nu. | `classifier.py` `_TEMPLATES = {Banamex, Banco Azteca}`; `generic_bank.py:31-45` (primer monto de cada línea con fecha; `bank = None`). Datos reales, estado Nu jul-2026 (`GET /api/transactions?statement_id=08def080…`): 90 filas, **84 marcadas transferencia**, 32 ingresos y el 100 % se llama "Retiro/Depósito de Cajita"; el SPEI de $33,635 que llega de Banamex el 07-15 aparece como 3 filas ("Retiro cajita" ingreso, "Depósito en Cajita" gasto e ingreso) y ninguna nombra la contraparte. Estado Nu abr-2026: 43/47 transferencia. Los 4 Nu subidos por web tienen `account_kind = null` ("Sin etiqueta", screenshot 08). | El usuario P1 (asalariado solo Nu) es el más común del mercado objetivo y es a quien la landing habla primero ("Nu, Banamex, Azteca"); su primera subida produce un ledger vacío de gasto real. |
| 3 | alta | **Dos landings distintas en cadena.** `landing/` (H1 "Tu estado de cuenta, leído.", seis lecturas, "Nu, Banamex, Azteca") → "Comenzar" → `frontend/src/components/Landing.tsx` (H1 "Tu dinero, claro en minutos.", tres lecturas, "Nu, Banamex o cualquier PDF") → Onboarding. Tres titulares más en `<title>`/OG. | `frontend/src/app/page.tsx:112` (HEAD) `started ? <Onboarding/> : <Landing/>`; `Landing.tsx:37-40`; `landing/src/lib/site.ts` title "Tu dinero, claro en minutos"; `frontend/src/app/layout.tsx:23-24` "Toma el control de tu peso" / "Analiza, proyecta y crece con IA". **[en vuelo]** B borró `Landing.tsx` y quitó el estado `started` de `page.tsx` a las ~20:15. | Un visitante convencido lee el pitch dos veces con promesas distintas; el `<title>` de la app promete "IA" que la landing evitó prometer. Conversión perdida en el clic más caro. |
| 4 | alta | **Pronóstico abre en `$0` con la nómina en el ledger.** "Te entran $0 · Nómina $0" mientras hay depósitos STP de $40,853.33 (07-15) y $40,773.35 (07-31) de VECH SOLUCIONES. La etiqueta se guarda en `localStorage`. | Screenshot 06; `GET /api/transactions?search=pago` (statement Banamex débito `7e2baaa6`); `PronosticoView.tsx:270` "Etiqueta un depósito como nómina para que entre al número"; `lib/ingresos.ts:79-89`. Landing `BentoB.tsx:48-52` vende "$9,140 — Lo que necesitas antes de la quincena". | La lectura más "de producto" (quincena) es la que exige más trabajo manual y lo pierde al cambiar de navegador. `redesign-plan.md` §4 ya lo prohibía: "never render $0". |
| 5 | alta | **Precios depende de una app que no existe para el público.** Landing: "Fotografía el ticket del súper. El teléfono lo lee". No hay `eas.json`, ni URL de tienda, ni mención de app en la landing; la web solo acepta `.pdf,.xml`. | `BentoB.tsx:56-60`; `ls mobile/` (sin `eas.json`); `grep -ri "app store\|descarga" landing/src` → 0; `StatementDropzone.tsx:11`; `ingest.py:128` `POST /api/ingest/receipt` única entrada. Screenshot 07: 1 ticket, llegado por device. | Una de las seis lecturas vendidas no es alcanzable por nadie que llegue desde la landing. |
| 6 | media | **Precios se contradice en pantalla.** "…precios de referencia de Profeco (Quién es Quién en los Precios) · listados en línea (Firecrawl)" seguido de "No consulta precios de ninguna tienda en internet." | `PriceChat.tsx:268-269`; screenshot 07. | Justo en la pantalla de precios —la más fácil de auditar por un usuario— el producto se desdice. |
| 7 | media | **"Tu archivo no se guarda" cubre dos garantías distintas con una frase.** Web: el PDF viaja, se lee en memoria y se descarta. Móvil: nunca sale. El dashboard marca "Custodiado en tu teléfono" solo en `source = "device"` y no dice nada para web ("absent, never negated"). | `BentoB.tsx:64-68`, `CustodyB.tsx:12`; `process_file.py:213-215, 283-284`; `ingest.py:55-60`; `DocumentosView.tsx:440-455`; `custody-plan.md` tabla G1–G4 (web: G2 ❌). Datos: 15 statements `web`, 10 `device`. | La promesa de custodia es el diferenciador; si se lee como E2EE y no lo es, el primer post en redes lo destruye. `custody-plan.md` lo dice: "prometer E2EE antes de F3 sería marketing deshonesto". |
| 8 | media | **Fijos abre en "Fijos $0 · Resto recurrente $70,139"** con 14 series detectadas sin fijar; pines en `localStorage`. | Screenshot 05; `FijosView.tsx:282,387`; `lib/fijos.ts:143-153`; `GET /api/analytics/recurring` → 14 series (biweekly/weekly/monthly). Landing `BentoB.tsx:40-45` "3 suscripciones que no recordabas, con su ritmo y su próximo cobro". | El bento vende una lista lista; la pantalla entrega una lista de tareas y un total que nadie eligió. |
| 9 | media | **El usuario multi-cuenta no aprende que debe marcar transferencias.** El emparejado automático acierta los casos grandes, pero el único lugar donde existe el concepto es el editor de una transacción. Casos inconsistentes en datos reales. | `pair_transfers` acierta: "Pago tarjeta $29,270" (Banamex crédito 07-31) ↔ "PAGO DE SERVICIO 750467 A TB $29,270" (Banamex débito), ambos `is_transfer auto`; "PAGO INTERBANCARIO A NU MEXICO $33,635" flagged. Falla: "Bitso Transferencia $4,999" = gasto vs "Bitso Transferencia $1.00" = transferencia (`?search=Bitso`). UI: `TransactionEditor.tsx:294` "Es entre mis cuentas"; cero menciones en Onboarding/landing. | "Detecta lo que te cobran" solo es cierto si el doble conteo está resuelto; hoy depende de que el usuario descubra un botón. |
| 10 | media | **Sin modelo de negocio, sin captura de correo, sin política de privacidad (HEAD).** | `grep -ri "precio\|gratis\|correo\|email\|privacidad" landing/src` en HEAD → 0 (solo el body de Precios). **[en vuelo]** A añadió "Hoy no cobramos" al hero y `FaqB.tsx` con link a `/privacidad` (ruta aún inexistente). | Sin correo no hay forma de recontactar; sin aviso de privacidad se incumple la LFPDPPP al recibir estados de cuenta (datos personales financieros). |
| 11 | media | **Categorización débil en el banco mejor soportado.** "Sin Categoria" es la capa más grande de agosto; el primer renglón de Movimientos es `"12-ago-2026 CHALCO CMA 831005SG1MX +" · Sin Categoria` (la fecha de posteo queda dentro de la descripción). | Screenshots 03 y 04; `GET /api/transactions?limit=50`. Landing `LogoMarquee` "Reconoce a quien te cobra". | La primera pantalla tras subir contradice el marquee de logos. |
| 12 | baja | **"Nunca pedimos la contraseña de tu banco" y a renglón seguido un diálogo pide una contraseña** (la del PDF). | `Onboarding.tsx:20-21`; `StatementDropzone.tsx:51-54` + `PdfPasswordDialog`; `statements.py:40`. | Banamex y Azteca mandan PDFs cifrados: todo usuario de esos bancos vive la contradicción. Se arregla con una frase. |
| 13 | baja | **Attention: falsos positivos de "posible duplicado".** Telcel recargas $20 con 3 días de diferencia marcadas como duplicado; GYM $800 ×2 el mismo día sí es plausible. | `GET /api/transactions/attention` ids `194e5ebc`/`78c76dc7` (Telcel), `d88a7ad1`/`a526c08c` (GYM). | `advisor-principles.md`: "one wrong 'urgent' and the feature is muted forever". |
| 14 | baja | **Docs desalineadas** (corregido en esta auditoría): header "nothing implemented yet" en `redesign-plan.md`; reversión web-only → custodia móvil sin registrar; `mocks/` sin README y con nombres pre-rename; README raíz sin `landing/` ni puertos. | ver §5 | Un inversionista que lee `docs/` cree que nada está construido. |
| 15 | baja | **Móvil: puerto por defecto y saludo hardcodeado.** `api.ts` cae a `127.0.0.1:8010`; README dice `localhost:8000`; `app.json` apunta a LAN `:8000`. `index.tsx:24` "Hola, Alejandro". | `mobile/src/lib/api.ts:4`; `mobile/README.md:18`; `mobile/app.json:31`; `mobile/app/index.tsx:24`. | Señal de que la app no ha pasado por manos de un usuario ajeno. Anotado en README raíz; `mobile/` intacto. |

---

## 3. Los tres recorridos

### P1 — Asalariado con solo Nu, solo web

1. **Landing (:3001, screenshot 01/02).** Lee "Tu estado de cuenta, leído.", "Nu, Banamex, Azteca o cualquier PDF bancario", seis lecturas incl. Precios (teléfono) y Pronóstico ($9,140). Hace clic en "Comenzar con un estado de cuenta" → `http://localhost:3000`.
2. **Aterriza en… otra landing** (`frontend/src/components/Landing.tsx`, HEAD): "Tu dinero, claro en minutos.", tres lecturas, "Nu, Banamex o cualquier PDF bancario". Pestaña: "Tomin - Toma el control de tu peso". **Quiebre #1** (hallazgo 3). No pude fotografiarla: la cuenta del backend tiene datos y el root va directo a Movimientos (screenshot 03) — lo cual es el **quiebre #0**: sin login, cualquiera que llegue ve el ledger del usuario (hallazgo 1). [en vuelo: B borró `Landing.tsx`.]
3. **Onboarding** (`Onboarding.tsx`): "Empieza con un estado de cuenta." + paso 1 "Nunca pedimos la contraseña de tu banco." Arrastra su PDF de Nu. Nu no manda PDF cifrado, así que aquí no ve el diálogo; un Banamex/Azteca sí (hallazgo 12).
4. **ReviewStatement**: "Detectamos 90 movimientos · Banco: Nu · Tipo de cuenta: Sin etiqueta". Nada le dice que Nu se leyó con la plantilla genérica. **Quiebre #2** (hallazgo 2): según el estado real de julio, 84 de esos 90 son "transferencia" y solo 6 son gasto real (Dentista, Recarga Telcel, KK WM CHALCO…). Confirma.
5. **Movimientos**: gráfica casi vacía (las transferencias no se dibujan, `TransactionsChart.tsx:182`). **Categorías**: dos o tres barras chicas. **Fijos**: "Aún no detectamos cargos recurrentes" o un total sin fijos (hallazgo 8). **Pronóstico**: "Te entran $0" — su nómina, si llega a Nu, está entre las filas "Retiro de Cajita" sin contraparte (hallazgo 4). **Precios**: pantalla vacía que le habla de tickets que solo llegan desde una app que no tiene (hallazgo 5). **Documentos**: "Nu · Sin etiqueta".
6. Veredicto P1: la landing le prometió seis lecturas; recibe una y media. El problema no es copy: es el parser genérico sobre Nu.

### P2 — Banamex crédito + Nu débito (transferencias propias, pago de tarjeta)

Este es el usuario real del backend (más Banamex débito y Azteca).

1. Sube Banamex crédito y Nu. La landing nunca mencionó qué pasa con dos cuentas; el Onboarding tampoco.
2. **Emparejado automático funciona en los casos grandes** (screenshot 03 muestra "Pago tarjeta −$11,780" ya como transferencia): "Pago tarjeta $29,270" ↔ "PAGO DE SERVICIO 750467 A TB $29,270" (07-31), "$4,780.31" y "$2,438" (07-15), "PAGO INTERBANCARIO A NU MEXICO $33,635" y "$2,001" — todos `is_transfer auto`. La promesa "detecta lo que te cobran" sobrevive al doble conteo **en el pago de tarjeta**.
3. **Donde se rompe** (hallazgo 9): "Bitso Transferencia $4,999" cuenta como gasto y "Bitso Transferencia $1.00" como transferencia; "DIS.EFE. SAB PUERTO ESCONDID $5,000" no viene marcado `is_cash_withdrawal` en la respuesta (`false`), aunque es un retiro de cajero. El usuario solo puede corregirlo si abre la transacción y descubre "Es entre mis cuentas" (`TransactionEditor.tsx:294`). **Quiebre**: ningún texto del producto le dice que ese botón existe ni por qué importa.
4. **Categorías (screenshot 04)**: en julio "Transferencias & Ajustes" es una capa de ~$12k dentro del *gasto* por categoría — son envíos a terceros (Gaspar, kali, Bitso) categorizados como transferencia pero no flagged; correcto contablemente, confuso para quien acaba de leer "no cuenta como gasto" en el tooltip del editor.
5. **Documentos (screenshot 08)**: Banamex marcado "Débito" en 9 statements y "Crédito" en 6 — el usuario sí etiquetó; los 4 Nu subidos por web quedaron "Sin etiqueta". El chip "Custodiado en tu teléfono" aparece en los 10 `device`; los 15 `web` no dicen nada de su custodia (hallazgo 7).

### P3 — Usuario con app móvil y tickets

1. **¿Cómo llegó a la app?** No pudo: la landing no la menciona, no hay `eas.json`, no hay tienda. Solo el desarrollador (`bundleIdentifier mx.tomin.app`, `app.json` con IP LAN). **Quiebre**: la tarjeta Precios de la landing describe un flujo que ningún visitante puede iniciar (hallazgo 5).
2. **Si la tuviera**: `upload.tsx` cumple la custodia ("Guardando en tu teléfono…", "Leyendo en tu teléfono…", "Enviando cifrado…", pin TOFU con aviso "La llave del servidor cambió"); PDFs escaneados se rechazan (`extract.ts:16,331`). El link "Ver en tu dashboard" abre `/?statement=<id>` → `/documentos?statement=…` con el aviso "Documento recibido desde tu teléfono" (`DocumentosView.tsx:258`). Esto **sí distingue** `source = "device"` y es la parte más honesta del producto.
3. **Ticket**: `receipt.tsx` → OCR en dispositivo → `POST /api/ingest/receipt` → Precios muestra "BODEGA AURRERA · 16 artículos · $936.88" (screenshot 07), `transaction_id: null` (no emparejó con el movimiento). Debajo, el chat se contradice sobre si consulta internet (hallazgo 6).
4. **"Tu archivo no se guarda" ¿significa lo mismo?** No. En móvil es G1+G2+G3 de `custody-plan.md`; en web solo G1 (copia transitoria, el backend lee el PDF en memoria: `process_file.py:271-284`). La landing usa la misma frase para ambos y el dashboard solo señala el caso bueno.

---

## 4. Matriz promesa ↔ pantalla ↔ código

Estados: **cumplida** / **parcial** / **rota** / **promete lo que el código no hace**.

| Frase (fuente) | Pantalla que la cumple | Código que la sostiene | Estado |
|---|---|---|---|
| `<title>` "Tomin — Tu dinero, claro en minutos" (`landing/src/lib/site.ts`) | — (el H1 dice otra cosa) | — | parcial: tres titulares distintos (H1, OG, app) |
| H1 "Tu estado de cuenta, leído." (`HeroB.tsx:20`) | Movimientos tras subir | parsers Banamex/Azteca; `generic_bank.py` para el resto | cumplida (Banamex, Azteca) / rota (Nu, hallazgo 2) |
| "Tomin extrae cada movimiento" (`site.ts` description) | Movimientos, lista | `process_file.py`, parsers | parcial: Nu pierde contrapartes; Banamex crédito deja la fecha dentro del texto |
| "detecta lo que te cobran sin que lo veas" | Movimientos → chips "Cargos inusuales 2 · Comercios nuevos 4"; Fijos → Sugeridos 14 | `GET /api/transactions/attention`; `/api/analytics/recurring` | parcial: existe, con falsos positivos (hallazgo 13) y sin fijar nada por defecto |
| "y desecha el archivo" | Documentos (solo chip para device) | `process_file.py:283-284` (web), `ingest.py` (device) | cumplida en código; parcial en pantalla (web no lo dice) |
| "Sin conectar cuentas, sin capturar a mano" | Onboarding | `POST /api/statements` | cumplida |
| "Nunca pedimos la contraseña de tu banco." (`HeroB.tsx:39`, `Onboarding.tsx:21`) | Onboarding → `PdfPasswordDialog` | `statements.py:40` `password` | cumplida en el fondo, contradictoria en la forma (hallazgo 12) |
| Movimientos: "Cada movimiento, dibujado… Tócalo y edítalo ahí mismo" (`BentoB.tsx:22-27`) | `/` scatter + `TransactionEditor` | `PATCH /api/transactions/{id}`, `realias`, attention | cumplida (Banamex/Azteca) / rota (Nu) |
| Categorías: "Cada mes, por categoría" (`BentoB.tsx:31-35`) | `/categorias` | `spend_by_category` | parcial: "Sin Categoria" domina agosto |
| Fijos: "3 suscripciones que no recordabas, con su ritmo y su próximo cobro" (`BentoB.tsx:40-45`) | `/fijos` | `/api/analytics/recurring` + `localStorage` | parcial: detecta; no fija; total en $0 |
| Pronóstico: "Lo que necesitas antes de la quincena. Tus ingresos etiquetados…" (`BentoB.tsx:48-52`) | `/pronostico` "Te entran $0" | `useIngresos` en `localStorage`, `/api/forecast` | rota hasta etiquetar; la nómina está en el ledger sin usar |
| Precios: "Fotografía el ticket del súper. El teléfono lo lee…" (`BentoB.tsx:56-60`) | `/precios` | `POST /api/ingest/receipt`, `mobile/app/receipt.tsx` | promete lo que el usuario no puede hacer: la app no se distribuye |
| Custodia: "Tu archivo no se guarda… Solo tus números se quedan — y son tuyos" (`BentoB.tsx:64-68`) | Documentos chip device | web transitorio / device sellado | parcial: una frase para dos garantías; "son tuyos" sin auth es literalmente falso en un deploy |
| "Aprende de ti — Renombra «POCK*SUPERLECLERC»… se aplica a los parecidos y a cada estado de cuenta que subas después" (`CustodyB.tsx:7`) | TransactionEditor → renombrar | `POST /api/transactions/realias`; `aliaser.apply` en `process_file.py:153` | cumplida |
| "Nunca tu contraseña — No conectamos tu banco… el original se desecha" (`CustodyB.tsx:12`) | Onboarding | idem custodia | cumplida (con la salvedad del PDF cifrado) |
| "Un archivo basta — Nu, Banamex, Azteca o cualquier PDF bancario. El primero ya dibuja tus gráficas" (`CustodyB.tsx:17`) | Movimientos tras 1 subida | classifier + parsers | parcial: cierto para Banamex/Azteca; Nu ve casi nada |
| Pasos: "PDF o XML del SAT" (`StepsB.tsx:2`) | Dropzone `.pdf,.xml` | `sat_cfdi.py` | cumplida (CFDI genera transacciones; B9 "stop creating transactions from CFDIs" no se hizo) |
| "detecta el banco, categoriza" (`StepsB.tsx:3`) | ReviewStatement | `classifier.detect_bank`, `CategorizationService` | cumplida / parcial (categoría) |
| "mejores con cada corrección tuya" (`StepsB.tsx:4`) | editor, realias, mark-transfer | `category_source='user'`, `transfer_source='user'`, aliases | cumplida |
| App `<title>` "Toma el control de tu peso" / "Analiza, proyecta y crece con IA" (`frontend/src/app/layout.tsx:23-24`) | `/workspace` chat, `PriceChat` | `openai_compatible.py`, requiere `LLM_BASE_URL` | promete lo que la landing no promete; apagado sin config |
| `Landing.tsx` (HEAD): "Tu dinero, claro en minutos… tu centro de mando" (`:37-40`) | — | — | duplicado con copy distinto; "centro de mando" es el command center retirado en ce66e17. [en vuelo: borrado por B] |
| `Landing.tsx` "Nu, Banamex o cualquier PDF bancario" (`:104`) | — | — | omite Azteca, el único banco además de Banamex con parser dedicado |

---

## 5. Aplicado (docs) · Enviado a A / a B

**Aplicado en el repo** (verificado con `git diff --stat -- docs README.md mocks`):

- `docs/redesign-plan.md`: header obsoleto sustituido por un bloque "Estado al 2026-09-05" (qué se envió B0–B7 / F0–F7 con commits, qué no: B8–B12, `/inicio`, `/ajustes`, `/w/*`; la IA enviada difiere de §4; reversión de §8.1). Notas bajo §8.1 (reversión web-only → custodia móvil, fecha y enlace a `custody-plan.md`) y §8.3 (no-auth vigente y bloqueante). El resto del documento intacto.
- `docs/custody-plan.md`: "Registro de decisión (añadido 2026-09-05)" bajo la cita inicial: revierte §8.1, estado por commit, paso 3 (auth + magic link) no iniciado, app sin distribuir.
- `README.md`: sección Architecture reescrita con `landing/` (puerto 3001, Vercel propio), nav real del dashboard, las dos rutas de ingesta (`web`/`device`), parsers dedicados vs genérico, auth apagada por defecto, `localStorage` para fijos/ingresos, y una subsección "Known doc/config discrepancies" con el `8010` vs `8000` de mobile. Quickstart con landing y los tres puertos.
- `mocks/README.md` (nuevo): las 7 carpetas como referencias pre-rename (FinanzaAI / Finanzas AI / FinanzAI) de junio 2026, obsoletas frente a §10 y la IA enviada; nada borrado; anotado el directorio con espacio final.
- `docs/audit/2026-09-05/historia/*.png`: los 9 screenshots de las 20:05.

**Enviado a A** (`scratchpad/audit/historia/para-A.md`, 10 items): bajar "Nu" del primer lugar o calificarlo; Pronóstico y Fijos como "tú confirmas", no como número automático; Precios "próximamente en la app" o fuera del bento; separar las dos garantías de custodia (web vs teléfono); alinear `<title>`/OG con el H1; captura de correo; desambiguar contraseña del banco vs del PDF; acotar el marquee de logos a lo que `merchants.ts` reconoce; mencionar transferencias entre cuentas en el paso 3.

**Enviado a B** (`para-B.md`, 10 items): retirar `Landing.tsx` [B ya lo hizo en vuelo]; `<title>`/description sin "IA"; contraseña del PDF en Onboarding; aviso "plantilla genérica" en ReviewStatement; Pronóstico sin `$0` cuando hay depósitos con ritmo (sugerir nómina); Fijos encabezado por los 14 detectados; una sola frase en `PriceChat`; estado vacío de Precios que nombre la app; chip de custodia también para `source = "web"`; aviso en Documentos sobre transferencias entre cuentas con ≥2 bancos.

---

## 6. Propuesto y no aplicado (backend, negocio, distribución)

Orden en que yo lo resolvería, con costo estimado para un equipo de 1–2 personas:

| Orden | Qué | Por qué en este lugar | Costo aprox. |
|---|---|---|---|
| 1 | **Auth de verdad**: login Supabase en web, bearer en `lib/api.ts`, `AUTH_DISABLED=false`, sesión en el móvil para `POST /api/ingest/*`, `CORS_ORIGINS` explícito. | Sin esto no hay URL pública, no hay usuario #2, no hay métrica de nada. `auth.py` ya verifica JWT; `supabase_setup.sql` ya tiene RLS. | 1–2 semanas |
| 2 | **Aviso de privacidad + captura de correo** en la landing (`/privacidad` existe como link en vuelo, no como página). | Obligatorio (LFPDPPP) al recibir estados de cuenta; el correo es la única forma de recontactar a quien no sube un PDF ese día. | 1–2 días + revisión legal |
| 3 | **Parser dedicado de Nu** (fixtures de los 6 estados reales ya en la base; el clasificador ya lo detecta con "cajita"). Alternativa inmediata: dejar de nombrar Nu primero. | Es el banco más común del segmento y el peor leído; todo el embudo P1 depende de esto. | 3–5 días con fixtures; copy: 1 hora |
| 4 | **Fijos e ingresos etiquetados al backend** (hoy `localStorage`), y **sugerir nómina** desde `/recurring` (series `biweekly` de ingreso ≥2 ocurrencias). | Sin auth no tiene sentido; con auth es obligatorio o el usuario pierde su trabajo al cambiar de dispositivo. Convierte "Te entran $0" en una pregunta. | 3–5 días |
| 5 | **Decidir Precios**: (a) distribuir la app (EAS build, TestFlight/Internal testing, luego tiendas) o (b) sacar la tarjeta del bento y ocultar/gatear la pestaña hasta (a). | Hoy es promesa sin camino. (b) cuesta una tarde; (a) semanas más revisión de tiendas y una app cuya `index.tsx` aún dice "Hola, Alejandro". | (b) 0.5 día / (a) 2–4 semanas |
| 6 | **Transferencias**: aviso en Documentos cuando hay ≥2 bancos, corrida de `pair-transfers` tras cada subida, revisar por qué "Bitso $4,999" no y "$1.00" sí; `DIS.EFE.` como retiro. | El emparejado es bueno; falta que el usuario sepa que existe y que los bordes no lo desmientan. | 2–3 días |
| 7 | **Custodia en copy y pantalla**: dos frases (web / teléfono) y chip también para `web`. | Barato y protege el diferenciador de una acusación de marketing engañoso. | 1 día |
| 8 | **Modelo de negocio**: hoy "Hoy no cobramos" [en vuelo]. Señal de precio (p. ej. "gratis con un banco; $X/mes con varios y tickets") aunque no se cobre aún. | Sin señal de precio no se mide disposición a pagar; el tráfico de la landing se desperdicia. | decisión, 0 código |
| 9 | Attention: excluir recargas/casetas/peajes de "posible duplicado"; umbral por categoría. | Precisión sobre recall, como dice `advisor-principles.md`. | 1 día |
| 10 | Categorías: mover la fecha de posteo de Banamex crédito fuera de `description`; ampliar `merchants.ts` con lo que aparece "Sin Categoria" en los datos reales. | Primera pantalla tras subir. | 1–2 días |

---

## 7. Qué medir después

Ya existe telemetría (`lib/telemetry.ts`, `/dev/telemetria`; B añadió `app.arrive` con `from=landing`). Con auth en su sitio:

1. **Embudo**: landing view → clic Comenzar → `app.arrive from=landing` → primera subida → ReviewStatement confirmado → segunda vista abierta. Hoy el segundo paso es imposible de contar por usuario.
2. **Calidad de lectura por banco**: % de filas `is_transfer` por statement y banco (Nu hoy ≈ 90 %); % de filas "Sin Categoria"; % de statements con `account_kind = null` a los 7 días.
3. **Trabajo manual exigido**: días hasta el primer fijo pineado y hasta la primera nómina etiquetada; % de usuarios que llegan a Pronóstico con "$0".
4. **Transferencias**: pares auto vs marcados por el usuario; filas con wording de transferencia (`_TRANSFERISH`) sin flag a los 7 días.
5. **Custodia**: ratio `device`/`web` por usuario (hoy 10/15 en la única cuenta); si el teléfono es el eje, este número tiene que crecer.
6. **Attention**: tasa de descarte por tipo (`possible_duplicate` en recargas/peajes) — si supera ~30 %, apagar la regla.
7. **Precios**: tickets con `transaction_id` emparejado (hoy 0/1) y preguntas al chat con `LLM_BASE_URL` configurado.
