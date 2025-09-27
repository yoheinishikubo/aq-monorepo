// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {ERC721Base} from "./ERC721Base.sol";
import {IMetadata, URIEncodedStrings} from "./IMetadata.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

import "./Utils.sol";

struct ERC721AQVaultStorage {
    address _ownerAddress;
    address _favoriteAddress;
    address _factoryAddress;
    address _platformFeeRecipient;
    uint256 _deployedAt;
    uint256 _valueDeposited;
    uint24 _share;
    uint24 _feeFraction;
    mapping(uint256 => uint256) _mintedAt;
}

struct PermitRequest {
    address owner;
    address spender;
    uint256 value;
    uint256 deadline;
    uint8 v;
    bytes32 r;
    bytes32 s;
}

// ERC-5192 (Minimal Soulbound) interface
/* is IERC165 */ interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

contract ERC721AQVault is ERC721Base, ReentrancyGuardUpgradeable, IERC5192 {
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    event AQVault_Deposited(
        address indexed owner,
        address indexed favorite,
        uint256 value,
        uint256 share
    );

    error ERC721AQVault__IS_SBT(uint256 tokenId);
    error ERC721AQVault__InvalidPlatformFeeFraction(uint256 feeFraction);
    error ERC721AQVault__Unauthorized(address caller);

    // keccak256(abi.encode(uint256(keccak256("life.aq.storage.ERC721AQVault")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant StorageLocation =
        0xe5a7380e47259481204c59c2d3f664e4f0d2149c284458e111bc6555ced81500;

    function _getERC721AQVaultStorage()
        private
        pure
        returns (ERC721AQVaultStorage storage $)
    {
        assembly {
            $.slot := StorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin_, bytes32) public initializer {
        __ERC721Base_init();
        __ReentrancyGuard_init();
        _grantRole(CONFIGURATOR_ROLE, admin_);
    }

    function configure(
        address admin_,
        address metadataAddress_,
        URIEncodedStrings memory name_,
        string memory symbol_,
        address ownerAddress_,
        address favoriteAddress_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) external onlyRole(CONFIGURATOR_ROLE) {
        _configure(admin_, metadataAddress_, name_, symbol_);
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();

        $._deployedAt = block.timestamp;
        $._factoryAddress = _msgSender();
        $._ownerAddress = ownerAddress_;
        $._favoriteAddress = favoriteAddress_;
        $._platformFeeRecipient = platformFeeRecipient_;

        if (platformFeeFraction_ > 10000) {
            revert ERC721AQVault__InvalidPlatformFeeFraction(
                platformFeeFraction_
            );
        }
        $._feeFraction = uint24(platformFeeFraction_);
        _grantRole(FACTORY_ROLE, $._factoryAddress);

        _mint(ownerAddress_, 0);
    }

    function onDeposit(
        uint256 value,
        uint24 share
    ) external onlyRole(FACTORY_ROLE) {
        if (value == 0) {
            return;
        }

        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        $._valueDeposited += value;
        $._share = share;

        emit AQVault_Deposited(
            $._ownerAddress,
            $._favoriteAddress,
            value,
            share
        );
    }

    function _withdrawableInterest(
        address tokenAddress
    ) internal view returns (uint256) {
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        if ($._valueDeposited == 0) {
            return 0;
        }

        uint256 currentBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (currentBalance <= $._valueDeposited) {
            return 0;
        }

        uint256 profit = currentBalance - $._valueDeposited;
        return profit;
    }

    function _withdrawInterest(
        address poolAddress,
        address tokenAddress
    ) internal nonReentrant {
        uint256 withdrawableAmount = _withdrawableInterest(tokenAddress);
        if (withdrawableAmount == 0) {
            return;
        }

        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        uint256 fee = (withdrawableAmount * $._feeFraction) / 10000;
        uint256 netAmount = withdrawableAmount - fee;
        uint256 amountToOwner = (netAmount * (10000 - $._share)) / 10000;
        uint256 amountToFavorite = netAmount - amountToOwner;
        IPool(poolAddress).withdraw(tokenAddress, fee, $._platformFeeRecipient);
        IPool(poolAddress).withdraw(
            tokenAddress,
            amountToOwner,
            $._ownerAddress
        );
        IPool(poolAddress).withdraw(
            tokenAddress,
            amountToFavorite,
            $._favoriteAddress
        );
    }

    function withdrawInterestByFactory(
        address poolAddress,
        address tokenAddress
    ) external onlyRole(FACTORY_ROLE) {
        _withdrawInterest(poolAddress, tokenAddress);
    }

    function withdrawableInterest(
        address tokenAddress
    ) external view returns (uint256) {
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        if (_msgSender() != $._ownerAddress) {
            revert ERC721AQVault__Unauthorized(_msgSender());
        }
        return _withdrawableInterest(tokenAddress);
    }

    function _refund(
        address poolAddress,
        address tokenAddress
    ) internal nonReentrant {
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        if ($._valueDeposited == 0) {
            return;
        }

        _withdrawInterest(poolAddress, tokenAddress);
        IPool(poolAddress).withdraw(
            tokenAddress,
            $._valueDeposited,
            $._ownerAddress
        );
        $._valueDeposited = 0;
    }

    function refund(address poolAddress, address tokenAddress) external {
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        if (_msgSender() != $._ownerAddress) {
            revert ERC721AQVault__Unauthorized(_msgSender());
        }
        _refund(poolAddress, tokenAddress);
    }

    function refundByFactory(
        address poolAddress,
        address tokenAddress
    ) external onlyRole(FACTORY_ROLE) {
        _refund(poolAddress, tokenAddress);
    }

    function deposited() external view returns (uint256) {
        ERC721AQVaultStorage storage $ = _getERC721AQVaultStorage();
        return $._valueDeposited;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Base) returns (address from) {
        address prevOwner = _ownerOf(tokenId);
        if (prevOwner != address(0) && to != address(0)) {
            revert ERC721AQVault__IS_SBT(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function locked(uint256 tokenId) external view returns (bool) {
        ownerOf(tokenId); // to check existence
        return true;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721Base) returns (bool) {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    receive() external payable {}

    fallback() external payable {}
}
