# Uniswap V3 + Aave V3 (USDT-only) Mock

Local Uniswap V3 stack with four ERC20 tokens (USDT 6d, TKA/TKB/TKC 18d), pools at 0.3% fee, seeded liquidity, and demo swaps. Optionally includes a minimal Aave V3 mock pool for USDT-only (aUSDT 1:1), plus a helper to fund a recipient with 2,000 units of each token. Uses Bun as the package runner.

## Important Notes

- All tokens in this repo, including `USDT`, are mock tokens and are not the official versions.
- Ensure the deploy wallet holds at least 1,000 KAIA to successfully run deployments.

## Prereqs

- Node 18+
- Bun 1.1+

## Install

```bash
bun add -d hardhat @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-chai-matchers typescript ts-node tsconfig-paths typechain @typechain/hardhat @typechain/ethers-v6 chai @types/chai mocha @types/mocha @types/node
bun add ethers @openzeppelin/contracts @uniswap/v3-core @uniswap/v3-periphery
```

## .env

- Auto-loaded from the project root via `dotenv` (see `hardhat.config.ts`).
- Keys:
  - `PRIVATE_KEY`: hex private key for deployments (no quotes). Required for non-local networks like `kairos`.
  - `KAIROS_RPC_URL`: optional RPC URL override for Kairos.
  - `FUND_TO`: recipient for `scripts/06_fund_recipient.ts` and the consolidated deploy.
  - `SKIP_AAVE`: set to `1` to skip Aave mock steps in `deploy_all.ts`.
  - `SKIP_KAIA`: set to `1` to skip KAIA/USDT pool creation in pool/liquidity scripts and `deploy_all.ts`.
- `.env` is gitignored; do not commit secrets.

Example `.env`:

```ini
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
FUND_TO=0xYOUR_ADDRESS
# Optional overrides
# KAIROS_RPC_URL=https://public-en-kairos.node.kaia.io
# SKIP_AAVE=1
# SKIP_KAIA=1
```

## Usage

- Start local node: `bun run devnet`
- In another terminal, deploy + seed Uniswap + tokens + pools + demo swaps: `bun run deploy`
- Or run the consolidated flow (includes optional Aave + funding step): `bun run deploy:hardhat`
- Optional: deploy Aave USDT mock then supply 1 USDT (see below)
- Run tests: `bun run test`
 - Skip KAIA/USDT pool: append `-- --skip-kaia` to the script command or set `SKIP_KAIA=1`.

Deployed addresses and pool info are written to `deployments/local.json` (when using `--network localhost`). When running on another network (e.g. `--network kairos`), they are written to `deployments/<network>.json` (e.g. `deployments/kairos.json`).

## What gets deployed

- WETH9Mock (local wrapper)
- UniswapV3Factory
- NonfungiblePositionManager (descriptor set to zero address)
- SwapRouter
- Tokens: USDT(6), TKA(18), TKB(18), TKC(18)
- Pools: USDT/TKA 3000, USDT/TKB 3000, USDT/TKC 3000, initialized at 1:1 considering decimals

Consolidated flow extras

- Optional: MockAaveV3Pool + aUSDT
- Post-deploy: transfer 2,000 units of each token to a recipient.

### Optional: Aave V3 USDT Mock

- MockAaveV3Pool (USDT-only)
- aUSDT (1:1 aToken with 6 decimals)

Deploy the Aave mock after tokens:

```bash
bunx hardhat run --network localhost scripts/04_deploy_aave_usdt.ts
# Optional demo: approve and supply 1 USDT
bunx hardhat run --network localhost scripts/05_demo_aave_supply.ts
```

The pool address is stored under `aavePool` and aToken under `aTokens.aUSDT` in `deployments/<network>.json`.

Notes

- Only USDT is supported. `supply(asset, amount, onBehalfOf, referralCode)` and `withdraw(asset, amount, to)` revert for unsupported assets.
- No interest logic; aUSDT mints/burns 1:1 with USDT.
- Functions mirror Aave V3 IPool shapes for ease of integration in local tests.

### Funding Helper

- Script: `scripts/06_fund_recipient.ts`
- Transfers 2,000 units of each deployed token (USDT/TKA/TKB/TKC) from the deployer to a recipient.
- Define the recipient with env `FUND_TO`.

Run it directly:

```bash
bunx hardhat run --network localhost scripts/06_fund_recipient.ts
# Or override recipient
FUND_TO=0xYourAddress bunx hardhat run --network localhost scripts/06_fund_recipient.ts
```

In the consolidated flow (`deploy_all.ts`), this runs automatically at the end. You can also skip the Aave step with `SKIP_AAVE=1`:

```bash
# Full flow
bun run deploy:hardhat
# Skip Aave; still funds recipient
SKIP_AAVE=1 bun run deploy:hardhat
# Set funding recipient in the consolidated flow
FUND_TO=0xYourAddress bun run deploy:hardhat
# Omit the KAIA/USDT pool creation
bunx hardhat run --network localhost scripts/02_create_pools_and_liquidity.ts -- --skip-kaia
SKIP_KAIA=1 bunx hardhat run --network localhost scripts/deploy_all.ts
```

## Price encoding note

For 1:1 nominal across different decimals, we set P = 10^(d1-d0). We compute `sqrtPriceX96` using integer math: `sqrtPriceX96 = floor(sqrt((n1<<192)/n0))` where `n1 = parseUnits("1", d1)`, `n0 = parseUnits("1", d0)`.

## Troubleshooting

- If pools don’t initialize, ensure token ordering lexicographically (token0 < token1) and that approvals are set for PositionManager and Router.
- If `NonfungiblePositionManager` tokenURI reverts, that’s expected since descriptor is zero; position management still works.
- If bytecode/ABI import fails, ensure `@uniswap/v3-core` and `@uniswap/v3-periphery` are installed and that tests/scripts import from their `artifacts/` paths.

## Deploy to Kairos (Kaia Testnet)

The Hardhat network `kairos` is configured with `chainId: 1001` and a default public RPC endpoint. Provide your deployer key and (optionally) a custom RPC via environment variables.

1. Export environment variables

```bash
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY               # required (without quotes)
export KAIROS_RPC_URL=https://public-en-kairos.node.kaia.io  # optional override
```

2. Run the deploy scripts on Kairos

```bash
# Single-shot deploy (if you prefer a one-file flow)
bunx hardhat run --network kairos scripts/deploy_all.ts
 # With options
 SKIP_AAVE=1 bunx hardhat run --network kairos scripts/deploy_all.ts
 FUND_TO=0xYourAddress bunx hardhat run --network kairos scripts/deploy_all.ts

# Or step-by-step, mirroring local flow
bunx hardhat run --network kairos scripts/00_deploy_uniswap.ts
bunx hardhat run --network kairos scripts/01_deploy_tokens.ts
bunx hardhat run --network kairos scripts/02_create_pools_and_liquidity.ts
# Omit the KAIA/USDT pool
bunx hardhat run --network kairos scripts/02_create_pools_and_liquidity.ts -- --skip-kaia
# Optional demo swaps (requires funded account)
bunx hardhat run --network kairos scripts/03_demo_swaps.ts
# Optional Aave mock (after tokens)
bunx hardhat run --network kairos scripts/04_deploy_aave_usdt.ts
# Optional supply demo (assumes your account holds USDT)
bunx hardhat run --network kairos scripts/05_demo_aave_supply.ts
 # Optional funding helper
 bunx hardhat run --network kairos scripts/06_fund_recipient.ts
```

Notes

- Ensure the `PRIVATE_KEY` account has test KLAY for gas on Kairos.
- Artifacts path: `deployments/local.json` for `localhost`, `deployments/kairos.json` for `kairos` (and generally `deployments/<network>.json`).
- You can also set `KAIROS_RPC_URL` to any Kairos-compatible HTTPS endpoint.

## KAIA/USDT on Kairos

Create a 0.3% fee Uniswap V3 pool between KAIA (wrapped native in this repo) and USDT on the Kairos testnet. In this setup, “KAIA” refers to the wrapped-native token deployed by our stack (`weth9`/WETH9Mock) and is exposed as `tokens.KAIA` in the deployments file.

1) Configure environment and fund your deployer

- Set `PRIVATE_KEY` (funded on Kairos) and optionally `KAIROS_RPC_URL`.

```bash
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY
# optional
export KAIROS_RPC_URL=https://public-en-kairos.node.kaia.io
```

2) Deploy the Uniswap stack and tokens to Kairos

```bash
bunx hardhat run --network kairos scripts/00_deploy_uniswap.ts
bunx hardhat run --network kairos scripts/01_deploy_tokens.ts
```

This deploys Factory, PositionManager, SwapRouter, and WETH9Mock (used as wrapped KAIA). The token step deploys USDT and aliases `tokens.KAIA = weth9` in `deployments/kairos.json`.

3) Create the KAIA/USDT pool and seed liquidity

```bash
bunx hardhat run --network kairos scripts/02_create_pools_and_liquidity.ts
```

- The script detects `weth9` and automatically includes a `USDT_KAIA_3000` pool (fee 0.3%).
- Initial price is set to approximately 1 KAIA = 0.15 USDT as an example; adjust in code if needed.
- Note: the script also creates and seeds USDT/TKA, USDT/TKB, and USDT/TKC pools. If you only want KAIA/USDT, you can ignore the others or adapt the script to run only that pair.

4) Find the pool address

- Check `deployments/kairos.json` for:
  - `tokens.KAIA`: wrapped native token address used as KAIA
  - `tokens.USDT`: USDT address
  - `pools.USDT_KAIA_3000.address`: the pool address

Example paths:

```text
deployments/kairos.json: tokens.KAIA
deployments/kairos.json: tokens.USDT
deployments/kairos.json: pools.USDT_KAIA_3000.address
```

5) Optional: One-shot flow

You can also run the all-in-one flow on Kairos (includes pool creation and optional Aave mock + funding):

```bash
# Everything (Uniswap + tokens + pools [+ optional Aave + optional fund])
bunx hardhat run --network kairos scripts/deploy_all.ts

# Variants
SKIP_AAVE=1 bunx hardhat run --network kairos scripts/deploy_all.ts
FUND_TO=0xYourAddress bunx hardhat run --network kairos scripts/deploy_all.ts
# Omit KAIA/USDT in the all-in-one flow
bunx hardhat run --network kairos scripts/deploy_all.ts -- --skip-kaia
SKIP_KAIA=1 bunx hardhat run --network kairos scripts/deploy_all.ts
```

Troubleshooting

- Ensure your deployer has enough test KAIA for gas on Kairos.
- If `USDT_KAIA_3000` does not show up, confirm `weth9` exists in `deployments/kairos.json`; re-run `00_deploy_uniswap.ts` and `01_deploy_tokens.ts` before step 3.
- This repo treats KAIA as the wrapped-native token deployed by our scripts (WETH9Mock). To use a canonical wrapped asset, you would need to deploy PositionManager and SwapRouter with that canonical wrapped address instead.
