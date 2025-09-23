import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";

export async function demoAaveSupply() {
  const [user] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.tokens?.USDT || !d.aavePool || !d.aTokens?.aUSDT) {
    throw new Error("Missing deps. Run 01_deploy_tokens.ts and 04_deploy_aave_usdt.ts.");
  }

  const usdt = await ethers.getContractAt("ERC20Decimals", d.tokens.USDT);
  const pool = await ethers.getContractAt("MockAaveV3Pool", d.aavePool);
  const aUSDT = await ethers.getContractAt("MockAToken", d.aTokens.aUSDT);

  const amount = 1_000_000; // 1 USDT (6 decimals)

  console.log("Approving USDT...");
  await (await usdt.connect(user).approve(await pool.getAddress(), amount)).wait();

  console.log("Supplying USDT...");
  await (await pool.connect(user).supply(await usdt.getAddress(), amount, user.address, 0)).wait();

  const aBal = await aUSDT.balanceOf(user.address);
  console.log("aUSDT balance:", aBal.toString());
}

if (require.main === module) {
  demoAaveSupply().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

