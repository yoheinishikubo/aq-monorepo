import { ethers } from "hardhat";
import { loadDeployments, saveDeployments } from "../helpers/addresses";

// Minimal ABI for AccessControl-compatible tokens
const ACCESS_CONTROL_ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
];

export async function grantFaucetAsMinter() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.faucet) throw new Error("No faucet found. Run 07_deploy_faucet.ts first.");
  if (!d.tokens || Object.keys(d.tokens).length === 0) {
    throw new Error("No tokens found. Run 01_deploy_tokens.ts first.");
  }

  const faucet = d.faucet;
  // Exclude KAIA/wrapped native from grant attempts — not AccessControl
  const wethLower = d.weth9?.toLowerCase();
  const tokens = Object.entries(d.tokens)
    .filter(([sym, addr]) => sym !== "KAIA" && addr.toLowerCase() !== (wethLower || ""))
    .map(([, addr]) => addr);

  console.log("Granting faucet as MINTER on tokens (where supported)\nFaucet:", faucet);

  for (const addr of tokens) {
    const token = new ethers.Contract(addr, ACCESS_CONTROL_ABI, deployer);
    let role: string;
    try {
      role = await token.MINTER_ROLE();
    } catch {
      // Fallback to common hash if MINTER_ROLE() is not exposed
      role = ethers.id("MINTER_ROLE");
    }

    // Check interface support by attempting hasRole static call
    try {
      const has = await token.hasRole(role, faucet);
      if (has) {
        console.log(`- ${addr}: already has MINTER_ROLE`);
        continue;
      }
    } catch {
      console.log(`- ${addr}: not AccessControl-compatible (skipping)`);
      continue;
    }

    try {
      const tx = await token.grantRole(role, faucet);
      await tx.wait();
      console.log(`- ${addr}: MINTER_ROLE granted`);
    } catch (e: any) {
      console.log(`- ${addr}: grantRole failed (${e?.reason || e?.message || e})`);
    }
  }

  await saveDeployments(d);
}

if (require.main === module) {
  grantFaucetAsMinter().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
