import { ethers } from "hardhat";
import { saveDeployments, loadDeployments } from "../helpers/addresses";

const ONE_MILLION = 1_000_000n;

export async function deployTokens() {
  const [deployer] = await ethers.getSigners();

  const USDT6 = await ethers.getContractFactory("USDT6");
  const usdt = await USDT6.deploy(ONE_MILLION * 10n ** 6n * 1_000n, deployer.address); // 1e9 USDT supply
  await usdt.waitForDeployment();

  const ERC20Decimals = await ethers.getContractFactory("ERC20Decimals");

  const tka = await ERC20Decimals.deploy("Token A", "TKA", 18, ONE_MILLION * 10n ** 18n * 1_000n, deployer.address);
  await tka.waitForDeployment();
  const tkb = await ERC20Decimals.deploy("Token B", "TKB", 18, ONE_MILLION * 10n ** 18n * 1_000n, deployer.address);
  await tkb.waitForDeployment();
  const tkc = await ERC20Decimals.deploy("Token C", "TKC", 18, ONE_MILLION * 10n ** 18n * 1_000n, deployer.address);
  await tkc.waitForDeployment();

  const d = await loadDeployments();
  // Preserve existing token map (e.g., KAIA alias to wrapped native), then add/overwrite our mock tokens
  d.tokens = d.tokens || {};
  d.tokens.USDT = await usdt.getAddress();
  d.tokens.TKA = await tka.getAddress();
  d.tokens.TKB = await tkb.getAddress();
  d.tokens.TKC = await tkc.getAddress();
  // Expose native as KAIA alias if WETH9 is deployed
  if (d.weth9) {
    d.tokens.KAIA = d.weth9;
  }
  await saveDeployments(d);

  console.log("Tokens deployed:");
  console.log("  USDT:", d.tokens.USDT);
  console.log("  TKA:", d.tokens.TKA);
  console.log("  TKB:", d.tokens.TKB);
  console.log("  TKC:", d.tokens.TKC);
  if (d.tokens.KAIA) {
    console.log("  KAIA (wrapped):", d.tokens.KAIA);
  }
}

if (require.main === module) {
  deployTokens().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
