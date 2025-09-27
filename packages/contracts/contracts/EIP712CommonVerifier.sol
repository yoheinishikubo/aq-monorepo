// SPDX-License-Identifier: UNLICENSED
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

struct Signature {
    address signer;
    bytes32 r;
    bytes32 s;
    uint8 v;
}

struct Payload {
    bytes32 nonce;
    uint256 signersRequired;
    bytes data;
}

struct EIP712CommonVerifierStorage {
    mapping(bytes32 => bool) _usedNonces;
}

abstract contract EIP712CommonVerifier is EIP712Upgradeable {
    bytes32 private constant TYPEHASH_PAYLOAD =
        keccak256("Payload(bytes32 nonce,uint256 signersRequired,bytes data)");

    // keccak256(abi.encode(uint256(keccak256("life.aq.storage.EIP712CommonVerifier")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant StorageLocation =
        0xda92a292d03652facb6b9f8850dda798f5459197d9edfdadfd15f6fa08230200;

    error EIP712CommonVerifierInvalidSignature(
        address signer,
        address expectedSigner
    );

    error EIP712CommonVerifierNonceUsed(bytes32 nonce);

    function _getEIP712CommonVerifierStorage()
        private
        pure
        returns (EIP712CommonVerifierStorage storage $)
    {
        assembly {
            $.slot := StorageLocation
        }
    }

    function __EIP712CommonVerifier_init(
        string memory name,
        string memory version
    ) internal onlyInitializing {
        __EIP712_init(name, version);
    }

    function _hashPayload(
        Payload memory payload
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        TYPEHASH_PAYLOAD,
                        payload.nonce,
                        payload.signersRequired,
                        keccak256(payload.data)
                    )
                )
            );
    }

    function _signer(
        Payload memory payload,
        Signature memory signature
    ) internal view returns (address) {
        if (signature.signer == address(0)) {
            revert("EIP721CommonVerifier: Invalid signer address");
        }

        bytes32 digest = _hashPayload(payload);

        bytes memory sig = abi.encodePacked(
            signature.r,
            signature.s,
            signature.v
        );

        address signer = ECDSA.recover(digest, sig);
        if (signer != signature.signer) {
            revert EIP712CommonVerifierInvalidSignature(
                signer,
                signature.signer
            );
        }

        return signer;
    }

    function _checkIfNonceUsed(bytes32 nonce) internal {
        EIP712CommonVerifierStorage
            storage $ = _getEIP712CommonVerifierStorage();
        if ($._usedNonces[nonce]) {
            revert EIP712CommonVerifierNonceUsed(nonce);
        }
        $._usedNonces[nonce] = true;
    }
    // TODO: _verifyAndUseNonce
}
