# Crypto MLM Platform

A decentralized Multi-Level Marketing (MLM) platform built on BEP-20 blockchain with smart contracts, Next.js frontend, and Spring Boot backend.

## 📁 Project Structure

```
crypto-mlm/
├── Contract/          # Hardhat smart contracts
├── Frontend/          # Next.js + Tailwind CSS frontend
├── Backend/           # Spring Boot + Web3j backend
└── PROJECT_STRUCTURE.md
```

## 🎯 Features

### Direct Income
- $20 package registration
- $18 direct income to referrer
- $2 company fee

### Auto Pool
- Automatic binary tree placement
- Entry after 2nd sponsor for referrer
- BFS-based pool distribution

### Level Income (Re-Topup)
- $40 re-topup requirement
- 10-level distribution system
- Only eligible users receive income
- $36 distributed, $4 company fee

## 🚀 Quick Start

### 1. Contract Deployment

```bash
cd Contract
npm install
npx hardhat compile
npx hardhat test
```

See `Contract/README.md` for deployment instructions.

### 2. Backend Setup

```bash
cd Backend
# Configure application.properties
mvn spring-boot:run
```

See `Backend/README.md` for configuration details.

### 3. Frontend Setup

```bash
cd Frontend
npm install
# Configure .env.local
npm run dev
```

See `Frontend/README.md` for environment setup.

## 📋 Requirements

- Node.js 16+
- Java 17+
- PostgreSQL 13+
- MetaMask browser extension
- Hardhat
- Maven

## 🔐 Security Features

- OpenZeppelin contracts
- SafeERC20 for token transfers
- ReentrancyGuard protection
- Pausable contract
- Owner controls
- Event logging

## 📚 Documentation

- `Contract/SETUP_GUIDE.md` - Smart contract setup
- `Contract/AUTO_POOL_LOGIC.md` - Auto pool mechanics
- `Backend/README.md` - Backend API documentation
- `Frontend/README.md` - Frontend usage guide
- `PROJECT_STRUCTURE.md` - Complete file structure

## 🛠️ Tech Stack

**Smart Contracts:**
- Solidity ^0.8.19
- Hardhat
- OpenZeppelin

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Ethers.js v6
- React Hot Toast

**Backend:**
- Spring Boot 3
- Web3j
- PostgreSQL
- JPA/Hibernate

## 📝 License

MIT

## ⚠️ Disclaimer

This is a development project. Conduct thorough security audits before production deployment.
