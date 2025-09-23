// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    uint256 public fixedAmountOut;

    function setFixedAmountOut(uint256 v) external {
        fixedAmountOut = v;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        amountOut = fixedAmountOut;

        if (params.tokenIn != address(0)) {
            // Pull ERC20 input from msg.sender (expected to be the calling contract)
            IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        } else {
            // For native input, ensure value provided matches the declared amountIn
            require(msg.value == params.amountIn, "Mock: bad msg.value");
        }

        // Send the desired output tokens to the recipient
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}

