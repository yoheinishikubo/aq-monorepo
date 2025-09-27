import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";

// Minimal ABIs for capability checks
const ACCESS_CONTROL_ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];
const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
];

export async function faucetBatchMint() {
  const [caller] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.faucet) throw new Error("No faucet deployed. Run 07_deploy_faucet.ts first.");
  if (!d.tokens || Object.keys(d.tokens).length === 0) throw new Error("No tokens found. Run 01_deploy_tokens.ts first.");

  const to = process.env.FAUCET_TO || process.env.FUND_TO || process.argv[2];
  if (!to || !ethers.isAddress(to)) throw new Error(`Invalid recipient: ${to}`);

  const unitsStr = process.env.FAUCET_UNITS;
  const amountStr = process.env.FAUCET_AMOUNT || process.argv[3];

  const faucet = await ethers.getContractAt("BatchMintFaucet", d.faucet, caller);

  // Ensure caller has MINTER_ROLE on faucet (clearer error than missing revert data)
  try {
    const minterRole = await faucet.MINTER_ROLE();
    const has = await faucet.hasRole(minterRole, caller.address);
    if (!has) {
      throw new Error(`Caller ${caller.address} is missing faucet MINTER_ROLE`);
    }
  } catch (e) {
    // If ABI lookup fails, continue and let on-chain revert handle it
  }

  // Filter to tokens where faucet can actually mint:
  // - Token exposes AccessControl.hasRole
  // - Faucet has MINTER_ROLE on the token
  const allTokens = Object.values(d.tokens);
  const subset: string[] = [];
  const skipped: string[] = [];
  const faucetAddr = d.faucet;
  for (const t of allTokens) {
    try {
      const token = new ethers.Contract(t, ACCESS_CONTROL_ABI, caller);
      let role: string;
      try {
        role = await token.MINTER_ROLE();
      } catch {
        // If MINTER_ROLE() selector missing, assume not AccessControl-compatible
        skipped.push(`${t} (no AccessControl)`);
        continue;
      }
      const has = await token.hasRole(role, faucetAddr);
      if (has) subset.push(t);
      else skipped.push(`${t} (faucet lacks MINTER_ROLE)`);
    } catch {
      skipped.push(`${t} (capability probe failed)`);
    }
  }

  if (subset.length === 0) {
    throw new Error("No mintable tokens found for faucet. Run 08_grant_faucet_token_minters.ts or fund via 06_fund_recipient.ts");
  }
  if (skipped.length) {
    console.log("Skipping non-mintable tokens:");
    for (const s of skipped) console.log("  -", s);
  }

  if (unitsStr) {
    // Compute per-token raw amounts off-chain and use batchMintWithAmounts
    // to avoid calling decimals() and minting for unsupported tokens.
    const units = BigInt(unitsStr);
    const amounts: bigint[] = [];
    for (const t of subset) {
      const token = new ethers.Contract(t, ERC20_METADATA_ABI, caller);
      const dec: number = await token.decimals();
      const amt = units * 10n ** BigInt(dec);
      amounts.push(amt);
    }
    const tx = await faucet.batchMintWithAmounts(to, subset, amounts);
    console.log("batchMintWithAmounts sent (units mode):", tx.hash);
    await tx.wait();
  } else {
    if (!amountStr) throw new Error("Missing amount. Provide FAUCET_AMOUNT (raw units) or FAUCET_UNITS (whole tokens).");
    const amount = BigInt(amountStr);
    const tx = await faucet.batchMintSameSubset(to, amount, subset);
    console.log("batchMintSameSubset sent:", tx.hash);
    await tx.wait();
  }
  console.log("Done.");
}

if (require.main === module) {
  faucetBatchMint().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
