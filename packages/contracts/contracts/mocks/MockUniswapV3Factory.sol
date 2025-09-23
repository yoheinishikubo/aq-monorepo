// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV3Factory {
    mapping(bytes32 => address) private _pools;

    function _key(address tokenA, address tokenB, uint24 fee) private pure returns (bytes32) {
        return keccak256(abi.encode(tokenA, tokenB, fee));
    }

    function setPool(address tokenA, address tokenB, uint24 fee, address pool) external {
        _pools[_key(tokenA, tokenB, fee)] = pool;
    }

    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool) {
        pool = _pools[_key(tokenA, tokenB, fee)];
    }
}

