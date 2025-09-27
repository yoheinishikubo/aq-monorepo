import { parseUnits } from "ethers";

// sqrtPriceX96 = floor(sqrt(price) * 2^96)
// Where price = (amount1 * 10^dec1) / (amount0 * 10^dec0)
export function encodePriceSqrt(
  amount1: string,
  decimals1: number,
  amount0: string,
  decimals0: number
): bigint {
  const n1 = BigInt(parseUnits(amount1, decimals1).toString());
  const n0 = BigInt(parseUnits(amount0, decimals0).toString());
  // ratioX192 = (price) * 2^192 = (n1/n0) * 2^192
  const ratioX192 = (n1 << 192n) / n0;
  return sqrt(ratioX192);
}

function sqrt(y: bigint): bigint {
  if (y === 0n) return 0n;
  let z = y;
  let x = (y + 1n) / 2n;
  while (x < z) {
    z = x;
    x = (y / x + x) / 2n;
  }
  return z;
}

