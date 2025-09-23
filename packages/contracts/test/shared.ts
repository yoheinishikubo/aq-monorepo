import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FactoryArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");

import { deployUniswap } from "../scripts/00_deploy_uniswap";
import { deployTokens } from "../scripts/01_deploy_tokens";
import { createPoolsAndLiquidity } from "../scripts/02_create_pools_and_liquidity";

export async function ensureDeploymentReady() {
  const d = await loadDeployments();

  let needsDeploy = !d.factory || !d.positionManager || !d.swapRouter || !d.tokens;

  if (!needsDeploy && d.factory) {
    // If the factory address has no code, we are on a fresh network
    const code = await ethers.provider.getCode(d.factory);
    if (!code || code === "0x") {
      needsDeploy = true;
    }
  }

  if (needsDeploy) {
    await deployUniswap();
    await deployTokens();
    await createPoolsAndLiquidity();
    return;
  }

  // Ensure pools exist (getPool is non-zero for the expected pairs)
  const [signer] = await ethers.getSigners();
  const factory = new (ethers as any).Contract(d.factory!, FactoryArtifact.abi, signer);
  const fee = 3000;

  const pairs = [
    { a: d.tokens!.USDT!, b: d.tokens!.TKA! },
    { a: d.tokens!.USDT!, b: d.tokens!.TKB! },
    { a: d.tokens!.USDT!, b: d.tokens!.TKC! },
  ] as const;

  let needsPools = false;
  for (const { a, b } of pairs) {
    const token0 = a.toLowerCase() < b.toLowerCase() ? a : b;
    const token1 = a.toLowerCase() < b.toLowerCase() ? b : a;
    const poolAddress = await factory.getPool(token0, token1, fee);
    if (!poolAddress || poolAddress === ethers.ZeroAddress) {
      needsPools = true;
      break;
    }
  }

  if (needsPools) {
    await createPoolsAndLiquidity();
  }
}

