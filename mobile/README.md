# Tomin Mobile (Expo)

React Native app (Expo Router). The phone is the durable source of truth for
raw bank statements / SAT XML: files are copied into the app's private storage
and only a transient copy is uploaded to the backend for parsing.

## Run

```bash
cd mobile
npm install
npx expo start
```

Set the backend URL in `app.json` under `expo.extra.apiUrl` (defaults to
`http://localhost:8000`). On a physical device use your machine's LAN IP.

## Structure

```
app/            # expo-router screens
  _layout.tsx   # navigation stack
  index.tsx     # dashboard (Resumen)
  upload.tsx    # pick + store on-device + process
  transactions.tsx
src/lib/
  api.ts        # backend client
  storage.ts    # on-device statement store (source of truth)
```
