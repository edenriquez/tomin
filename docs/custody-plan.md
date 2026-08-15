# Custodia y transmisión — plan de arquitectura

> El teléfono es el custodio. El backend es un lector transitorio. El
> dashboard es una vista. Este documento planifica cómo llegar ahí por fases,
> sin romper lo que ya funciona y sin prometer criptografía que el producto
> no puede honrar.

## La promesa, en cuatro garantías

La palabra "custodia" se vuelve verificable cuando se descompone:

| # | Garantía | Hoy (F0) | F1 | F2 | F3 |
|---|---|---|---|---|---|
| G1 | El archivo original vive en el teléfono | ✅ (móvil) / ❌ (web sube el PDF) | ✅ siempre | ✅ | ✅ |
| G2 | El archivo nunca toca el backend | ❌ (copia transitoria, se desecha) | ✅ (solo viaja texto extraído) | ✅ (solo viajan movimientos estructurados) | ✅ |
| G3 | El contenido viaja cifrado a nivel aplicación, no solo TLS | ❌ | ✅ (sealed box al servidor) | ✅ | ✅ |
| G4 | El backend no puede leer los datos ni en memoria | ❌ | ❌ (los procesa en claro, en memoria) | ❌ | ✅ (E2EE; investigación) |

Ser explícitos sobre G4 importa: **mientras el cubo de métricas viva en el
servidor, el servidor necesita leer los movimientos**. F1–F2 protegen el
*archivo* y el *tránsito*; no prometen que el operador del backend no pueda
ver montos. Prometer E2EE antes de F3 sería marketing deshonesto.

## La costura que hace esto barato

El pipeline actual es `upload → extract → classify → parse → categorize →
persist → cube`, y **todo después de extract consume un
`ExtractedDocument`** (`application/dtos/extraction.py`: kind text|xml,
text, lines). El teléfono no reemplaza el pipeline: reemplaza *un paso*.

```
HOY:   [PDF] ──upload──▶ backend: extract → classify → parse → …
F1:    [PDF se queda] ─▶ teléfono: extract ──cifrado──▶ backend: classify → parse → …
F2:    [PDF se queda] ─▶ teléfono: extract + parse ──cifrado──▶ backend: valida → …
```

---

## F1 — "El archivo nunca sale" (el grueso del valor, ~2-3 semanas)

### Móvil (expo, esqueleto ya existente en `mobile/`)

1. **Extracción de texto on-device**:
   - PDF con capa de texto: `pdfjs-dist` (JS puro, corre en RN con polyfills)
     → `lines: string[]`.
   - PDF escaneado: reconocimiento nativo — `@react-native-ml-kit/text-recognition`
     (Android/iOS; en iOS usa Vision). Mismo output: líneas.
   - XML del SAT: es texto; se lee directo (`expo-file-system`, ya en uso).
   - El archivo original se guarda como hoy (`src/lib/storage.ts`, sin cambios).
2. **Cifrado de aplicación**: `libsodium` (`react-native-libsodium`) —
   *sealed box* (X25519 + XSalsa20-Poly1305) contra la llave pública del
   servidor, obtenida de `GET /api/ingest/key` y *pinneada* en el cliente
   tras el primer uso (TOFU + alerta si cambia). Protege contra TLS
   terminado por terceros (proxies corporativos, logs de balanceadores) y
   compromete al backend a descifrar solo en memoria.
3. **Payload** (antes de cifrar):
   ```json
   {
     "v": 1,
     "kind": "text" | "xml",
     "filename": "estado_julio.pdf",
     "content_sha256": "…",        // dedup, reemplaza al file_hash del PDF
     "lines": ["…"] | null,
     "xml": "…" | null,
     "extracted_at": "2026-08-15T…",
     "extractor": "pdfjs-4.2" | "mlkit-ios-…"   // trazabilidad de calidad OCR
   }
   ```
4. **Flujo UI**: elegir archivo → "Leyendo en tu teléfono…" (el beat de
   custodia, visible) → "Enviando cifrado…" → respuesta con resumen →
   **link al dashboard**.

### Backend

1. `GET /api/ingest/key` — llave pública X25519 del servidor (par generado y
   persistido por el contenedor; rotable, la respuesta incluye `key_id`).
2. `POST /api/ingest/extracted` — cuerpo: `{key_id, sealed: base64}`.
   Adapter descifra (libsodium `crypto_box_seal_open`) **en memoria**,
   valida el payload y llama al nuevo
   `ProcessExtractedUseCase(user_id, ExtractedDocument)` — que es
   `ProcessFileUseCase` menos el paso extract (refactor: extraer el tramo
   común `_ingest(document, file_hash)`; el hash pasa a ser
   `content_sha256` del payload para dedup).
3. El `statement` resultante marca `source: "device"` (columna nueva,
   migración) — el dashboard puede decir "custodiado en tu teléfono".
4. La respuesta reutiliza el shape actual del upload (statement + template +
   transactions_created) **más** `dashboard_url`.

### El link al dashboard

- Sin auth (hoy, single-user): `https://<web>/?statement=<id>` — la web ya
  muestra los datos; añadir highlight opcional del statement recién subido.
- Con auth (prerequisito real del producto multi-usuario): el móvil obtiene
  sesión Supabase; el link es un **magic link** de un solo uso
  (`/enter?token=…`, TTL 5 min, emitido por el backend con el JWT del
  dispositivo) que abre la web ya autenticada. El token viaja en el
  *fragment* (`#token=…`) para no quedar en logs de servidor.
- El móvil lo presenta como botón "Ver en tu dashboard" + share sheet.

### Qué NO cambia en F1

Clasificador, parsers, categorización, aliases, labels aprendidos, cubo,
web: intactos. El OCR de Tesseract del backend queda como fallback para la
ruta web (que sigue existiendo para desktop, con su honestidad actual:
"subes el archivo, lo desechamos").

---

## F2 — "Identificación local" (el deseo del usuario, con la trampa desarmada)

El riesgo conocido (docs/redesign-plan.md §8): portar los parsers a
TypeScript = **dos implementaciones sincronizadas para siempre**. La
mitigación: los templates dejan de ser código y se vuelven **datos**.

1. **Reglas portables**: cada template (Banamex, genérico, Nu cuando exista)
   se declara en JSON — anclas de clasificación, regex de línea de
   movimiento, formato de fecha, columnas — versionado en el repo y servido
   por `GET /api/ingest/templates` con `rules_version`. Python y TS ejecutan
   el mismo JSON con dos *motores* pequeños (el motor es genérico y estable;
   lo que evoluciona — los templates — vive una sola vez).
2. El teléfono clasifica y parsea localmente → envía **movimientos
   estructurados** cifrados (`{date, amount, raw_description, tx_type}` +
   `rules_version`). El backend re-valida contra las mismas reglas (defensa
   ante motores desincronizados), corre categorización/flags/aliases
   server-side (ahí vive el vocabulario aprendido del usuario) y persiste.
3. **Beneficio de custodia real**: el texto completo del estado —que
   contiene saldos, CLABEs, direcciones— ya no viaja; solo los campos que el
   producto usa.
4. Vocabulario del usuario en el dispositivo (aliases/labels) queda para
   F2.5: `GET /api/me/vocabulary` firmado, para que la identificación local
   también renombre.

## F3 — "Custodia total" (investigación, no compromiso)

E2EE de punta a punta: el backend almacena blobs cifrados con llave del
usuario, el dashboard descifra en el navegador con una llave que viaja en el
fragment del link, y **el cubo se calcula client-side** (DuckDB-WASM es
plausible dado el tamaño personal de los datos). Costo: métricas server-side
muertas, recurrencia/consejos client-side, recuperación de llaves = UX
brutal. Se decide con datos de F1/F2, no antes.

---

## Amenazas cubiertas por fase (resumen honesto)

| Amenaza | F1 | F2 | F3 |
|---|---|---|---|
| Robo/inspección del PDF en tránsito o en disco del servidor | ✅ | ✅ | ✅ |
| TLS interceptado (proxy corporativo, middlebox) | ✅ sealed box | ✅ | ✅ |
| Logs/replays del cuerpo del request | ✅ (cuerpo opaco) | ✅ | ✅ |
| Operador del backend lee movimientos | ❌ | ❌ (menos campos) | ✅ |
| Pérdida del teléfono | fuera de alcance (cifrado del SO + backup del usuario) |

## Orden de ejecución propuesto

1. **F1-backend** (1-2 días): keypair + `/api/ingest/key` +
   `/api/ingest/extracted` + `ProcessExtractedUseCase` (refactor de la
   costura) + migración `statements.source` + tests e2e con payload sellado.
2. **F1-móvil** (1-2 semanas): pdfjs + MLKit + sodium + flujo UI + link.
   Hito de demo: subir el estado de Nu real sin que el PDF salga del
   teléfono y ver las gráficas por el link.
3. **Auth + magic link** (paralelo posible): Supabase ya está en el stack.
4. **F2**: extraer el primer template a JSON (genérico), motor TS + motor
   Python contra el mismo fixture corpus; migrar Banamex; recién entonces
   encender el envío estructurado.

## Riesgos con nombre

- **Calidad del OCR móvil vs Tesseract**: MLKit suele ganar en fotos y
  perder en PDFs raster de baja resolución. Mitigación: el payload declara
  `extractor`, el backend registra tasa de parse por extractor, y la ruta
  web queda como fallback.
- **Dos motores de reglas** (F2): el corpus de fixtures compartido corre en
  CI para ambos; un template solo se activa en móvil cuando ambos motores
  producen filas idénticas sobre el corpus.
- **Rotación de llaves**: `key_id` en el payload desde el día uno; el
  servidor mantiene N llaves activas.
- **Pin TOFU**: si la llave pública cambia sin anuncio, el móvil bloquea el
  envío y lo dice — un MITM silencioso es exactamente lo que G3 promete
  impedir.
