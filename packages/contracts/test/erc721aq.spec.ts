import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERC721AQ: mint to stablecoin flows", () => {
  const FEE = 3000;

  async function deployAll() {
    const [deployer, creator, feeRecipient, user] = await ethers.getSigners();

    // Deploy stablecoin (USDT 6 decimals) and a generic 18-dec token
    const USDT6 = await ethers.getContractFactory("USDT6");
    const usdt = await USDT6.deploy(10n ** 18n, deployer.address);

    // Use real ERC20Permit token
    const ERC20Decimals = await ethers.getContractFactory("ERC20Decimals");
    const tokenIn = await ERC20Decimals.deploy(
      "TokenIn",
      "TIN",
      18,
      10n ** 24n,
      user.address
    );

    // Deploy mocks
    const Factory = await ethers.getContractFactory("MockUniswapV3Factory");
    const factory = await Factory.deploy();

    const Quoter = await ethers.getContractFactory("MockQuoter");
    const quoter = await Quoter.deploy();

    const Router = await ethers.getContractFactory("MockSwapRouter");
    const router = await Router.deploy();

    // Prefund router with stablecoin to distribute on swaps
    await (
      await usdt.transfer(await router.getAddress(), 10_000_000_000_000n)
    ).wait();

    // Deploy ERC721AQ and configure
    // Deploy implementation and proxy, then initialize via proxy so msg.sender is deployer
    const ERC721AQ = await ethers.getContractFactory("ERC721AQ");
    const impl = await ERC721AQ.deploy();
    const TestProxy = await ethers.getContractFactory("TestProxy");
    const proxy = await TestProxy.deploy(await impl.getAddress(), "0x");
    const nft = await ethers.getContractAt(
      "ERC721AQ",
      await proxy.getAddress()
    );
    await (await nft.initialize(deployer.address, ethers.ZeroHash)).wait();

    const name = { raw: "AQ", encoded: "AQ", doubleEncoded: "AQ" };
    await (
      await nft.configure(
        deployer.address,
        ethers.ZeroAddress,
        name,
        "AQ",
        creator.address,
        feeRecipient.address,
        1000 // 10% platform fee
      )
    ).wait();

    return {
      deployer,
      creator,
      feeRecipient,
      user,
      usdt,
      tokenIn,
      factory,
      quoter,
      router,
      nft,
    };
  }

  it("safeMintWithNativeTokenToStablecoin mints and distributes USDT", async () => {
    const { user, creator, feeRecipient, usdt, factory, quoter, router, nft } =
      await deployAll();

    // Setup factory pool and quoter
    await (
      await factory.setPool(
        ethers.ZeroAddress,
        await usdt.getAddress(),
        FEE,
        await router.getAddress()
      )
    ).wait();
    await (await quoter.setQuote(1_200_000n)).wait(); // >= 5e5 threshold
    await (await router.setFixedAmountOut(1_200_000n)).wait();

    const creator0 = await usdt.balanceOf(creator.address);
    const fee0 = await usdt.balanceOf(feeRecipient.address);

    // Call mint with 1 native unit (value only used by router mock for validation)
    await (
      await nft
        .connect(user)
        .safeMintWithNativeTokenToStablecoin(
          await factory.getAddress(),
          await router.getAddress(),
          await quoter.getAddress(),
          FEE,
          await usdt.getAddress(),
          { value: 1n }
        )
    ).wait();

    // TokenId 1 should exist and belong to user (id 0 was minted during configure)
    expect(await nft.ownerOf(1)).to.equal(user.address);

    // 10% to platform, 90% to creator out of 1,200,000
    expect(await usdt.balanceOf(feeRecipient.address)).to.equal(
      fee0 + 120_000n
    );
    expect(await usdt.balanceOf(creator.address)).to.equal(
      creator0 + 1_080_000n
    );

    // Contract should not hold leftover USDT after distribution
    expect(await usdt.balanceOf(await nft.getAddress())).to.equal(0n);
  });

  it("safeMintWithNativeTokenToStablecoin reverts when no pool", async () => {
    const { user, usdt, factory, quoter, router, nft } = await deployAll();
    await (await quoter.setQuote(600_000n)).wait();
    await (await router.setFixedAmountOut(600_000n)).wait();

    await expect(
      nft
        .connect(user)
        .safeMintWithNativeTokenToStablecoin(
          await factory.getAddress(),
          await router.getAddress(),
          await quoter.getAddress(),
          FEE,
          await usdt.getAddress(),
          { value: 1n }
        )
    ).to.be.revertedWith("ERC721AQ: No pool for the token");
  });

  it("safeMintWithNativeTokenToStablecoin reverts on low quote", async () => {
    const { user, usdt, factory, quoter, router, nft } = await deployAll();
    await (
      await factory.setPool(
        ethers.ZeroAddress,
        await usdt.getAddress(),
        FEE,
        await router.getAddress()
      )
    ).wait();
    await (await quoter.setQuote(100_000n)).wait(); // below 5e5

    await expect(
      nft
        .connect(user)
        .safeMintWithNativeTokenToStablecoin(
          await factory.getAddress(),
          await router.getAddress(),
          await quoter.getAddress(),
          FEE,
          await usdt.getAddress(),
          { value: 1n }
        )
    ).to.be.revertedWith("ERC721AQ: Quoted amount is less than 5e5");
  });

  it("safeMintWithERC20ToStablecoin mints and distributes USDT", async () => {
    const {
      deployer,
      user,
      creator,
      feeRecipient,
      usdt,
      tokenIn,
      factory,
      quoter,
      router,
      nft,
    } = await deployAll();

    // Setup factory pool and quoter
    await (
      await factory.setPool(
        await tokenIn.getAddress(),
        await usdt.getAddress(),
        FEE,
        await router.getAddress()
      )
    ).wait();
    await (await quoter.setQuote(5_000_000n)).wait(); // >= 5e5
    await (await router.setFixedAmountOut(5_000_000n)).wait();

    const tokenAddress = await tokenIn.getAddress();
    const spender = await nft.getAddress();
    const value = 2n * 10n ** 18n; // 2 TIN
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    // Build EIP-2612 permit
    const name: string = await tokenIn.name();
    const chainId = Number((await ethers.provider.getNetwork()).chainId);
    const nonce: bigint = await (tokenIn as any).nonces(user.address);
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
      owner: user.address,
      spender,
      value,
      nonce,
      deadline,
    } as const;
    const sig = await (user as any).signTypedData(
      domain,
      types as any,
      message
    );
    const { v, r, s } = (ethers as any).Signature.from(sig);

    const creator0 = await usdt.balanceOf(creator.address);
    const fee0 = await usdt.balanceOf(feeRecipient.address);
    const userIn0 = await tokenIn.balanceOf(user.address);

    // Invoke mint with ERC20 -> stable
    await (
      await nft
        .connect(user)
        .safeMintWithERC20ToStablecoin(
          tokenAddress,
          { owner: user.address, spender, value, deadline, v, r, s },
          await factory.getAddress(),
          await router.getAddress(),
          await quoter.getAddress(),
          FEE,
          await usdt.getAddress()
        )
    ).wait();

    // Next token id after the native success would be 2, but since this test runs fresh deployment, it's 1 here if only configure minted id 0.
    expect(await nft.ownerOf(1)).to.equal(user.address);

    // 10% to platform, 90% to creator out of 5,000,000
    expect(await usdt.balanceOf(feeRecipient.address)).to.equal(
      fee0 + 500_000n
    );
    expect(await usdt.balanceOf(creator.address)).to.equal(
      creator0 + 4_500_000n
    );

    // User spent the input ERC20
    expect(await tokenIn.balanceOf(user.address)).to.equal(userIn0 - value);
  });

  it("safeMintWithERC20ToStablecoin reverts on low quote", async () => {
    const { user, usdt, tokenIn, factory, quoter, router, nft } =
      await deployAll();
    await (
      await factory.setPool(
        await tokenIn.getAddress(),
        await usdt.getAddress(),
        FEE,
        await router.getAddress()
      )
    ).wait();
    await (await quoter.setQuote(100_000n)).wait(); // below threshold

    const tokenAddress = await tokenIn.getAddress();
    const spender = await nft.getAddress();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const value = 1n * 10n ** 18n;

    await expect(
      nft.connect(user).safeMintWithERC20ToStablecoin(
        tokenAddress,
        {
          owner: user.address,
          spender,
          value,
          deadline,
          v: 27,
          r: ethers.ZeroHash,
          s: ethers.ZeroHash,
        },
        await factory.getAddress(),
        await router.getAddress(),
        await quoter.getAddress(),
        FEE,
        await usdt.getAddress()
      )
    ).to.be.revertedWith("ERC721AQ: Quoted amount is less than 5e5");
  });

  it("safeMintWithERC20ToStablecoin reverts when no pool", async () => {
    const { user, usdt, tokenIn, factory, quoter, router, nft } =
      await deployAll();
    await (await quoter.setQuote(600_000n)).wait();
    await (await router.setFixedAmountOut(600_000n)).wait();

    // Minimal valid permit signature
    const tokenAddress = await tokenIn.getAddress();
    const spender = await nft.getAddress();
    const name: string = await tokenIn.name();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const nonce: bigint = await (tokenIn as any).nonces(user.address);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const value = 1n * 10n ** 18n;
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
      owner: user.address,
      spender,
      value,
      nonce,
      deadline,
    } as const;
    const sig = await (user as any).signTypedData(
      domain,
      types as any,
      message
    );
    const { v, r, s } = (ethers as any).Signature.from(sig);

    await expect(
      nft
        .connect(user)
        .safeMintWithERC20ToStablecoin(
          tokenAddress,
          { owner: user.address, spender, value, deadline, v, r, s },
          await factory.getAddress(),
          await router.getAddress(),
          await quoter.getAddress(),
          FEE,
          await usdt.getAddress()
        )
    ).to.be.revertedWith("ERC721AQ: No pool for the token");
  });
});
