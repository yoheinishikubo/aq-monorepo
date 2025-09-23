import { Contract } from "ethers";
import { Signature } from "ethers";

export const MAX_UINT256 = (1n << 256n) - 1n;

type SignerLike = {
  address: string;
  signTypedData: (
    domain: any,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: any
  ) => Promise<string>;
};

/**
 * Sign and submit an EIP-2612 permit for an ERC20Permit token.
 */
export async function permit(
  token: Contract,
  owner: SignerLike,
  spender: string,
  value: bigint,
  deadlineSec: number = Math.floor(Date.now() / 1000) + 3600
) {
  const tokenAddress = await token.getAddress();
  const name: string = await token.name();
  // ethers v6 returns bigint chainId
  const chainId = (await token.runner!.provider!.getNetwork()).chainId;
  const nonce: bigint = await token.nonces(owner.address);

  const domain = {
    name,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  } as const;

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const message = {
    owner: owner.address,
    spender,
    value,
    nonce,
    deadline: BigInt(deadlineSec),
  } as const;

  const sig = await owner.signTypedData(domain, types as any, message);
  const { v, r, s } = Signature.from(sig);

  const tx = await token.permit(owner.address, spender, value, deadlineSec, v, r, s);
  return tx.wait();
}

export async function permitMax(
  token: Contract,
  owner: SignerLike,
  spender: string,
  deadlineSec?: number
) {
  return permit(token, owner, spender, MAX_UINT256, deadlineSec);
}

