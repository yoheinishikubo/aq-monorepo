import { Contract, Wallet } from "ethers";

export const MAX_UINT256 = (1n << 256n) - 1n;

export async function approveMax(
  token: Contract,
  owner: Wallet | any,
  spender: string
) {
  const allowance: bigint = await token.allowance(owner.address, spender);
  if (allowance < (MAX_UINT256 >> 1n)) {
    const tx = await token.connect(owner).approve(spender, MAX_UINT256);
    await tx.wait();
  }
}

