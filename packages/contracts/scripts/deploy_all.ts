import { deployUniswap } from "./00_deploy_uniswap";
import { deployTokens } from "./01_deploy_tokens";
import { createPoolsAndLiquidity } from "./02_create_pools_and_liquidity";
import { demoSwaps } from "./03_demo_swaps";
import { deployAaveUsdtMock } from "./04_deploy_aave_usdt";
import { demoAaveSupply } from "./05_demo_aave_supply";
import { fundRecipientWithTokens } from "./06_fund_recipient";
import { deployFaucet } from "./07_deploy_faucet";

async function main() {
  await deployUniswap();
  await deployTokens();
  await createPoolsAndLiquidity();
  await demoSwaps();

  // Optional Aave V3 USDT-only mock and a small supply demo
  // Set SKIP_AAVE=1 to skip these steps
  if (!process.env.SKIP_AAVE) {
    await deployAaveUsdtMock();
    await demoAaveSupply();
  }

  // Optionally deploy faucet; set SKIP_FAUCET=1 to skip
  if (!process.env.SKIP_FAUCET) {
    await deployFaucet();
  }

  // Finally, fund the specified recipient with 2,000 units of each token
  await fundRecipientWithTokens();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
