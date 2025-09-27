// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockQuoter {
    uint256 public quote;

    function setQuote(uint256 q) external {
        quote = q;
    }

    function quoteExactInputSingle(
        address,
        address,
        uint24,
        uint256,
        uint160
    ) external view returns (uint256 amountOut) {
        return quote;
    }
}

