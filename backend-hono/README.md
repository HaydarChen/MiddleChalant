# backend-hono

Hono + Postgres + Drizzle backend for MiddleChalant Escrow.

## Requirements
- Node 20+
- Postgres 16+
- pnpm/npm

## Env
See `.env.example`.

Key vars:
- `DATABASE_URL`
- `PORT` (default 8787)
- `RPC_URL_SEPOLIA`, `RPC_URL_BSC_TESTNET`
- `FACTORY_ADDRESS_SEPOLIA`, `FACTORY_ADDRESS_BSC_TESTNET`

## Scripts
- `npm run dev` — start API (Hono) with tsx
- `npm run build && npm start` — production build (tsup)
- `npm run db:generate` — drizzle-kit generate
- `npm run db:migrate` — drizzle-kit migrate

## API summary
- `GET /health`
- `POST /api/auth/nonce` — SIWE nonce
- `POST /api/auth/verify` — SIWE verify, sets cookie sid
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/rooms`
- `POST /api/rooms` { name, chainId, tokenAddress, amount, buyerAddress?, sellerAddress? }
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/join` { address, role }
- `GET /api/rooms/:roomId/messages?limit=&cursor=`
- `POST /api/rooms/:roomId/messages` { text } (requires SIWE session)
- `GET /api/escrows/by-address?address=0x...` (placeholder)

## WebSocket
- `ws://host/ws/rooms/:roomId` — broadcast-only chat updates (subscribe per room).

## Indexer (placeholder)
- Polls chain logs for escrow events and updates DB rows for status (best-effort example in `src/indexer`).

## Docker
```
docker build -t backend-hono .
docker run -p 8787:8787 --env-file .env backend-hono
```

## Notes
- This is a minimal, dev-friendly implementation; add auth hardening and rate limiting before prod.
- Replace placeholder factory addresses with real deployments.

