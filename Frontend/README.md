# Crypto MLM Frontend

Next.js + TypeScript + Tailwind CSS frontend for the Crypto MLM platform.

## Features

- 🔐 MetaMask wallet connection
- 📊 User dashboard with stats
- ✍️ Registration interface
- 💰 Re-topup functionality
- 🛡️ Admin panel (for contract owner)
- 📱 Responsive design
- 🎨 Modern UI with Tailwind CSS

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_TOKEN_ADDRESS=0xYourTokenAddress
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

3. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
npm start
```

## Components

- **Dashboard**: Shows user stats, balance, re-topup status
- **Register**: Register new users with referrer ID
- **ReTopup**: Complete re-topup to receive level income
- **AdminPanel**: Admin functions (pause, withdraw, config)
- **Navbar**: Wallet connection and network display

## Usage

1. Connect MetaMask wallet
2. Register with a referrer ID (use 1 for company)
3. Complete re-topup to receive level income
4. Monitor your dashboard for stats and earnings

## Requirements

- Node.js 16+
- MetaMask browser extension
- BNB for gas fees
- Tokens for registration/re-topup

