// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {URIEncodedStrings} from "./IMetadata.sol";

interface IERC721AQ {
    struct PermitRequest {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function configure(
        address admin_,
        address metadataAddress_,
        URIEncodedStrings memory name_,
        string memory symbol_,
        address owner_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) external;

    function safeMintWithNativeToken() external payable;

    function safeMintWithERC20(
        address tokenAddress,
        PermitRequest memory request
    ) external;

    function safeMintByFactory(address to, uint256 value) external payable;
}
