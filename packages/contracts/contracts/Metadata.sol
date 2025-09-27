// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import "@yoheinishikubo/sstore2/contracts/SSTORE2.sol";

/**
 * @title Metadata
 * @dev Contract for storing and retrieving metadata.
 */
contract Metadata is
    Initializable,
    AccessControlEnumerableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");
    bytes32 public constant FALLBACK = keccak256("FALLBACK");

    mapping(bytes32 => address[]) private _addressesForHash;

    event Written(address indexed key, bytes32 indexed hash);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Disable the initializer to prevent reinitialization
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with the given admin and writers.
     * @param admin_ The address of the admin.
     * @param writers_ An array of addresses with writer role.
     */
    function initialize(
        address admin_,
        address[] memory writers_
    ) public initializer {
        // Initialize the contract
        __AccessControlEnumerable_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        for (uint256 i = 0; i < writers_.length; i++) {
            _grantRole(WRITER_ROLE, writers_[i]);
        }
    }

    /**
     * @dev Internal function to write data to SSTORE2.
     * @param data The data to write.
     * @return key The address of the written data.
     */
    function _write(bytes memory data) internal returns (address) {
        // If data is empty, emit an event with address(0) and the hash of empty data
        if (data.length == 0) {
            emit Written(address(0), keccak256(data));
            return address(0);
        }
        // Write data to SSTORE2 and get the key (address)
        address key = SSTORE2.write2(data);
        // Emit an event indicating the data has been written
        emit Written(key, keccak256(data));
        return key;
    }

    /**
     * @dev Writes data to SSTORE2.
     * @param data The data to write.
     * @return key The address of the written data.
     */
    function write(
        bytes memory data
    ) public onlyRole(WRITER_ROLE) returns (address) {
        return _write(data);
    }

    /**
     * @dev Writes multiple data entries to SSTORE2.
     * @param data An array of bytes to write.
     * @return keys An array of addresses representing the keys of the written data.
     */
    function bulkWrite(
        bytes[] memory data
    ) public onlyRole(WRITER_ROLE) returns (address[] memory) {
        // Create an array to store the keys
        address[] memory keys = new address[](data.length);
        // Iterate through the data array and write each entry
        for (uint256 i = 0; i < data.length; i++) {
            keys[i] = _write(data[i]);
        }
        // Return the array of keys
        return keys;
    }

    function setKeysForHash(
        bytes32 hash,
        address[] memory keys,
        bool overwrite
    ) external onlyRole(WRITER_ROLE) {
        if (keys.length == 0) {
            revert("Metadata: No keys provided");
        }

        if (!overwrite) {
            if (_addressesForHash[hash].length > 0) {
                revert("Metadata: Keys already exist for this hash");
            }
        }

        _addressesForHash[hash] = keys;
    }

    /**
     * @dev Sets the keys for a given hash.
     * @param hash The hash to set the keys for.
     * @param keys An array of addresses representing the keys.
     */
    function setKeysForHash(
        bytes32 hash,
        address[] memory keys
    ) external onlyRole(WRITER_ROLE) {
        if (keys.length == 0) {
            revert("Metadata: No keys provided");
        }

        _addressesForHash[hash] = keys;
    }

    /**
     * @dev Internal function to read data as a string with substitutes.
     * @param hash The hash to retrieve the keys for.
     * @param substitutes An array of bytes to substitute for address(0) keys.
     * @return The resulting concatenated string.
     */
    function _stringWithSubstitutes(
        bytes32 hash,
        bytes[] memory substitutes
    ) internal view returns (string memory) {
        // Get the keys associated with the hash
        address[] memory keys = _addressesForHash[hash];

        // Revert if no data is found for the hash
        if (keys.length == 0) {
            revert("Metadata: No data found for this hash");
        }

        bytes memory result;
        uint256 j = 0; // Index for substitutes array

        // Iterate through the keys
        for (uint256 i = 0; i < keys.length; i++) {
            if (keys[i] == address(0)) {
                if (substitutes.length > j) {
                    result = abi.encodePacked(result, substitutes[j]);
                    j++;
                }
                continue;
            }

            result = abi.encodePacked(result, SSTORE2.read(keys[i]));
        }
        return string(result);
    }

    /**
     * @dev Reads data as a string with substitutes.
     * @param substitutes An array of bytes to substitute.
     * @return The resulting string.
     */
    function fallbackStringWithSubstitutes(
        bytes[] memory substitutes
    ) external view returns (string memory) {
        return _stringWithSubstitutes(FALLBACK, substitutes);
    }

    /**
     * @dev Reads data as a string with substitutes.
     * @param salt The salt to use for generating the hash.
     * @param substitutes An array of bytes to substitute.
     * @return The resulting string.
     */
    function readAsStringWithSubstitutes(
        bytes32 salt,
        bytes[] memory substitutes
    ) external view returns (string memory) {
        bytes32 hash = keccak256(abi.encode(_msgSender(), salt));
        return _stringWithSubstitutes(hash, substitutes);
    }

    /**
     * @dev Grants a role to multiple accounts.
     * @param role The role to grant.
     * @param accounts An array of addresses to grant the role to.
     */
    function bulkGrantRole(
        bytes32 role,
        address[] memory accounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
        }
    }

    /**
     * @dev Revokes a role from multiple accounts.
     * @param role The role to revoke.
     * @param accounts An array of addresses to revoke the role from.
     */
    function bulkRevokeRole(
        bytes32 role,
        address[] memory accounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
        }
    }

    /**
     * @dev Authorizes an upgrade.
     * @param newImplementation The address of the new implementation.
     */
    /**
     * @dev Authorizes an upgrade.
     * This function is intentionally left empty to allow any address to upgrade.
     * In a production environment, this should be restricted.
     * @param newImplementation The address of the new implementation.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override {}
}
