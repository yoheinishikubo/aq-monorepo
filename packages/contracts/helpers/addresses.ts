import { promises as fs } from "fs";
import path from "path";

// Choose deployments file based on Hardhat network; default to local.json
const network = process.env.HARDHAT_NETWORK;
const deploymentsFilename = !network || network === "localhost" ? "local.json" : `${network}.json`;
const DEPLOYMENTS_FILE = path.join(process.cwd(), "deployments", deploymentsFilename);

export type Deployments = {
  factory?: string;
  weth9?: string;
  positionManager?: string;
  swapRouter?: string;
  quoter?: string;
  tokens?: Record<string, string>;
  pools?: Record<string, { address: string; positionId?: string; sqrtPriceX96?: string }>;
  // Aave V3 mocks
  aavePool?: string;
  aTokens?: {
    aUSDT?: string;
  };
  // Faucet
  faucet?: string;
};

export async function loadDeployments(): Promise<Deployments> {
  try {
    const data = await fs.readFile(DEPLOYMENTS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveDeployments(d: Deployments): Promise<void> {
  const dir = path.dirname(DEPLOYMENTS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DEPLOYMENTS_FILE, JSON.stringify(d, null, 2));
}

export const deploymentsPath = DEPLOYMENTS_FILE;
