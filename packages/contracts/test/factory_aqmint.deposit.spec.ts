import { expect } from "chai";
import { ethers } from "hardhat";
import { ensureDeploymentReady } from "./shared";
import { loadDeployments } from "../helpers/addresses";

describe("FactoryAQMint.deposit with Aave V3 + permit", () => {
  it("deploys vault via beacon, uses permit, supplies to Aave, and records deposit", async () => {
    const [deployer, owner, favorite, platformFeeRecipient] = await ethers.getSigners();

    // Ensure Uniswap/token baseline for USDT exists
    await ensureDeploymentReady();

    // Deploy Aave V3 mock for USDT
    const { deployAaveUsdtMock } = await import("../scripts/04_deploy_aave_usdt");
    await deployAaveUsdtMock();

    const d = await loadDeployments();
    const usdt = await ethers.getContractAt("ERC20Decimals", d.tokens!.USDT!);
    const pool = await ethers.getContractAt("MockAaveV3Pool", d.aavePool!);
    const aUSDT = await ethers.getContractAt("MockAToken", d.aTokens!.aUSDT!);

    // Fund owner with USDT to deposit
    const fundAmount = 2_000_000_000n; // 2,000 USDT (6 decimals)
    await (await usdt.transfer(owner.address, fundAmount)).wait();

    // Deploy Metadata via proxy so it can be initialized
    const Metadata = await ethers.getContractFactory("Metadata");
    const metadataImpl = await Metadata.deploy();
    await metadataImpl.waitForDeployment();
    const TestProxy = await ethers.getContractFactory("TestProxy");
    const metadataProxy = await TestProxy.deploy(await metadataImpl.getAddress(), "0x");
    const metadata = await ethers.getContractAt("Metadata", await metadataProxy.getAddress());
    await (await metadata.initialize(deployer.address, [])).wait();

    // Deploy logic contracts for NFT and Vault
    const ERC721AQ = await ethers.getContractFactory("ERC721AQ");
    const nftLogic = await ERC721AQ.deploy();
    await nftLogic.waitForDeployment();
    const ERC721AQVault = await ethers.getContractFactory("ERC721AQVault");
    const vaultLogic = await ERC721AQVault.deploy();
    await vaultLogic.waitForDeployment();

    // Deploy and initialize FactoryAQMint
    const Factory = await ethers.getContractFactory("FactoryAQMint");
    const factoryImpl = await Factory.deploy();
    await factoryImpl.waitForDeployment();
    const factoryProxy = await TestProxy.deploy(await factoryImpl.getAddress(), "0x");
    const factory = await ethers.getContractAt("FactoryAQMint", await factoryProxy.getAddress());
    await (
      await factory.initialize(
        deployer.address,
        await nftLogic.getAddress(),
        await vaultLogic.getAddress(),
        await metadata.getAddress(),
        platformFeeRecipient.address,
        await usdt.getAddress(),
        await aUSDT.getAddress(),
        await pool.getAddress()
      )
    ).wait();

    // Grant PLATFORM_ROLE to deployer to call deposit
    const PLATFORM_ROLE = await factory.PLATFORM_ROLE();
    await (await factory.grantRole(PLATFORM_ROLE, deployer.address)).wait();

    // Build EIP-2612 permit for owner -> factory spender
    const tokenAddress = await usdt.getAddress();
    const spender = await factory.getAddress();
    const value = 1_000_000_000n; // 1,000 USDT (meets deposit threshold check)
    const name: string = await usdt.name();
    const chainId = Number((await ethers.provider.getNetwork()).chainId);
    const nonce: bigint = await (usdt as any).nonces(owner.address);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const domain = { name, version: "1", chainId, verifyingContract: tokenAddress } as const;
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;
    const message = { owner: owner.address, spender, value, nonce, deadline } as const;
    const sig = await (owner as any).signTypedData(domain, types as any, message);
    const { v, r, s } = (ethers as any).Signature.from(sig);

    // Call deposit as platform (deployer). Factory will deploy & initialize a vault via beacon proxy, pull USDT via permit, approve pool, and supply to aUSDT on behalf of vault
    await (
      await factory.deposit(owner.address, favorite.address, 2500, {
        owner: owner.address,
        spender,
        value,
        deadline,
        v,
        r,
        s,
      })
    ).wait();

    // Verify vault address and aToken balance
    const vaultAddr = await factory.vaultAddress(owner.address, favorite.address);
    expect(vaultAddr).to.properAddress;

    // aUSDT minted 1:1 to vault
    expect(await aUSDT.balanceOf(vaultAddr)).to.equal(value);

    // Vault tracks deposited amount
    const vault = await ethers.getContractAt("ERC721AQVault", vaultAddr);
    expect(await vault.deposited()).to.equal(value);

    // Owner spent USDT and factory should not retain balance
    const ownerUsdt = await usdt.balanceOf(owner.address);
    expect(ownerUsdt).to.equal(fundAmount - value);
    expect(await usdt.balanceOf(await factory.getAddress())).to.equal(0n);
  });
});
