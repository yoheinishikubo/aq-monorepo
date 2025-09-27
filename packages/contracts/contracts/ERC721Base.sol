// SPDX-License-Identifier: UNLICENSED
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";

import {IMetadata, URIEncodedStrings} from "./IMetadata.sol";

struct ERC721BaseStorage {
    address _metadataAddress;
    URIEncodedStrings _name;
    string _symbol;
}

abstract contract ERC721Base is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    ERC721PausableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant CONFIGURATOR_ROLE = keccak256("CONFIGURATOR_ROLE");

    // keccak256(abi.encode(uint256(keccak256("life.aq.storage.ERC721Base")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant StorageLocation =
        0x4a2cb2b35483caa065c2870fc5a1e31446420256e153da65903d61254509cc00;

    function _getStorage() private pure returns (ERC721BaseStorage storage $) {
        assembly {
            $.slot := StorageLocation
        }
    }

    function __ERC721Base_init() internal onlyInitializing {
        __ERC721_init("", ""); // Base URI, name, and symbol can be set later or handled by metadata contract
        __AccessControl_init();
        __ERC721Pausable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
        __ERC721Enumerable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(CONFIGURATOR_ROLE, _msgSender());
        __ERC721Base_init_unchained();
    }

    function __ERC721Base_init_unchained() internal onlyInitializing {}

    function _configure(
        address defaultAdmin,
        address metadataAddress_,
        URIEncodedStrings memory name_,
        string memory symbol_
    ) internal {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(UPGRADER_ROLE, defaultAdmin);

        ERC721BaseStorage storage $ = _getStorage();

        $._name = name_;
        $._symbol = symbol_;
        $._metadataAddress = metadataAddress_;

        if (defaultAdmin != _msgSender()) {
            _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
            _revokeRole(CONFIGURATOR_ROLE, _msgSender());
        }
    }

    function _name() internal view virtual returns (URIEncodedStrings memory) {
        ERC721BaseStorage storage $ = _getStorage();
        return $._name;
    }

    function _metadataAddress() internal view virtual returns (address) {
        ERC721BaseStorage storage $ = _getStorage();
        return $._metadataAddress;
    }

    function contractURI() public view virtual returns (string memory) {
        bytes32 hash = keccak256(abi.encode(address(this)));
        ERC721BaseStorage storage $ = _getStorage();
        return
            IMetadata($._metadataAddress).readAsStringWithSubstitutes(
                hash,
                new bytes[](0)
            );
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override(ERC721Upgradeable) returns (string memory) {
        // Check if token exists before querying URI by attempting to get its owner.
        // ownerOf reverts if the token does not exist.
        ownerOf(tokenId);
        bytes32 hash = keccak256(abi.encode(address(this), tokenId));
        ERC721BaseStorage storage $ = _getStorage();
        return
            IMetadata($._metadataAddress).readAsStringWithSubstitutes(
                hash,
                new bytes[](0)
            );
    }

    function name() public view virtual override returns (string memory) {
        ERC721BaseStorage storage $ = _getStorage();
        return $._name.raw;
    }

    function symbol() public view virtual override returns (string memory) {
        ERC721BaseStorage storage $ = _getStorage();
        return $._symbol;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function metadataUpdated(uint256 id) external onlyRole(MINTER_ROLE) {
        emit IERC4906.MetadataUpdate(id);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(
            ERC721Upgradeable,
            AccessControlUpgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        virtual
        override(
            ERC721Upgradeable,
            ERC721PausableUpgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 amount
    )
        internal
        virtual
        override(ERC721EnumerableUpgradeable, ERC721Upgradeable)
    {
        super._increaseBalance(account, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override {}
}
