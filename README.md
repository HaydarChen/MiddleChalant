## MiddleChalant Escrow – Frontend

TypeScript Next.js (App Router) frontend for the MiddleChalant escrow dApp, with a dark glassmorphism dashboard UI and crypto‑style marketing landing page.

### Requirements

- Node.js 20+
- npm (or another Node package manager)
- Environment variable:
  - **NEXT_PUBLIC_API_URL** – base URL for the backend API (e.g. `http://localhost:4000`).

### Install dependencies

From the project root:

```bash
cd frontend
npm install
```

### Run locally (without Docker)

From the `frontend` directory:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Run with Docker

From the project root (where `docker-compose.yml` lives):

```bash
export NEXT_PUBLIC_API_URL="http://localhost:4000"   # or your backend URL
docker compose up --build
```

The frontend will be available at `http://localhost:3000`.

The compose file mounts the local `frontend` folder into the container, so editing code on your machine will hot‑reload the Next.js dev server.


