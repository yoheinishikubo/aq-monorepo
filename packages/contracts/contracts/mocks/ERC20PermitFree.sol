// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

contract ERC20PermitFree is ERC20, IERC20Permit {
    uint8 private immutable _customDecimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 initialSupply, address to)
        ERC20(name_, symbol_)
    {
        _customDecimals = decimals_;
        _mint(to, initialSupply);
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    // IERC20Permit minimal stub: just approve without signature checking
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 /*deadline*/,
        uint8 /*v*/,
        bytes32 /*r*/,
        bytes32 /*s*/
    ) external override {
        _approve(owner, spender, value);
    }

    function nonces(address /*owner*/) external view override returns (uint256) {
        return 0;
    }

    function DOMAIN_SEPARATOR() external view override returns (bytes32) {
        return bytes32(0);
    }
}

