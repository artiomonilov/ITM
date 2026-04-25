# resourceService

Serviciu HTTPS simplu pentru simularea resurselor `AI` si `VPS`, construit fara dependinte externe.

## Ce face

- valideaza accesul prin Basic Auth folosind credentialele stocate in SQLite
- seed-uieste automat in baza de date 2 utilizatori initiali pentru `AI` si `VPS`
- expune `POST /users` pentru inregistrarea unui utilizator nou prin body JSON, salvat criptat in SQLite
- expune `POST /resource` pentru:
  - `AI` + `resourceType=text|code|image`
  - `VPS` + returnarea unui IP disponibil din pool-ul local

## Rulare

```bash
cd resourceService
npm start
```

Serverul porneste implicit la `https://0.0.0.0:3000` si foloseste certificatul local din `resourceService/certs/`.

## Credentiale Basic Auth initiale din baza de date

- `AI`: `ai-service` / `ai-pass-2026`
- `VPS`: `vps-service` / `vps-pass-2026`

Acestea sunt create automat la initializarea tabelei `service_users`.

- `RESOURCE_SERVICE_SECRET`
- `DB_PATH`
- `PORT`
- `TLS_KEY_PATH`
- `TLS_CERT_PATH`

## Endpoint-uri

### 1. Validare serviciu

```bash
curl -k -X POST https://localhost:3000/auth/validate \
  -H "Authorization: Basic $(printf 'ai-service:ai-pass-2026' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AI"}'
```

### 2. Creare utilizator nou la AI/VPS

```bash
curl -k -X POST https://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AI","username":"student1","password":"parola123"}'
```

Credentialele utilizatorului nou sunt preluate din body si sunt salvate criptat AES-256-GCM in baza SQLite din `resourceService/data/resource-service.db`.

### 3. Cerere resursa

AI text:

```bash
curl -k -X POST https://localhost:3000/resource \
  -H "Authorization: Basic $(printf 'ai-service:ai-pass-2026' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AI","resourceType":"text"}'
```

AI code:

```bash
curl -k -X POST https://localhost:3000/resource \
  -H "Authorization: Basic $(printf 'ai-service:ai-pass-2026' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AI","resourceType":"code"}'
```

AI image:

```bash
curl -k -X POST https://localhost:3000/resource \
  -H "Authorization: Basic $(printf 'ai-service:ai-pass-2026' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"AI","resourceType":"image"}' \
  --output ai-resource.png
```

Imaginea servita este citita din `resourceService/res/test.png`, iar `Content-Type` este stabilit dupa continutul real al fisierului.

VPS IP:

```bash
curl -k -X POST https://localhost:3000/resource \
  -H "Authorization: Basic $(printf 'vps-service:vps-pass-2026' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"VPS","resourceType":"ip"}'
```

## Teste

```bash
cd resourceService
npm test
```
