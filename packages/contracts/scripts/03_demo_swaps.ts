import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";
import { approveMax } from "../helpers/approve";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RouterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");

export async function demoSwaps() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();
  if (!d.swapRouter || !d.tokens || !d.pools) throw new Error("Missing deployments; run previous scripts");

  const router = new ethers.Contract(d.swapRouter, RouterArtifact.abi, deployer);

  const fee = 3000;
  const pairs = [
    { key: "USDT_TKA_3000", a: d.tokens.USDT!, b: d.tokens.TKA!, decA: 6, decB: 18 },
    { key: "USDT_TKB_3000", a: d.tokens.USDT!, b: d.tokens.TKB!, decA: 6, decB: 18 },
    { key: "USDT_TKC_3000", a: d.tokens.USDT!, b: d.tokens.TKC!, decA: 6, decB: 18 },
  ] as const;

  for (const { key, a, b, decA, decB } of pairs) {
    const tokenInA = await ethers.getContractAt("ERC20Decimals", a, deployer);
    const tokenInB = await ethers.getContractAt("ERC20Decimals", b, deployer);

    // Approvals for router
    await approveMax(tokenInA, deployer, router.target as string);
    await approveMax(tokenInB, deployer, router.target as string);

    const amountInA = 10_000n * 10n ** BigInt(decA);
    const amountInB = 10n * 10n ** BigInt(decB); // small amount back swap

    const beforeA0 = await tokenInA.balanceOf(deployer.address);
    const beforeB0 = await tokenInB.balanceOf(deployer.address);

    // USDT -> TokenX
    const swap1 = await router.exactInputSingle({
      tokenIn: a,
      tokenOut: b,
      fee,
      recipient: deployer.address,
      deadline: Math.floor(Date.now() / 1000) + 600,
      amountIn: amountInA,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await swap1.wait();

    const afterA1 = await tokenInA.balanceOf(deployer.address);
    const afterB1 = await tokenInB.balanceOf(deployer.address);

    console.log(`${key} swap A->B:`, beforeA0.toString(), "->", afterA1.toString(), "|", beforeB0.toString(), "->", afterB1.toString());

    // TokenX -> USDT
    const swap2 = await router.exactInputSingle({
      tokenIn: b,
      tokenOut: a,
      fee,
      recipient: deployer.address,
      deadline: Math.floor(Date.now() / 1000) + 600,
      amountIn: amountInB,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await swap2.wait();

    const afterA2 = await tokenInA.balanceOf(deployer.address);
    const afterB2 = await tokenInB.balanceOf(deployer.address);

    console.log(`${key} swap B->A:`, afterB1.toString(), "->", afterB2.toString(), "|", afterA1.toString(), "->", afterA2.toString());
  }
}

if (require.main === module) {
  demoSwaps().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

