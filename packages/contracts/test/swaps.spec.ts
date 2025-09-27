import { expect } from "chai";
import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";
import { ensureDeploymentReady } from "./shared";
import { permit } from "../helpers/permit";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RouterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");

describe("Swaps", () => {
  before(async () => {
    await ensureDeploymentReady();
  });
  it("demo swaps change balances in expected direction", async () => {
    const d = await loadDeployments();
    const [signer] = await ethers.getSigners();
    const router = new ethers.Contract(d.swapRouter!, RouterArtifact.abi, signer);

    const fee = 3000;
    const pairs = [
      { key: "USDT_TKA_3000", a: d.tokens!.USDT!, b: d.tokens!.TKA!, decA: 6, decB: 18 },
      { key: "USDT_TKB_3000", a: d.tokens!.USDT!, b: d.tokens!.TKB!, decA: 6, decB: 18 },
      { key: "USDT_TKC_3000", a: d.tokens!.USDT!, b: d.tokens!.TKC!, decA: 6, decB: 18 },
    ] as const;

    for (const { a, b, decA, decB } of pairs) {
      const tokenA = await ethers.getContractAt("ERC20Decimals", a, signer);
      const tokenB = await ethers.getContractAt("ERC20Decimals", b, signer);

      // ensure approvals via EIP-2612 permit
      await permit(tokenA, signer as any, router.target as string, (1n << 255n));
      await permit(tokenB, signer as any, router.target as string, (1n << 255n));

      const amountInA = 1_000n * 10n ** BigInt(decA);
      const amountInB = 1n * 10n ** BigInt(decB);

      const a0 = await tokenA.balanceOf(signer.address);
      const b0 = await tokenB.balanceOf(signer.address);

      await (await router.exactInputSingle({
        tokenIn: a,
        tokenOut: b,
        fee,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 600,
        amountIn: amountInA,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      })).wait();

      const a1 = await tokenA.balanceOf(signer.address);
      const b1 = await tokenB.balanceOf(signer.address);

      expect(a1).to.be.lt(a0); // spent A
      expect(b1).to.be.gt(b0); // received B

      await (await router.exactInputSingle({
        tokenIn: b,
        tokenOut: a,
        fee,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 600,
        amountIn: amountInB,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
      })).wait();

      const a2 = await tokenA.balanceOf(signer.address);
      const b2 = await tokenB.balanceOf(signer.address);

      expect(b2).to.be.lt(b1); // spent B back
      expect(a2).to.be.gt(a1); // received A back
    }
  });
});
