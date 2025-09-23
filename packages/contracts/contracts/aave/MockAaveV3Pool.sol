// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockAToken} from "./MockAToken.sol";

// Minimal Aave V3-like pool for a single asset (USDT only).
// Supports supply and withdraw with a 1:1 aToken mapping and no interest.
contract MockAaveV3Pool {
    address public immutable USDT;
    MockAToken public immutable aUSDT;

    constructor(address usdt, uint8 usdtDecimals) {
        require(usdt != address(0), "USDT_ZERO");
        USDT = usdt;
        aUSDT = new MockAToken("Aave interest bearing USDT", "aUSDT", usdtDecimals, address(this));
    }

    // Mimics Aave V3 IPool.supply(asset, amount, onBehalfOf, referralCode)
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external {
        require(asset == USDT, "ASSET_NOT_SUPPORTED");
        require(amount > 0, "ZERO_AMOUNT");
        address beneficiary = onBehalfOf == address(0) ? msg.sender : onBehalfOf;

        // Pull USDT from caller
        require(IERC20(USDT).transferFrom(msg.sender, address(this), amount), "TRANSFER_FROM_FAILED");

        // Mint aUSDT 1:1 to beneficiary
        aUSDT.mint(beneficiary, amount);
    }

    // Mimics Aave V3 IPool.withdraw(asset, amount, to) -> uint256 withdrawn
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(asset == USDT, "ASSET_NOT_SUPPORTED");
        require(to != address(0), "BAD_TO");

        uint256 balance = aUSDT.balanceOf(msg.sender);
        uint256 toWithdraw = amount == type(uint256).max ? balance : amount;
        require(toWithdraw > 0 && toWithdraw <= balance, "BAD_AMOUNT");

        // Burn aUSDT from msg.sender
        aUSDT.burn(msg.sender, toWithdraw);

        // Send USDT to receiver
        require(IERC20(USDT).transfer(to, toWithdraw), "TRANSFER_FAILED");
        return toWithdraw;
    }
}

