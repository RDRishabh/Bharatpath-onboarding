# How it all connects — frontend, backend, and getting to production

The companion to [deployment-and-local-dev.md](deployment-and-local-dev.md).
That one explains where the backend runs. This one explains how the four
clients reach it, and what actually happens between "it works on my laptop"
and "a candidate in Nagpur can use it".

---

## 1. The whole picture, on one page

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                          THE INTERNET                            │
   └───┬──────────────┬───────────────┬───────────────┬───────────────┘
       │              │               │               │
  Candidate app   Employer        College          Admin
  (Android/iOS)   console         console          console
   native code    (browser)       (browser)        (browser)
       │              │               │               │
       │         ┌────┴───────────────┴───────────────┴────┐
       │         │  CloudFront + S3                        │
       │         │  Serves HTML/JS/CSS. Static files only. │
       │         │  employer.bharatpath.com etc.           │
       │         │  ** KNOWS NOTHING ABOUT THE DATABASE ** │
       │         └────┬───────────────┬───────────────┬────┘
       │              │               │               │
       │              │   the JS in the browser then calls:
       │              ▼               ▼               ▼
       └──────────────┴───────────────┴───────────────┘
                             │
                             │  HTTPS  api.bharatpath.com
                             ▼
              ┌──────────────────────────────┐
              │   ALB   (public subnet)      │
              └──────────────┬───────────────┘
                             │
              ┌──────────────▼───────────────┐
              │   ECS Fargate                │   private subnet
              │   ├── api    (uvicorn)       │   ← our container
              │   └── worker (celery)        │   ← same image!
              └──────────────┬───────────────┘
                             │
        ┌────────────┬───────┴────┬────────────┐
        ▼            ▼            ▼            ▼
      RDS        ElastiCache     SQS          S3
    Postgres       Redis
```

**The single most important thing to notice:** the frontend is served from one
place and the API lives somewhere else entirely. They are two separate
deployments that only ever talk over HTTPS. The browser downloads JavaScript
from CloudFront, and *that JavaScript* then makes calls to the API.

The frontend never touches the database. It cannot — it has no credentials and
no network path. Everything it knows, it got from an API response.

---

## 2. "Is the same container really shipped?"

Yes. Literally the same bytes.

```
your laptop            CI                       production
───────────            ──                       ──────────
docker build   →   docker build           →   ECR stores it
(to try it)        ONE image                     │
                   tagged a3f9c21                ▼
                        │                    ECS pulls a3f9c21
                        └── tests run           and runs it
                            against it
```

Nothing is rebuilt for production. The image that passed CI **is** the image
that runs. If it were rebuilt, a dependency could resolve to a different
version and you would be shipping something no test ever saw.

What differs between environments is **only the environment variables**, which
arrive at container start. Same code, different config. That is the entire
mechanism, and it is why "works on my machine" mostly stops being a thing.

### ECS or EKS?

You mentioned both. The honest answer for this project:

| | ECS Fargate | EKS (Kubernetes) |
|---|---|---|
| What it is | AWS's own container runner | Managed Kubernetes |
| Servers to manage | **None** | Node groups, upgrades, add-ons |
| Learning curve | A day | Weeks, genuinely |
| Good when | A handful of services | Many teams, many services, portability matters |
| Needs | Nothing special | Usually someone whose job is Kubernetes |

**Use ECS Fargate here.** One API service plus workers, one backend developer.
EKS would add a whole discipline to learn for capability this project will not
use. Companies do choose EKS — when they have twenty services and a platform
team. That is not this.

---

## 3. How the frontend is deployed — it is NOT a container

This surprises people coming from App Service, where you deploy the whole app
as one unit.

A React/Vue/Next SPA compiles down to **static files**: `index.html`, some
`.js`, some `.css`, images. Those files need a web server, not an application
server.

```bash
npm run build          # produces dist/ or .next/ or build/
aws s3 sync dist/ s3://bharatpath-employer-console/
aws cloudfront create-invalidation --paths "/*"   # clear the CDN cache
```

That is the entire deploy. **No container, no ECS, no scaling** — S3 serves the
files and CloudFront caches them at edge locations near users. It costs a few
dollars a month and handles any traffic you will ever have.

> **The exception:** Next.js with server-side rendering *does* need a running
> Node process, and then it goes in a container like the backend, or on
> Vercel/Amplify. If your frontend developer picks plain React or Vite, the
> static path above is right. Worth agreeing early, because it changes the
> infrastructure.

**The mobile app is different again.** It compiles to `.apk` / `.ipa` files
distributed through the Play Store and App Store. There is nothing to deploy —
users install it. Which has one consequence worth planning for: **you cannot
force an update.** Old app versions keep calling your API for months, so the
API must not break its contract. That is what `/api/v1` in the path is for.

---

## 4. How the frontend finds the API

The frontend needs a URL to call. It gets **baked in at build time**:

```ts
// employer-console/src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL;   // Vite
// or process.env.NEXT_PUBLIC_API_URL           // Next.js

export async function getJobs() {
  const res = await fetch(`${API_URL}/api/v1/employer/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
```

| Environment | `VITE_API_URL` |
|---|---|
| Local | `http://localhost:8000` |
| Dev | `https://api-dev.bharatpath.com` |
| Production | `https://api.bharatpath.com` |

**The gotcha that catches everyone once:** these are compiled *into* the
JavaScript bundle. They are not read at runtime. So you need a separate build
per environment, and **anything in a frontend env var is public** — it ships in
a file anyone can read. Never put a secret in one. API keys, database
passwords, signing secrets: backend only, always.

---

## 5. CORS — the thing that will break on day one

Your frontend is on `employer.bharatpath.com`. Your API is on
`api.bharatpath.com`. **Different origins.** Browsers block cross-origin
requests by default, and they block them *before the request leaves the
machine*, so your backend logs show nothing at all.

The error looks like this, and it is misleading:

```
Access to fetch at 'https://api.bharatpath.com/api/v1/employer/jobs'
from origin 'https://employer.bharatpath.com' has been blocked by CORS policy
```

It reads like a network failure. It is a permissions handshake.

**How it works.** For anything beyond a simple GET, the browser first sends an
`OPTIONS` request asking permission:

```
    Browser                              API
       │                                  │
       │  OPTIONS /api/v1/employer/jobs   │   "may I? I want to send
       │  Origin: employer.bharatpath.com │    Authorization and POST"
       │  Access-Control-Request-Method: POST
       ├─────────────────────────────────▶│
       │                                  │
       │  200 OK                          │   "yes, that origin is allowed"
       │  Access-Control-Allow-Origin: …  │
       │  Access-Control-Allow-Headers: authorization, …
       │◀─────────────────────────────────┤
       │                                  │
       │  POST /api/v1/employer/jobs      │   only now does the real
       │  Authorization: Bearer …         │   request happen
       ├─────────────────────────────────▶│
```

**This is configured in `app/main.py` and set per environment** via
`CORS_ALLOWED_ORIGINS`. Four things it gets right, each a common mistake:

1. **`Authorization` is in `allow_headers`.** Forget it and unauthenticated
   calls work while authenticated ones fail — which looks exactly like an auth
   bug and wastes an afternoon.
2. **Never `allow_origins=["*"]`.** With credentials in play browsers refuse
   the wildcard outright, and it is a genuine hole besides.
3. **`X-Request-ID` is in `expose_headers`.** Browsers hide response headers
   from JavaScript unless listed, so without this a user cannot quote the
   correlation id in a bug report.
4. **`max_age=600`** caches the preflight, so `OPTIONS` is not sent before
   every single call.

**The mobile app is not affected by any of this.** CORS is purely a browser
mechanism; native HTTP clients ignore it entirely. So "it works on mobile but
not on web" almost always means CORS.

---

## 6. How auth flows between them

```
  1. User enters phone number in the app
                │
  2. App calls  POST /api/v1/auth/otp/start
                │
  3. Backend → Cognito → Twilio Verify sends the SMS
                │
  4. User types the code
                │
  5. App calls  POST /api/v1/auth/otp/verify
                │
  6. Cognito returns a JWT (access token + refresh token)
                │
  7. App stores it and sends it on every later call:
                     Authorization: Bearer eyJhbGci...
                │
  8. Backend verifies the signature against Cognito's public keys (JWKS),
     then reads role and tenant from OUR memberships table
```

**Step 8 is the one worth understanding.** The token proves *who you are*. It
does **not** decide *what you can do* — that comes from our database on every
request, cached in Redis for 60 seconds.

Why bother, when the token could carry the role? Because tokens go stale. If an
employer removes a recruiter, a role baked into a token stays valid until it
expires — an access revocation that does not take effect. A 60-second cache on
a database read costs microseconds and revokes in seconds.

**Where the token lives on the client:**

| | Storage | Why |
|---|---|---|
| Web | Access token in memory; refresh token in an `httpOnly` cookie | `localStorage` is readable by any injected script, so an XSS becomes a stolen session |
| Mobile | Keychain (iOS) / EncryptedSharedPreferences (Android) | OS-level protection |

---

## 7. Contract-first, so the teams do not block each other

Four client teams and one backend developer would normally mean everyone waits
for the backend. The fix is to publish the contract before the implementation:

```
     Backend                                 Frontend
        │                                        │
   defines Pydantic schemas                      │
        │                                        │
   CI exports openapi.json  ────────────────────▶│
        │                                   generates a typed client
   (endpoints still stubs)                       │
        │                                   builds screens against it
   fills in the logic                            │
        │                                        │
        └──────── both meet at integration ──────┘
```

`openapi.json` is exported on every merge to `main` — it is a **deliverable**,
not a side effect. Frontend teams generate typed clients from it:

```bash
npx openapi-typescript openapi.json -o src/api/types.ts
```

Which means TypeScript catches a renamed field at compile time rather than a
user finding it in production. **This is why Day 2 published the schema with
stub endpoints** — so the frontend can start now rather than in three weeks.

---

## 8. Running the whole thing locally

Two terminals, and no AWS account:

```bash
# Terminal 1 — backend
cd backend
docker compose up -d              # postgres, redis, localstack, mailhog
uvicorn app.main:app --reload     # → http://localhost:8000

# Terminal 2 — frontend
cd employer-console
npm run dev                       # → http://localhost:3000
```

`.env.example` already allows `localhost:3000`, `3001`, `3002` and `5173`
through CORS, so this works with no extra configuration.

```
  localhost:3000  ──── fetch ────▶  localhost:8000  ──▶  localhost:5432
  (frontend dev)                     (backend)            (Docker Postgres)
```

Both developers run the entire stack on their own machine, against throwaway
data, offline. Nobody is waiting on a shared environment and nobody can break
anyone else's work.

---

## 9. Environments end to end

| | Local | Dev | Production |
|---|---|---|---|
| Frontend | `localhost:3000` | `employer-dev.bharatpath.com` | `employer.bharatpath.com` |
| API | `localhost:8000` | `api-dev.bharatpath.com` | `api.bharatpath.com` |
| Frontend hosting | Vite dev server | S3 + CloudFront | S3 + CloudFront |
| Backend hosting | uvicorn | ECS Fargate | ECS Fargate (multi-AZ) |
| Database | Docker container | RDS (small) | RDS Multi-AZ |
| Deployed by | nobody | merge to `main` | merge to `main`, gated |
| Data | Fake | Fake | **Real people** |

---

## 10. What a typical day actually looks like

Not theory — the loop most teams settle into:

1. `git pull`, `docker compose up -d`, `alembic upgrade head`
2. Write code. Save. `--reload` restarts uvicorn in about a second.
3. Try it in Swagger at `localhost:8000/docs`, or from the frontend on `:3000`.
4. `pytest` locally before pushing — CI is a safety net, not a first check.
5. Push a branch, open a PR. CI runs lint, types, boundaries, invariants, tests.
6. Someone reviews. Merge to `main`.
7. CI builds the image, pushes to ECR, updates the ECS service.
8. ECS starts new tasks, waits for `/health/ready`, drains the old ones.
9. Watch CloudWatch for five minutes. If something is wrong, redeploy the
   previous image tag — seconds, and it always works, because the image is
   immutable.

**The database is the exception to all of this.** Code rolls back in seconds; a
migration that dropped a column does not. Which is why migrations here are
additive, one per PR, never edited after merge — and why destructive changes
get split across two deploys (add the new column, ship code using it, remove
the old one later) rather than done in one.

---

## 11. Still to be decided

None of this is built yet, and two of these need the frontend developer in the
room:

- **Frontend framework and rendering.** Plain React/Vite (static → S3) or
  Next.js with SSR (needs a container)? Changes the infrastructure.
- **Domains.** `api.bharatpath.com`, `employer.…`, `college.…`, `admin.…` — the
  domain is not registered yet (`resources-needed.md` §5).
- **Who owns the frontend deploy pipeline.** The backend CI here is
  path-filtered to `backend/**`, so a sibling `frontend-ci.yml` can be added
  without the two interfering.
- **Everything in `resources-needed.md` §12**, where every box is still
  unticked.
