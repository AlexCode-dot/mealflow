# Hetzner Deployment Runbook – MealFlow

Move the two backend services off Render onto a single Hetzner VPS, behind
Caddy (auto-TLS), with MongoDB staying on Atlas. The published mobile app is
hardcoded to the `*.onrender.com` URLs, so this migration requires a **custom
domain + a new app release**, and Render must keep running until old installs
age out. See §7 for the cutover.

Files this runbook uses (all in `infra/`):
- `docker-compose.prod.yml` — the two services + Caddy
- `Caddyfile` — reverse proxy for `api.<domain>` and `identity.<domain>`
- `.env.prod.example` — template for all secrets/config

---

## 1. Provision the server

- Hetzner Cloud → create a **CX22** (2 vCPU / 4 GB / 40 GB, ~€4.50/mo). 4 GB
  comfortably runs both JVMs + Caddy. If on-box image builds are slow, resize to
  CX32 (8 GB) temporarily, or build via CI and push images.
- OS: Ubuntu 24.04.
- Add your SSH key during creation.

```sh
ssh root@<SERVER_IP>

# Docker Engine + compose plugin
curl -fsSL https://get.docker.com | sh

# Firewall: SSH + HTTP + HTTPS only (Atlas is reached outbound, no inbound rule needed)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 2. Get the code onto the box

```sh
# HTTPS clone for a public repo; for a private repo add a read-only deploy key first.
git clone https://github.com/AlexCode-dot/mealflow.git /opt/mealflow
cd /opt/mealflow/infra
```

## 3. DNS

Point two A-records at the server (do this early — Let's Encrypt validates over
HTTP, so DNS must resolve before step 6):

| Record | Type | Value |
|---|---|---|
| `api.<domain>` | A | `<SERVER_IP>` |
| `identity.<domain>` | A | `<SERVER_IP>` |

## 4. Atlas network access

Atlas → **Network Access** → add the server's public IP (`<SERVER_IP>/32`).
Grab the two connection strings (identity-db and app-db) for the next step.

## 5. JWT signing keys  ⚠️ read this carefully

The identity service signs access tokens with an RSA key pair. **Reuse the keys
that are already in production** — if you generate new ones, every currently
valid access token fails verification until the client refreshes (a ≤15-min blip
since refresh tokens are server-side and unaffected, but avoidable).

```sh
mkdir -p /opt/mealflow/infra/secrets/identity
```

- **Preferred:** copy the existing `private.pem` + `public.pem` from your Render
  secret files (or wherever the current prod keys live) into
  `infra/secrets/identity/`.
- **Only if you have no existing keys** (fresh start — logs current users out):

  ```sh
  cd /opt/mealflow/infra/secrets/identity
  openssl genpkey -algorithm RSA -pkcs8 -out private.pem -pkeyopt rsa_keygen_bits:2048
  openssl pkey -in private.pem -pubout -out public.pem
  cd /opt/mealflow/infra
  ```

The compose file mounts this directory read-only at `/app/.secrets`.

## 6. Configure and launch

```sh
cp .env.prod.example .env.prod
nano .env.prod          # fill in DOMAIN, Atlas URIs, Resend, ImageKit, Anthropic, WEB_ORIGIN

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

First build pulls Temurin + builds both Spring Boot jars — a few minutes. Watch:

```sh
docker compose -f docker-compose.prod.yml logs -f
```

## 7. Verify

```sh
curl https://identity.<domain>/healthz
curl https://app-api.<domain>/actuator/health   # → {"status":"UP"}  (path: api.<domain>/actuator/health)
```

Both should return TLS-valid responses (Caddy issued certs automatically). If a
cert fails, re-check the A-records resolve and ports 80/443 are open.

## 8. Cutover (the part that needs a new app release)

Because the live app is compiled against `*.onrender.com`, you can't just flip
DNS. Do this:

1. Update `apps/expo-app/.env.production.local` **and** the EAS *production*
   environment variables (eas.json uses `environment: production`, which pulls
   from EAS cloud — the local file alone won't change the cloud build):
   ```env
   EXPO_PUBLIC_IDENTITY_BASE_URL=https://identity.<domain>
   EXPO_PUBLIC_APP_API_BASE_URL=https://api.<domain>
   ```
2. Build + submit a new app version:
   ```sh
   cd apps/expo-app
   eas build --profile production --platform all
   eas submit --profile production --platform all
   ```
3. **Keep Render running.** Every already-installed app still calls
   onrender.com. Retire Render only once that traffic is negligible (watch
   Render's request metrics). Consider a minimum-supported-version gate in the
   app to speed adoption.
4. When Render traffic ~ zero → delete the two Render services. Savings start
   here.

## 9. Day-2 operations

```sh
# Redeploy (git pull + rebuild + restart in one step)
/opt/mealflow/infra/deploy.sh

# Logs / status / restart
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app-api
docker compose -f docker-compose.prod.yml restart app-api
```

Notes:
- **Backups:** Atlas handles DB backups. The only state on the VPS is the JWT
  keys in `infra/secrets/` — back that directory up off-box.
- **TLS:** Caddy auto-renews; nothing to do.
- **Single point of failure:** one box. Acceptable at this scale; if you outgrow
  it, the path forward is a second box + load balancer, or back to a PaaS — and
  since the app now uses your own domain, that future move is just DNS.
