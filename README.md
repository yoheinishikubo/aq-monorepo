# aq monorepo

Monorepo managed with Bun workspaces. Contains:

- `packages/contracts` — Hardhat + TypeScript contracts, scripts, tests (runs with Bun)
- `packages/web` — Next.js app targeting Cloudflare (runs with Bun)

## Contracts

- Project‑Original Contracts: The address on Kairos
  - `packages/contracts/contracts/ERC721AQ.sol` : `Deployed by FactoryAQMint`
  - `packages/contracts/contracts/ERC721AQVault.sol`: `Deployed by FactoryAQMint`
  - `packages/contracts/contracts/FactoryAQMint.sol`: `0x9687152907aaCcC170B236c043Fffe77f4807fd4`
  - `packages/contracts/contracts/Metadata.sol` : `0x47ab430b6B5094b6542E9626AC7921159Bd3Bdf8`

## Prerequisites

- Bun 1.2.22+ (`bun --version`)
- Node 18+ (for tool compatibility)

## Quick Start

1. Install deps at the repo root

```bash
bun install
```

2. Start local blockchain (Hardhat devnet)

```bash
bun run devnet
```

3. In another terminal, deploy contracts to the local devnet

```bash
bun run deploy:contracts
```

4. Run the web app in dev mode

```bash
bun run dev
```

## Workspace Scripts (root)

- `bun run build` — runs build in all workspaces
- `bun run test` — runs tests in all workspaces
- `bun run dev` — runs `packages/web` dev server
- `bun run lint` — runs lint in `packages/web`
- `bun run devnet` — runs Hardhat node in `packages/contracts`
- `bun run deploy:contracts` — deploys contracts to local devnet
- `bun run typechain` — generates TypeChain types for contracts

## Contracts Package

Path: `packages/contracts`

- `bun run devnet` — Hardhat node
- `bun run build` — hardhat compile
- `bun run test` — hardhat tests
- `bun run deploy` — sequential local deployments (Uniswap + tokens + pools + demo)
- `bun run deploy:hardhat` — single entry deploy script (`scripts/deploy_all.ts`)
- `bun run typechain` — regenerate types

Environment:

- Copy `.env.example` (if present) to `.env` and set `PRIVATE_KEY`, `KAIROS_RPC_URL` as needed.

## Web Package

Path: `packages/web`

- `bun run dev` — Next.js dev server
- `bun run build` — Next.js build
- `bun run start` — Next.js start (after build)
- `bun run preview` — OpenNext Cloudflare preview
- `bun run deploy` — OpenNext Cloudflare deploy

Environment:

- Set required public/private env vars (see `packages/web/.env` and scripts `env`, `env:del`).
- Wrangler is used for Cloudflare; ensure you’re logged in (`wrangler login`).

## Repo Structure

```
.
├─ package.json          # Bun workspaces config and root scripts
└─ packages/
   ├─ contracts/        # Hardhat project (Bun-friendly)
   └─ web/              # Next.js app for Cloudflare
```

## Notes & Troubleshooting

- If `bun install` loops, ensure the root `package.json` does not define an `install` script that calls `bun install`.
- If private GitHub packages are required, configure auth for the `@yoheinishikubo` scope (see `packages/contracts/.npmrc`) and use a valid token in your environment.
- Some versions may need alignment (e.g., Next.js semver). If you hit resolution errors, update the affected version ranges.

## Contract Origins & Credits

This repository includes original work and code that uses or adapts well‑known open source components. File‑level SPDX headers indicate the effective license for each file. See `LICENSE.md` for the repository’s default license policy and exceptions.

- OpenZeppelin Contracts (MIT)

  - Uses multiple upgradeable modules throughout (ERC721, AccessControl, UUPS, Pausable, Enumerable, ReentrancyGuard, EIP712, ERC1967, etc.).
  - `packages/contracts/contracts/BeaconProxy.sol` is based on OpenZeppelin’s `proxy/beacon/BeaconProxy.sol` (v5.0.0) and retains its SPDX header.
  - `packages/contracts/contracts/test/TestProxy.sol` wraps OZ `ERC1967Proxy` for tests.

- Uniswap V3 (GPL-2.0-or-later per upstream periphery)

  - Interfaces imported from `@uniswap/v3-periphery` are used by `packages/contracts/contracts/ERC721AQ.sol` for swaps (`ISwapRouter`, `IQuoter`).
  - A minimal `IUniswapV3Factory` interface is declared locally for pool existence checks in `ERC721AQ.sol`.

- Aave V3 (license per upstream repository)

  - `IPool` interface is imported from `@aave/core-v3` and used by `packages/contracts/contracts/FactoryAQMint.sol` and `packages/contracts/contracts/ERC721AQVault.sol` for supply/withdraw flows.
  - Local mocks in `packages/contracts/contracts/aave` are purpose‑built for tests and not copied from upstream.

- SSTORE2 (MIT, original by 0xSequence)

  - `packages/contracts/contracts/Metadata.sol` uses `@yoheinishikubo/sstore2` (fork of 0xSequence’s SSTORE2) to store metadata chunks efficiently.

- Solidity DateTime
  - `packages/contracts/contracts/Utils.sol` uses `@quant-finance/solidity-datetime` for timestamp → date/time conversion. License as per that package’s repository.

Notes

- Respect each file’s SPDX identifier; it takes precedence for that file.
- The contracts package (`packages/contracts/package.json`) declares `license: MIT`, but individual files may specify a different SPDX header that governs that file.
