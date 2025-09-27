// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

/// @title BatchMintFaucet
/// @notice Faucet that mints (or transfers if mint not available) the same amount of multiple ERC20 tokens
///         to a single recipient in one call. Uses AccessControl to restrict minting.
contract BatchMintFaucet is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // List of registered ERC20 token addresses
    address[] private _tokens;
    mapping(address => bool) public isTokenRegistered;

    event TokensSet(address[] tokens);
    event BatchMint(
        address indexed caller,
        address indexed to,
        uint256 amount,
        uint256 tokenCount
    );
    event BatchMintUnits(
        address indexed caller,
        address indexed to,
        uint256 units,
        uint256 tokenCount
    );
    event BatchMintWithAmounts(
        address indexed caller,
        address indexed to,
        uint256 tokenCount
    );

    constructor(address[] memory tokens_, address[] memory initialMinters) {
        // Deployer is admin by default
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setTokensInternal(tokens_);

        // Grant minter role to deployer and specified minters
        _grantRole(MINTER_ROLE, msg.sender);
        for (uint256 i = 0; i < initialMinters.length; i++) {
            _grantRole(MINTER_ROLE, initialMinters[i]);
        }
    }

    // ============ Admin: manage token list ============

    function setTokens(
        address[] calldata tokens_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokensInternal(tokens_);
    }

    function _setTokensInternal(address[] memory tokens_) internal {
        // clear previous flags
        for (uint256 i = 0; i < _tokens.length; i++) {
            isTokenRegistered[_tokens[i]] = false;
        }
        delete _tokens;
        // set new list
        for (uint256 i = 0; i < tokens_.length; i++) {
            address t = tokens_[i];
            require(t != address(0), "Token is zero");
            if (!isTokenRegistered[t]) {
                isTokenRegistered[t] = true;
                _tokens.push(t);
            }
        }
        emit TokensSet(_tokens);
    }

    // ============ Views ============

    function tokens() external view returns (address[] memory) {
        return _tokens;
    }

    function tokensLength() external view returns (uint256) {
        return _tokens.length;
    }

    // ============ Minting ============

    /// @notice Mint or transfer the same `amount` of each registered token to `to`.
    /// @dev If a token exposes `mint(address,uint256)`, it will be used. Otherwise, the faucet will
    ///      attempt to transfer from its own balance via SafeERC20.
    function batchMintSame(
        address to,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Recipient is zero");
        for (uint256 i = 0; i < _tokens.length; i++) {
            _mint(_tokens[i], to, amount);
        }
        emit BatchMint(msg.sender, to, amount, _tokens.length);
    }

    /// @notice Same as batchMintSame but for a provided subset of tokens.
    function batchMintSameSubset(
        address to,
        uint256 amount,
        address[] calldata subset
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Recipient is zero");
        for (uint256 i = 0; i < subset.length; i++) {
            address token = subset[i];
            require(isTokenRegistered[token], "Token not registered");
            _mint(token, to, amount);
        }
        emit BatchMint(msg.sender, to, amount, subset.length);
    }

    /// @notice Mint/transfer the same whole-token units across all tokens, scaling by each token's decimals.
    /// @dev Uses IERC20Metadata.decimals(); if a token doesn't implement it properly, this may revert.
    function batchMintSameUnits(
        address to,
        uint256 units
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Recipient is zero");
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint8 dec = IERC20Metadata(token).decimals();
            uint256 amount = units * (10 ** dec);
            _mint(token, to, amount);
        }
        emit BatchMintUnits(msg.sender, to, units, _tokens.length);
    }

    /// @notice Mint/transfer per-token raw amounts for the provided subset.
    function batchMintWithAmounts(
        address to,
        address[] calldata subset,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Recipient is zero");
        require(subset.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < subset.length; i++) {
            address token = subset[i];
            require(isTokenRegistered[token], "Token not registered");
            _mint(token, to, amounts[i]);
        }
        emit BatchMintWithAmounts(msg.sender, to, subset.length);
    }

    function _mint(address token, address to, uint256 amount) internal {
        IMintableERC20(token).mint(to, amount);
    }
}
