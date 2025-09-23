import { ethers } from "hardhat";
import { loadDeployments, saveDeployments } from "../helpers/addresses";

// Minimal ABI for AccessControl-compatible tokens
const ACCESS_CONTROL_ABI = [
  "function MINTER_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

// Wallets to grant MINTER_ROLE
const walletAddresses = [
  "0x5f7131e4430614aa4e968e3e7e1c1b7f448a2e6f",
  "0x916ebb37cacab45a82caa73fcf4b1d0fec23ef71",
  "0xe34503feae8ee344b22673f0d0ae885485e69beb",
  "0xe1c2401d5869eccff96ca63eb2787b0d22516d1f",
  "0xe48b2de584b7dc6f17b833fbb57040fa900b787b",
  "0xd182b9b748c26bbb29ec77b484dd197ddcb547de",
  "0x41a37635532e14a0969dd11c9c0b01601a110ed8",
  "0x049a83735b5ac20552ba0fd9399b98fcce802775",
  "0x09203ce835cc07136080312253be8fe0eaa31647",
  "0x172b47e8d1c0bddfdcbe1607fa0a0202a769ecc8",
  "0x7a3674f30922db42ae3e6b21e837575487a67ba5",
  "0x900c8fff2d772941eec667cb33219926dcb931d7",
  "0x92b4e4bf849d3682d8b8220a3810c7f9523f41cd",
  "0x7d52b0d0d60d03533fa8b4211396a3dad3ac4a82",
  "0x062ac9b988e33aef65de9092c5341ebe953a4d44",
  "0xf63ac1938429de3b3e31c65b11f4da958e942e83",
  "0x0a9e420fa842175d0a0fa8ac5a57eabf69691080",
  "0x77d26633335a4536cb7deb85a17c96ed2605da32",
  "0x764c9625c4590d239e7fbbbd765ac0ccb2478a52",
  "0xc435beae59c7e179bb08d8398bf0b1691361c235",
  "0xda8bd1f8885ec637c2c7ff27bd63c3e411357fd2",
  "0x8a672f4a3c1eb2e97d7da54c4a645866294917aa",
  "0x156d19873821d2ffaf8ec0ce03f2aa91872f023e",
  "0xb7b505e2a38c61b59d4d7e4229d9ce9952e8616a",
  "0x959fe6861b1c7b0644c7dd01bbc68a90b828d33e",
  "0x618279ee6440d80f840d701f66661c3678016bf8",
  "0xb6eedf5701b7d055011a8c3168fada93868040e2",
  "0x65093785278876981cd73264f07a57c4b7cb1631",
  "0x2052375d4b4ddbe1f10c6b349530cc7a2fd4db80",
  "0xd04843b71743ef11d7546af9b2b5dd4c7502a60c",
  "0x5055d1306c18c251c954e536af942455d03bb30e",
  "0x7b5ad444b9fd53d3307f04f50e40376efb1a42dc",
  "0x490224a510c5db05b753077a04571ffadc94c26a",
  "0x2dbee3aa0d46594a6b8bac978c9fc6a9df7b9b96",
];

export async function deployFaucet() {
  const [deployer] = await ethers.getSigners();
  const d = await loadDeployments();

  if (!d.tokens || Object.keys(d.tokens).length === 0) {
    throw new Error("No tokens found. Run 01_deploy_tokens.ts first.");
  }

  // Exclude KAIA/wrapped native from faucet tokens to avoid mint() reverts
  const wethLower = d.weth9?.toLowerCase();
  const tokens = Object.entries(d.tokens)
    .filter(([sym, addr]) => sym !== "KAIA" && addr.toLowerCase() !== (wethLower || ""))
    .map(([, addr]) => addr);

  if (tokens.length === 0) throw new Error("No eligible tokens for faucet (after excluding KAIA)");

  console.log("Deploying BatchMintFaucet with tokens (excluding KAIA):");
  for (const t of tokens) console.log("  ", t);

  const F = await ethers.getContractFactory("BatchMintFaucet");
  const faucet = await F.deploy(tokens, walletAddresses);
  await faucet.waitForDeployment();
  const faucetAddr = await faucet.getAddress();

  d.faucet = faucetAddr;
  await saveDeployments(d);

  console.log("BatchMintFaucet deployed:", faucetAddr);
  console.log("Admin:", deployer.address);
  console.log("Granted MINTER_ROLE to", walletAddresses.length, "addresses (plus deployer)");

  // Grant MINTER_ROLE to the faucet on all AccessControl-compatible tokens
  console.log("\nGranting faucet MINTER_ROLE on AccessControl tokens (if supported)...");
  for (const t of tokens) {
    try {
      const token = new ethers.Contract(t, ACCESS_CONTROL_ABI, deployer);
      let role: string;
      try {
        role = await token.MINTER_ROLE();
      } catch {
        // Fallback to default MINTER_ROLE hash if method not present
        role = ethers.id("MINTER_ROLE");
      }
      // Probe hasRole to check compatibility
      const has = await token.hasRole(role, faucetAddr).catch(() => undefined);
      if (has === undefined) {
        console.log("  -", t, ": not AccessControl-compatible (skipping)");
        continue;
      }
      if (has) {
        console.log("  -", t, ": faucet already has MINTER_ROLE");
        continue;
      }
      const tx = await token.grantRole(role, faucetAddr);
      await tx.wait();
      console.log("  -", t, ": MINTER_ROLE granted to faucet");
    } catch (e: any) {
      console.log("  -", t, ": grantRole failed or unsupported (", e?.reason || e?.message || e, ")");
    }
  }
}

if (require.main === module) {
  deployFaucet().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
