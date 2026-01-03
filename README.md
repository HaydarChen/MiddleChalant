# MiddleChalant Escrow

A decentralized escrow platform for secure peer-to-peer USDT transactions on Ethereum (Sepolia testnet).

## Overview

MiddleChalant Escrow enables two parties to safely exchange USDT through a smart contract-based escrow system. A sender deposits funds into the escrow, and upon mutual agreement, the funds are released to the receiver.

### Key Features

- **Decentralized Escrow**: Smart contract holds funds securely until both parties confirm
- **Real-time Chat**: Built-in messaging between sender and receiver
- **Bot-guided Flow**: Automated bot guides users through each step
- **Multi-chain Support**: Designed for Ethereum Sepolia (testnet) with extensibility for other chains
- **1% Fee**: Platform fee with flexible payment options (sender, receiver, or split)

## Architecture

```
├── frontend/          # Next.js 14 (App Router) with TypeScript
├── backend-hono/      # Hono API server with PostgreSQL + Drizzle ORM
└── smartcontract/     # Solidity contracts (Hardhat)
```

## Contract Addresses (Sepolia Testnet)

| Contract     | Address                                      |
|--------------|----------------------------------------------|
| MockUSDT     | `0xB7d8Cf702A9e2bAaA074225cF5b96B72F4a8ECF5` |
| MasterEscrow | `0x0aaB270a98Be97b6D11c78A2653737Ce32a55Bb4` |

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- MetaMask wallet with Sepolia ETH (for gas)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd middlechalant

# Install all dependencies
cd frontend && npm install && cd ..
cd backend-hono && npm install && cd ..
cd smartcontract && npm install && cd ..
```

### 2. Environment Setup

**Backend (`backend-hono/.env`):**
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/middlechalant

# Server
PORT=8787

# BetterAuth
BETTER_AUTH_SECRET=your-secret-key-change-in-production
BETTER_AUTH_URL=http://localhost:8787

# Blockchain Configuration
MOCK_MODE=false

# Bot wallet private key (admin wallet for contract operations)
# This wallet must be the owner of the MasterEscrow contract
BOT_PRIVATE_KEY=your_bot_wallet_private_key

# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# MasterEscrow Contract Addresses (per chain)
MASTER_ESCROW_SEPOLIA=0x0aaB270a98Be97b6D11c78A2653737Ce32a55Bb4
MASTER_ESCROW_BSC_TESTNET=
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend-hono && npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

Open http://localhost:3000 in your browser.

## Escrow Flow

1. **Create Room**: Sender creates a new escrow room
2. **Join Room**: Receiver joins using 6-character room code
3. **Select Roles**: Both parties confirm their roles (Sender/Receiver)
4. **Agree Amount**: Sender proposes amount, both confirm
5. **Select Fee Payer**: Choose who pays the 1% fee
6. **Deposit**: Sender transfers USDT to escrow contract via MetaMask
7. **Check Deposit**: Bot verifies deposit on blockchain
8. **Release**: Sender initiates release, Receiver confirms
9. **Complete**: Funds transferred to Receiver's wallet

## Testing on Sepolia

### Get Test USDT

```bash
cd smartcontract
npx hardhat run scripts/mintUSDT.ts --network sepolia
```

This mints 100 test USDT to the configured wallet.

### Add USDT to MetaMask

1. Open MetaMask → Sepolia network
2. Import token: `0xB7d8Cf702A9e2bAaA074225cF5b96B72F4a8ECF5`
3. Symbol: USDT, Decimals: 6

### Get Sepolia ETH (for gas)

- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/rooms` | List user's rooms |
| POST | `/api/rooms` | Create new room |
| POST | `/api/rooms/:id/join` | Join room with code |
| GET | `/api/rooms/:id/messages` | Get room messages |
| POST | `/api/rooms/:id/actions/*` | Bot actions (role, amount, fee, deposit, release) |

## Smart Contracts

### MasterEscrow

Central escrow contract that:
- Creates deals with unique IDs
- Holds USDT deposits
- Releases funds to receiver on confirmation
- Refunds sender on cancellation
- Collects 1% platform fee

### MockUSDT

ERC-20 token for testing (6 decimals, open mint function).

## Development

### Database Migrations

```bash
cd backend-hono
npm run db:generate  # Generate migration
npm run db:migrate   # Apply migration
```

### Deploy Contracts

```bash
cd smartcontract
npx hardhat run scripts/deployAll.ts --network sepolia
```

## Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8787

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Hono, Drizzle ORM, PostgreSQL
- **Blockchain**: Solidity 0.8.24, Hardhat, Viem
- **Networks**: Ethereum Sepolia (testnet)

## License

MIT
