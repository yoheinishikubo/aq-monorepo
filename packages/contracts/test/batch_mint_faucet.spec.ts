import { expect } from "chai";
import { ethers } from "hardhat";

describe("BatchMintFaucet", () => {
  async function setup() {
    const [deployer, minter, user, other] = await ethers.getSigners();

    const ERC20Dec = await ethers.getContractFactory("ERC20Decimals");
    const weth = await ERC20Dec.deploy(
      "Wrapped Ether",
      "WETH",
      18,
      0n,
      deployer.address
    );
    const usdt = await ERC20Dec.deploy(
      "Tether USD",
      "USDT",
      6,
      0n,
      deployer.address
    );

    const Faucet = await ethers.getContractFactory("BatchMintFaucet");
    // Grant faucet MINTER_ROLE to `minter` via constructor
    const faucet = await Faucet.deploy([await weth.getAddress(), await usdt.getAddress()], [minter.address]);

    // Grant faucet contract permission to mint on each token
    const MINTER_ROLE = await weth.MINTER_ROLE();
    await (await weth.grantRole(MINTER_ROLE, await faucet.getAddress())).wait();
    await (await usdt.grantRole(MINTER_ROLE, await faucet.getAddress())).wait();

    return { deployer, minter, user, other, faucet, weth, usdt } as const;
  }

  it("batchMintSame mints raw amount on all tokens", async () => {
    const { faucet, minter, user, weth, usdt } = await setup();

    const to = user.address;
    const amount = 1_234n;

    await expect(faucet.connect(minter).batchMintSame(to, amount))
      .to.emit(faucet, "BatchMint")
      .withArgs(minter.address, to, amount, 2n);

    expect(await weth.balanceOf(to)).to.equal(amount);
    expect(await usdt.balanceOf(to)).to.equal(amount);
  });

  it("batchMintSameUnits scales by each token's decimals", async () => {
    const { faucet, minter, user, weth, usdt } = await setup();

    const to = user.address;
    const units = 7n;

    await expect(faucet.connect(minter).batchMintSameUnits(to, units))
      .to.emit(faucet, "BatchMintUnits")
      .withArgs(minter.address, to, units, 2n);

    expect(await weth.balanceOf(to)).to.equal(units * 10n ** 18n);
    expect(await usdt.balanceOf(to)).to.equal(units * 10n ** 6n);
  });

  it("subset operations and validation", async () => {
    const { faucet, minter, user, deployer, weth, usdt } = await setup();

    // subset mint same amount
    const to = user.address;
    const amt = 999n;
    const usdt0 = await usdt.balanceOf(to);
    await expect(
      faucet.connect(minter).batchMintSameSubset(to, amt, [await usdt.getAddress()])
    )
      .to.emit(faucet, "BatchMint")
      .withArgs(minter.address, to, amt, 1n);
    expect(await usdt.balanceOf(to)).to.equal(usdt0 + amt);

    // subset with per-token amounts
    const amounts = [111n, 222n];
    const weth0 = await weth.balanceOf(to);
    const usdt1 = await usdt.balanceOf(to);
    await expect(
      faucet
        .connect(minter)
        .batchMintWithAmounts(to, [await weth.getAddress(), await usdt.getAddress()], amounts)
    )
      .to.emit(faucet, "BatchMintWithAmounts")
      .withArgs(minter.address, to, 2n);
    expect(await weth.balanceOf(to)).to.equal(weth0 + amounts[0]);
    expect(await usdt.balanceOf(to)).to.equal(usdt1 + amounts[1]);

    // length mismatch
    await expect(
      faucet
        .connect(minter)
        .batchMintWithAmounts(to, [await weth.getAddress()], [1n, 2n])
    ).to.be.revertedWith("Length mismatch");

    // unregistered token in subset
    const ERC20Dec = await ethers.getContractFactory("ERC20Decimals");
    const foo = await ERC20Dec.deploy("Foo", "FOO", 18, 0n, deployer.address);
    await expect(
      faucet
        .connect(minter)
        .batchMintSameSubset(to, 1n, [await foo.getAddress()])
    ).to.be.revertedWith("Token not registered");

    // zero recipient reverts
    await expect(
      faucet.connect(minter).batchMintSame(ethers.ZeroAddress, 1n)
    ).to.be.revertedWith("Recipient is zero");
  });

  it("access control enforced for minter and admin", async () => {
    const { faucet, deployer, minter, user, weth } = await setup();

    // Non-minter cannot mint
    await expect(
      faucet.connect(user).batchMintSame(user.address, 1n)
    ).to.be.revertedWithCustomError(faucet, "AccessControlUnauthorizedAccount");

    // Non-admin cannot set tokens
    await expect(
      faucet.connect(user).setTokens([await weth.getAddress()])
    ).to.be.revertedWithCustomError(faucet, "AccessControlUnauthorizedAccount");

    // Admin (deployer) can set tokens and toggles registry flags
    await expect(faucet.connect(deployer).setTokens([await weth.getAddress()]))
      .to.emit(faucet, "TokensSet");
  });
});
