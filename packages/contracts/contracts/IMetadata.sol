// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

struct URIEncodedStrings {
    string raw;
    string encoded;
    string doubleEncoded;
}

/**
 * @title IMetadata
 * @dev Interface for the Metadata contract.
 */
interface IMetadata {
    event Written(address indexed key, bytes32 indexed hash);

    function initialize(address admin_, address[] memory writers_) external;

    function write(bytes memory data) external returns (address);

    function bulkWrite(bytes[] memory data) external returns (address[] memory);

    function setKeysForHash(bytes32 hash, address[] memory keys) external;

    function fallbackStringWithSubstitutes(
        bytes[] memory substitutes
    ) external view returns (string memory);

    function readAsStringWithSubstitutes(
        bytes32 salt,
        bytes[] memory substitutes
    ) external view returns (string memory);
}
