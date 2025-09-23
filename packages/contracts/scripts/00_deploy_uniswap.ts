import { ethers } from "hardhat";
import { saveDeployments, loadDeployments } from "../helpers/addresses";

// Import Uniswap ABIs/bytecode directly from packages (avoid compiling them)
// Factory
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FactoryArtifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
// NonfungiblePositionManager
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NPMArtifact = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
// SwapRouter
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RouterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
// Quoter
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QuoterArtifact = require("@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json");

export async function deployUniswap() {
  const [deployer] = await ethers.getSigners();

  const WETH9 = await ethers.getContractFactory("WETH9Mock");
  const weth9 = await WETH9.connect(deployer).deploy();
  await weth9.waitForDeployment();

  const Factory = new ethers.ContractFactory(FactoryArtifact.abi, FactoryArtifact.bytecode, deployer);
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const NPM = new ethers.ContractFactory(NPMArtifact.abi, NPMArtifact.bytecode, deployer);
  const npm = await NPM.deploy(await factory.getAddress(), await weth9.getAddress(), ethers.ZeroAddress);
  await npm.waitForDeployment();

  const Router = new ethers.ContractFactory(RouterArtifact.abi, RouterArtifact.bytecode, deployer);
  const router = await Router.deploy(await factory.getAddress(), await weth9.getAddress());
  await router.waitForDeployment();

  // Deploy Quoter for off-chain price/swap estimation
  const Quoter = new ethers.ContractFactory(QuoterArtifact.abi, QuoterArtifact.bytecode, deployer);
  const quoter = await Quoter.deploy(await factory.getAddress(), await weth9.getAddress());
  await quoter.waitForDeployment();

  const d = await loadDeployments();
  d.factory = await factory.getAddress();
  d.weth9 = await weth9.getAddress();
  d.positionManager = await npm.getAddress();
  d.swapRouter = await router.getAddress();
  d.quoter = await quoter.getAddress();
  await saveDeployments(d);

  console.log("Uniswap V3 stack deployed:");
  console.log("  WETH9:", d.weth9);
  console.log("  Factory:", d.factory);
  console.log("  PositionManager:", d.positionManager);
  console.log("  SwapRouter:", d.swapRouter);
  console.log("  Quoter:", d.quoter);
}

if (require.main === module) {
  deployUniswap().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
