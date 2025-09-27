// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20Decimals.sol";

contract USDT6 is ERC20Decimals {
    constructor(uint256 initialSupply, address to)
        ERC20Decimals("USDT", "USDT", 6, initialSupply, to)
    {}
}

