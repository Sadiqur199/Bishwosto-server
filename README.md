# GhorKaj — Server (REST API)

Express + Mongoose + Firebase Admin API for **GhorKaj**, a household-worker directory platform
for Bangladesh.

> Status: **Phase 1 (Setup) + Phase 2 (Auth)** done. Worker/review/unlock/payment modules arrive in
> later phases.

## Stack

Node.js (ESM) · Express · Mongoose (MongoDB Atlas) · Firebase Admin SDK · helmet · CORS whitelist ·
express-rate-limit · zod.

## Requirements

- Node.js >= 18
- MongoDB Atlas connection string
- Firebase service account (Admin SDK)

## Setup

```powershell
npm install
Copy-Item .env.example .env
# fill in .env, then:
npm run dev
```

API runs at `http://localhost:5000/api`.

## Environment variables (`.env`)

| Variable                 | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `PORT`                   | API port (default `5000`)                      |
| `NODE_ENV`               | `development` / `production`                   |
| `CLIENT_URL`             | CORS whitelist (comma-separated origins)       |
| `MONGO_URI`              | MongoDB Atlas connection string                |
| `FIREBASE_PROJECT_ID`    | Firebase Admin credentials                     |
| `FIREBASE_CLIENT_EMAIL`  | Firebase Admin credentials                     |
| `FIREBASE_PRIVATE_KEY`   | Firebase Admin private key (keep the `\n`)     |
| `NID_ENCRYPTION_KEY`     | 64-char hex AES key for NID numbers (Phase 3)  |
| `CLOUDINARY_URL`         | Cloudinary for public photos (Phase 3)         |
| `PAYMENT_STORE_ID`       | SSLCommerz store id (Phase 5)                  |
| `PAYMENT_STORE_PASSWORD` | SSLCommerz store password (Phase 5)            |
| `PAYMENT_SANDBOX`        | `true` while testing (Phase 5)                 |

Get the Firebase Admin values from: Firebase Console → Project settings → **Service accounts** →
**Generate new private key**.

## Scripts

| Command         | Does                             |
| --------------- | -------------------------------- |
| `npm run dev`   | Start with nodemon (hot reload)  |
| `npm start`     | Start in production mode         |
| `npm run lint`  | ESLint                           |

## Endpoints (current)

| Method | Endpoint             | Auth           | Notes                                                          |
| ------ | -------------------- | -------------- | -------------------------------------------------------------- |
| GET    | `/api/health`        | none           | Liveness + DB/Firebase status                                  |
| POST   | `/api/auth/register` | optional token | Register (direct, or after phone OTP)                         |
| POST   | `/api/auth/login`    | none           | Phone + password → `{ customToken }` or local `{ token }`      |
| POST   | `/api/auth/sync`     | token          | Return/mildly update existing account                          |
| GET    | `/api/me`            | token          | Current user's profile                                         |

Passwords are bcrypt-hashed (`select: false`). Firebase Phone Auth has no native phone+password,
so the server verifies the password and issues a Firebase **custom token**, or a signed local JWT
when Firebase Admin is not configured.

### Phase 3 — Workers

| Method | Endpoint | Auth | Notes |
| ------ | -------- | ---- | ----- |
| GET | `/api/workers` | none | Public list + filters (never returns contact/nid) |
| GET | `/api/workers/:id` | none | Public profile (contact only for unlocked users) |
| PATCH | `/api/workers/:id/availability` | owner/agent/admin | Toggle available/busy |
| POST | `/api/agent/workers` | agent/admin | Multipart add worker (`payload` JSON + `photo`/`nidFront`/`nidBack`) |
| PUT | `/api/agent/workers/:id` | agent/admin | Update own worker |
| GET | `/api/agent/workers` | agent/admin | List own workers |
| GET/POST | `/api/worker/me` | worker/admin | Worker's own profile |
| PATCH | `/api/worker/me/availability` | worker/admin | Toggle availability |
| GET | `/api/admin/workers?status=` | admin | All workers (incl. contact + NID meta) |
| PATCH | `/api/admin/workers/:id/verify\|reject\|suspend` | admin | Approval workflow |
| GET | `/api/admin/workers/:id/nid` | admin | Signed NID image URLs (short-lived) |
| GET | `/api/files/nid/:id/:side?exp=&sig=` | signed | Private NID image stream |
| GET/PUT | `/api/admin/pricing` | admin | Pricing config |
| GET | `/api/admin/stats` | admin | Dashboard stats |
| GET | `/api/admin/audit-logs` | admin | Sensitive-action log |

**Security:** worker `contact` and `nid` use `select: false`; NID numbers are AES-256-GCM
encrypted (only last 4 digits stored in clear); NID images live in `server/uploads/nid` which is
never served statically — admins get short-lived signed URLs and every view is audit-logged.

### Seed

```bash
npm run seed
```

Creates the pricing config, a demo agent (`01711111111` / `agent123`) and 6 approved+verified
demo workers.

Response shape: `{ success, message, data }` on success and
`{ success, message, error: { code, details } }` on error.

## Security notes

- Firebase ID tokens are verified server-side with the Admin SDK.
- `helmet`, CORS whitelist, and rate limiting are enabled.
- All request bodies are validated with zod.
- **Never commit `.env`** — it is git-ignored. See `.env.example` for the required keys.
- Worker `contact`/`nid` will use `select: false` and are never returned by public APIs (Phase 3).
