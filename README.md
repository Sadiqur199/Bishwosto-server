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

| Method | Endpoint         | Auth           | Notes                                                     |
| ------ | ---------------- | -------------- | --------------------------------------------------------- |
| GET    | `/api/health`    | none           | Liveness + DB/Firebase status                             |
| POST   | `/api/auth/sync` | Firebase token | Create/fetch local user (`{ name?, area?, referredBy? }`) |
| GET    | `/api/me`        | Firebase token | Current user's profile                                    |

Response shape: `{ success, message, data }` on success and
`{ success, message, error: { code, details } }` on error.

## Security notes

- Firebase ID tokens are verified server-side with the Admin SDK.
- `helmet`, CORS whitelist, and rate limiting are enabled.
- All request bodies are validated with zod.
- **Never commit `.env`** — it is git-ignored. See `.env.example` for the required keys.
- Worker `contact`/`nid` will use `select: false` and are never returned by public APIs (Phase 3).
