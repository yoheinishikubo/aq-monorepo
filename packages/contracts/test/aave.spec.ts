import { expect } from "chai";
import { ethers } from "hardhat";
import { loadDeployments } from "../helpers/addresses";
import { ensureDeploymentReady } from "./shared";
import { permit } from "../helpers/permit";
import { deployAaveUsdtMock } from "../scripts/04_deploy_aave_usdt";

describe("Aave V3 USDT Mock", () => {
  before(async () => {
    // Ensure base tokens/uniswap are present so USDT exists
    await ensureDeploymentReady();
    // Deploy the Aave mock bound to USDT
    await deployAaveUsdtMock();
  });

  it("mints aUSDT on supply and burns on withdraw", async () => {
    const [user] = await ethers.getSigners();
    const d = await loadDeployments();

    expect(d.tokens?.USDT).to.be.a("string");
    expect(d.aavePool).to.be.a("string");
    expect(d.aTokens?.aUSDT).to.be.a("string");

    const usdt = await ethers.getContractAt("ERC20Decimals", d.tokens!.USDT!);
    const pool = await ethers.getContractAt("MockAaveV3Pool", d.aavePool!);
    const aUSDT = await ethers.getContractAt("MockAToken", d.aTokens!.aUSDT!);

    const amount = 5_000_000n; // 5 USDT (6 decimals)

    // Permit and supply
    await permit(usdt, user, await pool.getAddress(), amount);

    const usdtBefore = await usdt.balanceOf(user.address);
    await (await pool.connect(user).supply(await usdt.getAddress(), amount, user.address, 0)).wait();
    const usdtAfterSupply = await usdt.balanceOf(user.address);
    const aAfterSupply = await aUSDT.balanceOf(user.address);

    expect(usdtAfterSupply).to.equal(usdtBefore - amount);
    expect(aAfterSupply).to.equal(amount);

    // Withdraw half
    const half = amount / 2n;
    const usdtBeforeWithdraw = await usdt.balanceOf(user.address);
    await (await pool.connect(user).withdraw(await usdt.getAddress(), half, user.address)).wait();
    const usdtAfterWithdraw = await usdt.balanceOf(user.address);
    const aAfterWithdraw = await aUSDT.balanceOf(user.address);

    expect(usdtAfterWithdraw).to.equal(usdtBeforeWithdraw + half);
    expect(aAfterWithdraw).to.equal(half);
  });
});
