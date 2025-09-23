import { ethers } from "hardhat";
import { loadDeployments, saveDeployments } from "../helpers/addresses";
import { encodePriceSqrt } from "../helpers/price";
import { approveMax } from "../helpers/approve";

// Uniswap artifacts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FactoryArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NPMArtifact = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PoolArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");

const FEE_3000 = 3000;
const MIN_TICK = -887220;
const MAX_TICK = 887220;

export async function createPoolsAndLiquidity() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();
  const SKIP_KAIA = process.argv.includes("--skip-kaia") || !!process.env.SKIP_KAIA;
  if (SKIP_KAIA) {
    console.log("[createPoolsAndLiquidity] Skipping KAIA/USDT pool (SKIP_KAIA enabled)");
  }

  if (!d.factory || !d.positionManager || !d.tokens)
    throw new Error("Missing deployments; run 00 and 01 first");

  const factory = new ethers.Contract(d.factory, FactoryArtifact.abi, deployer);
  const npm = new ethers.Contract(d.positionManager, NPMArtifact.abi, deployer);

  const usdt = await ethers.getContractAt(
    "ERC20Decimals",
    d.tokens.USDT,
    deployer
  );
  const tka = await ethers.getContractAt(
    "ERC20Decimals",
    d.tokens.TKA,
    deployer
  );
  const tkb = await ethers.getContractAt(
    "ERC20Decimals",
    d.tokens.TKB,
    deployer
  );
  const tkc = await ethers.getContractAt(
    "ERC20Decimals",
    d.tokens.TKC,
    deployer
  );

  const pairs: Array<{
    key: string;
    a: string; // tokenA address
    b: string; // tokenB address
    fee: number;
    decA: number;
    decB: number;
    // scale factor for desired liquidity amounts (defaults to 1,000,000 for ERC20 mocks)
    scaleA?: bigint;
    scaleB?: bigint;
  }> = [
    {
      key: "USDT_TKA_3000",
      a: await usdt.getAddress(),
      b: await tka.getAddress(),
      fee: 3000,
      decA: 6,
      decB: 18,
      scaleA: 1_000_000n,
      scaleB: 1_000_000n,
    },
    {
      key: "USDT_TKB_3000",
      a: await usdt.getAddress(),
      b: await tkb.getAddress(),
      fee: 3000,
      decA: 6,
      decB: 18,
      scaleA: 1_000_000n,
      scaleB: 1_000_000n,
    },
    {
      key: "USDT_TKC_3000",
      a: await usdt.getAddress(),
      b: await tkc.getAddress(),
      fee: 3000,
      decA: 6,
      decB: 18,
      scaleA: 1_000_000n,
      scaleB: 1_000_000n,
    },
  ];

  // Optionally add USDT/KAIA (wrapped native) if weth9 is available and not skipped
  if (d.weth9 && !SKIP_KAIA) {
    pairs.push({
      key: "USDT_KAIA_3000",
      a: await usdt.getAddress(),
      b: d.weth9,
      fee: 3000,
      decA: 6,
      decB: 18,
      // Keep the wrapped native amounts modest; we will deposit as needed
      scaleA: 1_000n, // 1,000 USDT
      scaleB: 1_000n, // 1,000 KAIA (wrapped)
    });
  }

  d.pools = d.pools || {};

  for (const { key, a, b, fee, decA, decB, scaleA = 1_000_000n, scaleB = 1_000_000n } of pairs) {
    const token0 = a.toLowerCase() < b.toLowerCase() ? a : b;
    const token1 = a.toLowerCase() < b.toLowerCase() ? b : a;

    const dec0 = token0.toLowerCase() === a.toLowerCase() ? decA : decB;
    const dec1 = token1.toLowerCase() === a.toLowerCase() ? decA : decB;

    // Default to 1:1 (considering decimals), but override for special pairs
    let sqrtPriceX96: bigint;
    if (key === "USDT_KAIA_3000") {
      // Target: 1 KAIA = 0.15 USDT
      // If token0 = KAIA and token1 = USDT, price token1/token0 = 15/100 = 0.15
      // If token0 = USDT and token1 = KAIA, price token1/token0 = 100/15 ≈ 6.6667
      const usdtAddr = a.toLowerCase();
      const kaiaAddr = b.toLowerCase();
      if (token0.toLowerCase() === kaiaAddr && token1.toLowerCase() === usdtAddr) {
        sqrtPriceX96 = encodePriceSqrt("15", dec1, "100", dec0);
      } else if (token0.toLowerCase() === usdtAddr && token1.toLowerCase() === kaiaAddr) {
        sqrtPriceX96 = encodePriceSqrt("100", dec1, "15", dec0);
      } else {
        // Fallback (should not happen): 1:1
        sqrtPriceX96 = encodePriceSqrt("1", dec1, "1", dec0);
      }
    } else {
      sqrtPriceX96 = encodePriceSqrt("1", dec1, "1", dec0);
    }

    const tx = await npm.createAndInitializePoolIfNecessary(
      token0,
      token1,
      fee,
      sqrtPriceX96
    );
    const receipt = await tx.wait();

    const poolAddress = await factory.getPool(token0, token1, fee);
    console.log(
      `Pool ${token0}/${token1}@${fee}:`,
      poolAddress,
      "sqrtPriceX96:",
      sqrtPriceX96.toString()
    );

    // Approvals for adding liquidity
    const token0Ctr = await ethers.getContractAt(
      "ERC20Decimals",
      token0,
      deployer
    );
    const token1Ctr = await ethers.getContractAt(
      "ERC20Decimals",
      token1,
      deployer
    );
    await approveMax(token0Ctr, deployer, await npm.getAddress());
    await approveMax(token1Ctr, deployer, await npm.getAddress());

    const amount0Desired = scaleA * 10n ** BigInt(dec0);
    const amount1Desired = scaleB * 10n ** BigInt(dec1);

    // If one side is wrapped native, ensure we have enough balance by depositing
    if (d.weth9) {
      const wethAddr = d.weth9.toLowerCase();
      // token0 side
      if (token0.toLowerCase() === wethAddr) {
        const weth = await ethers.getContractAt("WETH9Mock", d.weth9, deployer);
        const bal: bigint = await weth.balanceOf(deployer.address);
        if (bal < amount0Desired) {
          const delta = amount0Desired - bal;
          const tx = await weth.deposit({ value: delta });
          await tx.wait();
        }
      }
      // token1 side
      if (token1.toLowerCase() === wethAddr) {
        const weth = await ethers.getContractAt("WETH9Mock", d.weth9, deployer);
        const bal: bigint = await weth.balanceOf(deployer.address);
        if (bal < amount1Desired) {
          const delta = amount1Desired - bal;
          const tx = await weth.deposit({ value: delta });
          await tx.wait();
        }
      }
    }

    const params = {
      token0,
      token1,
      fee,
      tickLower: MIN_TICK,
      tickUpper: MAX_TICK,
      amount0Desired,
      amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: deployer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    };

    // Predict tokenId using staticCall (ethers v6) then mint
    const sim = await (npm as any).getFunction("mint").staticCall(params);
    const mintTx = await npm.mint(params);
    await mintTx.wait();

    // Fetch liquidity from pool to assert > 0
    const pool = new ethers.Contract(poolAddress, PoolArtifact.abi, deployer);
    const liquidity: bigint = await pool.liquidity();

    d.pools[key] = {
      address: poolAddress,
      positionId: sim.tokenId.toString(),
      sqrtPriceX96: sqrtPriceX96.toString(),
    };

    console.log("  Minted liquidity, pool liquidity:", liquidity.toString());
  }

  await saveDeployments(d);
}

if (require.main === module) {
  createPoolsAndLiquidity().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
