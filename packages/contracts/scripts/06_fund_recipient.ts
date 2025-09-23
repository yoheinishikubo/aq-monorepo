import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";

export async function fundRecipientWithTokens() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.tokens)
    throw new Error(
      "No tokens found in deployments. Run 01_deploy_tokens.ts first."
    );

  const to = process.env.FUND_TO;
  if (!to) throw new Error("FUND_TO env var not set");
  if (!ethers.isAddress(to)) throw new Error(`Invalid recipient: ${to}`);

  const tokenEntries = Object.entries(d.tokens);
  console.log(`Transferring 2,000 units of each token to ${to}...`);

  for (const [symbol, addr] of tokenEntries) {
    const token = await ethers.getContractAt("ERC20Decimals", addr, deployer);
    const dec = await token.decimals();
    const amount = 2000n * 10n ** BigInt(dec);
    const bal: bigint = await token.balanceOf(deployer.address);
    if (bal < amount) {
      console.warn(`  Skipping ${symbol}: insufficient balance (${bal})`);
      continue;
    }
    const tx = await token.transfer(to, amount);
    await tx.wait();
    console.log(`  Sent ${symbol}: ${amount.toString()} (${dec}d)`);
  }

  console.log("Done.");
}

if (require.main === module) {
  fundRecipientWithTokens().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
