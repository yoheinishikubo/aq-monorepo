// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IMetadata, URIEncodedStrings} from "./IMetadata.sol";
import {IERC721AQ} from "./IERC721AQ.sol"; // Assuming this is the interface for the NFT to be minted
import {BeaconProxy} from "./BeaconProxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

import {EIP712CommonVerifier} from "./EIP712CommonVerifier.sol";

interface IERC721AQVault {
    function configure(
        address admin_,
        address metadataAddress_,
        URIEncodedStrings memory name_,
        string memory symbol_,
        address ownerAddress_,
        address favoriteAddress_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) external;

    function onDeposit(uint256 value, uint24 share) external;
    function deposited() external view returns (uint256);
}

struct FactoryAQMintStorage {
    UpgradeableBeacon _upgradeableBeaconForNFT;
    UpgradeableBeacon _upgradeableBeaconForVault;
    address _metadataAddress;
    address _platformFeeRecipient;
    address addressOfStablecoin;
    address addressOfaStablecoin;
    address addressOfPool;
    mapping(address => address) _nftAddressByCreator;
    mapping(bytes32 => address) _vaultByOwnerAndFavoriteHash;
}

contract FactoryAQMint is
    Initializable,
    UUPSUpgradeable,
    AccessControlEnumerableUpgradeable,
    PausableUpgradeable,
    EIP712CommonVerifier
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    event FactoryAQMintInitialized(address indexed upgradeableBeaconForNFT);
    event FactoryAQMinted(address indexed minter, address indexed nft);
    event FactoryAQMintDeployed(
        address indexed deployed,
        bytes32 indexed salt,
        bytes initCode
    );
    event AQVaultDeposited(
        address indexed owner,
        address indexed favorite,
        uint256 value,
        uint24 share
    );

    error FactoryAQMint__InvalidShare(uint24 share);
    error FactoryAQMint__InvalidValue(uint256 value);
    error FactoryAQMint__InsufficientValue(uint256 value);

    error FactoryAQMint__InvalidSigner(address signer, address expectedSigner);
    error FactoryAQMint__LogicNotDeployed(address logicAddress);
    error FactoryAQMint__MetadataNotDeployed(address metadataAddress);
    error FactoryAQMint__BeaconNotDeployed(address beaconAddress);
    error FactoryAQMint__AlreadyMinted(address mintedAddress, bytes32 salt);
    error FactoryAQMint__InvalidAddress(address provided, address expected);

    // keccak256(abi.encode(uint256(keccak256("life.aq.storage.FactoryAQMint")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant StorageLocation =
        0xc334856ebf50604cd12c22fa3678131bf2bc40337feacc477836f2b76d0ae800;

    /**
     * @dev Returns the storage struct for this contract.
     * This is used for upgradeable contracts to ensure storage compatibility.
     */
    function _getStorage()
        private
        pure
        returns (FactoryAQMintStorage storage $)
    {
        assembly {
            $.slot := StorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the FactoryAQMint contract.
     * @param admin_ The address to be granted the DEFAULT_ADMIN_ROLE.
     * @param logicForNFT_ The address of the logic contract for the NFT beacon.
     * @param metadataAddress_ The address of the metadata contract.
     */
    function initialize(
        address admin_,
        address logicForNFT_,
        address logicForVault_,
        address metadataAddress_,
        address platformFeeRecipient_,
        address addressOfStablecoin_,
        address addressOfaStablecoin_,
        address addressOfPool_
    ) public initializer {
        if (admin_ == address(0)) {
            revert FactoryAQMint__InvalidAddress(admin_, address(0));
        }
        if (logicForNFT_ == address(0)) {
            revert FactoryAQMint__LogicNotDeployed(logicForNFT_);
        }
        if (metadataAddress_ == address(0)) {
            revert FactoryAQMint__MetadataNotDeployed(metadataAddress_);
        }
        if (logicForNFT_.code.length == 0) {
            revert FactoryAQMint__LogicNotDeployed(logicForNFT_);
        }
        if (metadataAddress_.code.length == 0) {
            revert FactoryAQMint__MetadataNotDeployed(metadataAddress_);
        }

        __UUPSUpgradeable_init();
        __AccessControlEnumerable_init();
        __Pausable_init();
        __EIP712CommonVerifier_init("FactoryAQMint", "0.0.1");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);

        FactoryAQMintStorage storage $ = _getStorage();

        $._upgradeableBeaconForNFT = new UpgradeableBeacon(
            logicForNFT_,
            address(this)
        );

        $._upgradeableBeaconForVault = new UpgradeableBeacon(
            logicForVault_,
            address(this)
        );

        $._metadataAddress = metadataAddress_;
        $.addressOfStablecoin = addressOfStablecoin_;
        $.addressOfaStablecoin = addressOfaStablecoin_;
        $.addressOfPool = addressOfPool_;
        $._platformFeeRecipient = platformFeeRecipient_;
    }

    /**
     * @dev Pauses the contract. Only callable by an account with the DEFAULT_ADMIN_ROLE.
     */
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract. Only callable by an account with the DEFAULT_ADMIN_ROLE.
     */
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function upgradeableBeaconForNFT()
        external
        view
        returns (UpgradeableBeacon)
    {
        FactoryAQMintStorage storage $ = _getStorage();
        return $._upgradeableBeaconForNFT;
    }

    function upgradeableBeaconForVault()
        external
        view
        returns (UpgradeableBeacon)
    {
        FactoryAQMintStorage storage $ = _getStorage();
        return $._upgradeableBeaconForVault;
    }

    function bulkGrantRole(
        bytes32 role,
        address[] memory accounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
        }
    }

    /**
     * @dev Internal helper to check if the NFT beacon is deployed.
     * @param $ The FactoryAQMintStorage struct.
     */
    function _checkNFTBeaconDeployed(
        FactoryAQMintStorage storage $
    ) private view {
        if (address($._upgradeableBeaconForNFT) == address(0)) {
            revert FactoryAQMint__BeaconNotDeployed(address(0));
        }
    }

    function deployNFT(
        URIEncodedStrings memory name_,
        string memory symbol_,
        address owner_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused returns (address) {
        bytes32 salt = keccak256(abi.encode(name_.raw));
        return
            _deployNFT(
                name_,
                symbol_,
                salt,
                owner_,
                platformFeeRecipient_,
                platformFeeFraction_
            );
    }

    /**
     * @dev Deploys a new NFT contract using a BeaconProxy and Create2.
     * @param name_ The URIEncodedStrings for the NFT.
     * @param symbol_ The symbol for the NFT.
     * @param _salt The salt used for Create2 deployment.
     * @return The address of the newly deployed NFT contract.
     */
    function _deployNFT(
        URIEncodedStrings memory name_,
        string memory symbol_,
        bytes32 _salt,
        address creator_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) internal returns (address) {
        FactoryAQMintStorage storage $ = _getStorage();
        _checkNFTBeaconDeployed($);

        // Do not initialize via BeaconProxy constructor; initialize after deployment so msg.sender is this factory
        bytes memory initCode = abi.encode(
            address($._upgradeableBeaconForNFT),
            abi.encodeWithSignature(
                "initialize(address,bytes32)",
                address(this),
                _salt
            )
        );

        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            initCode
        );

        address deployed = Create2.computeAddress(_salt, keccak256(bytecode));

        if (deployed.code.length != 0) {
            revert FactoryAQMint__AlreadyMinted(deployed, _salt);
        }

        Create2.deploy(0, _salt, bytecode);

        IERC721AQ(deployed).configure(
            address(this),
            $._metadataAddress,
            name_,
            symbol_,
            creator_,
            platformFeeRecipient_,
            platformFeeFraction_
        );

        $._nftAddressByCreator[creator_] = deployed;

        emit FactoryAQMintDeployed(deployed, _salt, initCode);

        return deployed;
    }

    function deposit(
        address owner_,
        address favorite_,
        uint24 share_,
        IERC721AQ.PermitRequest memory request
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        if (owner_ == address(0)) {
            revert FactoryAQMint__InvalidAddress(owner_, address(0));
        }
        if (favorite_ == address(0)) {
            revert FactoryAQMint__InvalidAddress(favorite_, address(0));
        }
        if (share_ > 10000) {
            revert FactoryAQMint__InvalidShare(share_);
        }
        if (request.value == 0) {
            revert FactoryAQMint__InvalidValue(request.value);
        }

        FactoryAQMintStorage storage $ = _getStorage();
        bytes32 _salt = keccak256(abi.encode(owner_, favorite_));

        // Do not initialize via BeaconProxy constructor; initialize after deployment so msg.sender is this factory
        bytes memory initCode = abi.encode(
            address($._upgradeableBeaconForVault),
            abi.encodeWithSignature(
                "initialize(address,bytes32)",
                address(this),
                _salt
            )
        );

        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            initCode
        );

        address deployed = Create2.computeAddress(_salt, keccak256(bytecode));

        if (deployed.code.length == 0) {
            Create2.deploy(0, _salt, bytecode);
            IERC721AQVault(deployed).configure(
                address(this),
                $._metadataAddress,
                URIEncodedStrings("AQVault", "AQVault", "AQVault"),
                "AQVault",
                owner_,
                favorite_,
                $._platformFeeRecipient,
                500
            );
            $._vaultByOwnerAndFavoriteHash[_salt] = deployed;
            emit FactoryAQMintDeployed(deployed, _salt, initCode);
        }

        uint256 deposited_ = IERC721AQVault(deployed).deposited();

        if (deposited_ + request.value < 1000e6) {
            revert FactoryAQMint__InsufficientValue(request.value);
        }

        _deposit(
            favorite_,
            $.addressOfStablecoin,
            request.value,
            share_,
            request
        );
    }

    function _deposit(
        address favorite,
        address tokenAddress,
        uint256 value,
        uint24 share_,
        IERC721AQ.PermitRequest memory request
    ) internal whenNotPaused {
        if (value == 0) {
            revert FactoryAQMint__InvalidValue(value);
        }
        if (tokenAddress == address(0)) {
            revert FactoryAQMint__InvalidAddress(tokenAddress, address(0));
        }
        if (request.owner == address(0)) {
            revert FactoryAQMint__InvalidAddress(request.owner, address(0));
        }
        if (request.spender != address(this)) {
            revert FactoryAQMint__InvalidAddress(
                request.spender,
                address(this)
            );
        }

        IERC20Permit(tokenAddress).permit(
            request.owner,
            request.spender,
            request.value,
            request.deadline,
            request.v,
            request.r,
            request.s
        );

        IERC20(tokenAddress).transferFrom(request.owner, address(this), value);

        FactoryAQMintStorage storage $ = _getStorage();

        bytes32 _salt = keccak256(abi.encode(request.owner, favorite));
        address vaultAddress_ = $._vaultByOwnerAndFavoriteHash[_salt];

        // Approve the pool to pull tokens supplied by the factory
        IERC20(tokenAddress).approve($.addressOfPool, value);

        IPool($.addressOfPool).supply(
            tokenAddress,
            request.value,
            vaultAddress_,
            0
        );

        IERC721AQVault(vaultAddress_).onDeposit(value, share_);
    }

    function vaultAddress(
        address owner_,
        address favorite_
    ) external view returns (address) {
        FactoryAQMintStorage storage $ = _getStorage();
        bytes32 _salt = keccak256(abi.encode(owner_, favorite_));
        return $._vaultByOwnerAndFavoriteHash[_salt];
    }

    /**
     * @dev Sets the implementation logic for the NFT beacon.
     * Only callable by an account with the PLATFORM_ROLE.
     * @param _logic The address of the new NFT logic contract.
     */
    function setImplementationForNFT(
        address _logic
    ) external onlyRole(PLATFORM_ROLE) {
        FactoryAQMintStorage storage $ = _getStorage();
        _checkNFTBeaconDeployed($);
        $._upgradeableBeaconForNFT.upgradeTo(_logic);
    }

    function _authorizeUpgrade(
        address
    ) internal virtual override onlyRole(UPGRADER_ROLE) {}

    receive() external payable {}

    fallback() external payable {}
}
