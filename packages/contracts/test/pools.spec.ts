import { expect } from "chai";
import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";
import { ensureDeploymentReady } from "./shared";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FactoryArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PoolArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");

describe("Pools", () => {
  before(async () => {
    await ensureDeploymentReady();
  });
  it("factory has pools and liquidity > 0", async () => {
    const d = await loadDeployments();
    expect(d.factory).to.be.a("string");
    const [signer] = await ethers.getSigners();
    const factory = new ethers.Contract(d.factory!, FactoryArtifact.abi, signer);

    const fee = 3000;
    const pairs = [
      { key: "USDT_TKA_3000", a: d.tokens!.USDT!, b: d.tokens!.TKA! },
      { key: "USDT_TKB_3000", a: d.tokens!.USDT!, b: d.tokens!.TKB! },
      { key: "USDT_TKC_3000", a: d.tokens!.USDT!, b: d.tokens!.TKC! },
    ] as const;

    for (const { key, a, b } of pairs) {
      const token0 = a.toLowerCase() < b.toLowerCase() ? a : b;
      const token1 = a.toLowerCase() < b.toLowerCase() ? b : a;
      const poolAddress = await factory.getPool(token0, token1, fee);
      expect(poolAddress).to.properAddress;
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);

      const pool = new ethers.Contract(poolAddress, PoolArtifact.abi, signer);
      const liquidity: bigint = await pool.liquidity();
      expect(liquidity).to.be.gt(0n);

      const slot0 = await pool.slot0();
      expect(slot0.sqrtPriceX96).to.be.a("bigint");
    }
  });
});
