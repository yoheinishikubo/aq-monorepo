import { ethers } from "hardhat";
import { loadDeployments, saveDeployments } from "../helpers/addresses";

export async function deployAaveUsdtMock() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.tokens?.USDT) {
    throw new Error("USDT not deployed. Run 01_deploy_tokens.ts first.");
  }

  const usdt = d.tokens.USDT;

  // Detect USDT decimals by on-chain call, default to 6 if it fails
  const erc20 = await ethers.getContractAt("ERC20Decimals", usdt);
  let decimals = 6;
  try {
    decimals = await erc20.decimals();
  } catch {
    // ignore, keep default 6
  }

  const Pool = await ethers.getContractFactory("MockAaveV3Pool");
  const pool = await Pool.connect(deployer).deploy(usdt, decimals);
  await pool.waitForDeployment();

  const aUSDT = await pool.aUSDT();

  d.aavePool = await pool.getAddress();
  d.aTokens = { ...(d.aTokens || {}), aUSDT };
  await saveDeployments(d);

  console.log("Aave V3 mock deployed:");
  console.log("  Pool:", d.aavePool);
  console.log("  aUSDT:", d.aTokens!.aUSDT);
}

if (require.main === module) {
  deployAaveUsdtMock().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

