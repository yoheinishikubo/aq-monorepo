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
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoter} from "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";

import "./Utils.sol";

struct ERC721AQStorage {
    uint256 _nextTokenId;
    uint256 _deployedAt;
    mapping(uint256 => uint256) _mintedAt;
    address _creator;
    address _platformFeeRecipient;
    uint96 _platformFeeFraction;
    mapping(uint256 => uint256) _support;
    address _factoryAddress;
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

interface IUniswapV3Factory {
    // Returns the pool address for a given pair of tokens and a fee, or address(0) if it does not exist
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

contract ERC721AQ is ERC721Base, ReentrancyGuardUpgradeable, IERC5192 {
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    event AQMintSupported(
        address indexed supporter,
        address indexed recipient,
        uint256 indexed tokenId,
        uint256 value,
        uint256 timestamp
    );

    error ERC721AQ__IS_SBT(uint256 tokenId);

    // keccak256(abi.encode(uint256(keccak256("life.aq.storage.ERC721AQ")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant StorageLocation =
        0xad6e0451cb10677bdcd5881a524dcf172fca532850c636b855b38e305f3bbb00;

    function _getERC721AQStorage()
        private
        pure
        returns (ERC721AQStorage storage $)
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
        address creator_,
        address platformFeeRecipient_,
        uint96 platformFeeFraction_
    ) external onlyRole(CONFIGURATOR_ROLE) {
        if (platformFeeFraction_ > 10000) {
            revert("ERC721AQ: Platform fee fraction too high");
        }
        _configure(admin_, metadataAddress_, name_, symbol_);
        ERC721AQStorage storage $ = _getERC721AQStorage();
        $._creator = creator_;
        $._platformFeeRecipient = platformFeeRecipient_;
        $._platformFeeFraction = platformFeeFraction_;
        $._deployedAt = block.timestamp;
        $._factoryAddress = _msgSender();
        _grantRole(FACTORY_ROLE, $._factoryAddress);

        _mint(
            creator_,
            0 // Mint a token with ID 0 to the owner to initialize the contract
        );
        $._nextTokenId = 1;
    }

    function safeMintWithNativeToken() external payable nonReentrant {
        if (msg.value == 0) {
            revert("ERC721AQ: No value sent");
        }
        _mint(_msgSender(), msg.value, address(0));
    }

    function safeMintByFactory(
        address to,
        uint256 value
    ) external payable onlyRole(FACTORY_ROLE) returns (uint256) {
        ERC721AQStorage storage $ = _getERC721AQStorage();

        uint256 tokenId = $._nextTokenId++;
        $._mintedAt[tokenId] = block.timestamp;
        $._support[tokenId] = value;
        _safeMint(to, tokenId);
        emit AQMintSupported(to, $._creator, tokenId, value, block.timestamp);
        emit Locked(tokenId);
        return tokenId;
    }

    function safeMintWithNativeTokenToStablecoin(
        address swapFactoryAddress,
        address swapRouterAddress,
        address quoterAddress,
        uint24 fee,
        address stableCoinAddress
    ) external payable nonReentrant {
        if (msg.value == 0) {
            revert("ERC721AQ: No value sent");
        }

        // In the official version, the revenue is exchanged to stableCoin.

        IUniswapV3Factory factory = IUniswapV3Factory(swapFactoryAddress);
        if (factory.getPool(address(0), stableCoinAddress, fee) == address(0)) {
            revert("ERC721AQ: No pool for the token");
        }

        IQuoter quoter = IQuoter(quoterAddress);
        uint256 quotedAmountOut = quoter.quoteExactInputSingle(
            address(0),
            stableCoinAddress,
            fee,
            msg.value,
            0
        );

        if (quotedAmountOut < 5e5) {
            revert("ERC721AQ: Quoted amount is less than 5e5");
        }

        ISwapRouter swapRouter = ISwapRouter(swapRouterAddress);

        uint256 amountReceived = swapRouter.exactInputSingle{value: msg.value}(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(0), // Native token address on Sepolia
                tokenOut: stableCoinAddress,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: msg.value,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        _mint(_msgSender(), amountReceived, stableCoinAddress);
    }

    function safeMintWithERC20(
        address tokenAddress,
        PermitRequest memory request
    ) external nonReentrant {
        _handlePermit(tokenAddress, request);

        IERC20(tokenAddress).transferFrom(
            request.owner,
            address(this),
            request.value
        );

        _mint(request.owner, request.value, tokenAddress);
    }

    function safeMintWithERC20ToStablecoin(
        address tokenAddress,
        PermitRequest memory request,
        address swapFactoryAddress,
        address swapRouterAddress,
        address quoterAddress,
        uint24 fee,
        address stableCoinAddress
    ) external nonReentrant {
        IQuoter quoter = IQuoter(quoterAddress);
        uint256 quotedAmountOut = quoter.quoteExactInputSingle(
            tokenAddress,
            stableCoinAddress,
            fee,
            request.value,
            0
        );

        if (quotedAmountOut < 5e5) {
            revert("ERC721AQ: Quoted amount is less than 5e5");
        }

        ISwapRouter swapRouter = ISwapRouter(swapRouterAddress);

        IUniswapV3Factory factory = IUniswapV3Factory(swapFactoryAddress);
        if (
            factory.getPool(tokenAddress, stableCoinAddress, fee) == address(0)
        ) {
            revert("ERC721AQ: No pool for the token");
        }

        _handlePermit(tokenAddress, request);

        IERC20(tokenAddress).transferFrom(
            request.owner,
            address(this),
            request.value
        );

        IERC20(tokenAddress).approve(swapRouterAddress, request.value);

        uint256 amountReceived = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenAddress,
                tokenOut: stableCoinAddress,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: request.value,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        _mint(request.owner, amountReceived, stableCoinAddress);
    }

    function _handlePermit(
        address tokenAddress,
        PermitRequest memory request
    ) internal {
        if (request.value == 0) {
            revert("ERC721AQ: Value must be greater than zero");
        }
        if (request.deadline < block.timestamp) {
            revert("ERC721AQ: Permit has expired");
        }
        if (request.spender != address(this)) {
            revert("ERC721AQ: Spender must be this contract");
        }
        if (tokenAddress == address(0)) {
            revert("ERC721AQ: Token address cannot be zero");
        }

        if (IERC20(tokenAddress).balanceOf(request.owner) < request.value) {
            revert("ERC721AQ: Insufficient balance for permit");
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
    }

    function _mint(
        address to,
        uint256 value,
        address valueTokenAddress
    ) internal returns (uint256) {
        ERC721AQStorage storage $ = _getERC721AQStorage();

        uint256 platformFee = (value * $._platformFeeFraction) / 10000;
        uint256 amountToOwner = value - platformFee;

        address creator = $._creator;

        if (platformFee > 0) {
            if (valueTokenAddress == address(0)) {
                (bool success, ) = $._platformFeeRecipient.call{
                    value: platformFee
                }("");
                if (!success) {
                    revert("ERC721AQ: Platform fee transfer failed");
                }
            } else {
                IERC20(valueTokenAddress).transfer(
                    $._platformFeeRecipient,
                    platformFee
                );
            }
        }

        if (amountToOwner > 0) {
            if (valueTokenAddress == address(0)) {
                (bool success, ) = creator.call{value: amountToOwner}("");
                if (!success) {
                    revert("ERC721AQ: Owner transfer failed");
                }
            } else {
                IERC20(valueTokenAddress).transfer(creator, amountToOwner);
            }
        }

        uint256 tokenId = $._nextTokenId++;
        $._mintedAt[tokenId] = block.timestamp;
        $._support[tokenId] = value;

        _safeMint(to, tokenId);
        emit AQMintSupported(to, creator, tokenId, value, block.timestamp);
        emit Locked(tokenId);
        return tokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        ownerOf(tokenId);

        bytes32 salt = keccak256(abi.encode(address(this)));

        URIEncodedStrings memory name = _name();
        ERC721AQStorage storage $ = _getERC721AQStorage();

        string memory checksumAddress = Strings.toChecksumHexString(
            address(this)
        );

        string memory ownerAddress = Strings.toChecksumHexString(
            ownerOf(tokenId)
        );

        bytes[] memory substitutes = new bytes[](12);
        substitutes[0] = bytes(ownerAddress);
        substitutes[1] = bytes(Strings.toString($._support[tokenId]));
        substitutes[2] = bytes(name.doubleEncoded);
        substitutes[3] = bytes(checksumAddress);

        substitutes[4] = bytes(
            Utils.datetimeStringDoubleEncoded($._mintedAt[tokenId], 0, "UTC")
        );
        substitutes[5] = bytes(
            Utils.formatTokenValue($._support[tokenId], 6, 3) // 6 for USDT
        );
        substitutes[6] = bytes(ownerAddress);
        substitutes[7] = bytes(name.doubleEncoded);
        substitutes[8] = bytes(checksumAddress); // EIP-55 encoded address;
        substitutes[9] = bytes(Strings.toString(tokenId));
        substitutes[10] = bytes(
            Utils.datetimeStringDoubleEncoded($._mintedAt[tokenId], 0, "UTC")
        );
        substitutes[11] = bytes(name.encoded);

        address metadataAddress = _metadataAddress();

        if (metadataAddress == address(0)) {
            revert("ERC721AQ: Metadata address is not set");
        }

        return
            IMetadata(_metadataAddress()).readAsStringWithSubstitutes(
                salt,
                substitutes
            );
    }

    function contractURI() public view override returns (string memory) {
        bytes32 salt = keccak256(abi.encode(address(this)));
        URIEncodedStrings memory name = _name();

        ERC721AQStorage storage $ = _getERC721AQStorage();

        string memory checksumAddress = Strings.toChecksumHexString(
            address(this)
        );

        bytes[] memory substitutes = new bytes[](12);
        substitutes[0] = bytes("Owner%2520Address%2520Here");
        substitutes[1] = bytes("Supported%2520Value%2520Here");
        substitutes[2] = bytes(name.doubleEncoded);
        substitutes[3] = bytes(checksumAddress);
        substitutes[4] = bytes(
            Utils.datetimeStringDoubleEncoded($._deployedAt, 0, "UTC")
        );
        substitutes[5] = bytes("Value%2520Here");
        substitutes[6] = bytes("Supporter%2520Address%2520Here");
        substitutes[7] = bytes(name.doubleEncoded);
        substitutes[8] = bytes(checksumAddress); // EIP-55 encoded address;
        substitutes[9] = bytes("ID%2520Here");
        substitutes[10] = bytes(
            Utils.datetimeStringDoubleEncoded($._deployedAt, 0, "UTC")
        );
        substitutes[11] = bytes(name.encoded);

        address metadataAddress = _metadataAddress();

        if (metadataAddress == address(0)) {
            revert("ERC721AQ: Metadata address is not set");
        }

        try
            IMetadata(_metadataAddress()).readAsStringWithSubstitutes(
                salt,
                substitutes
            )
        returns (string memory uri) {
            return uri;
        } catch {
            try
                IMetadata(_metadataAddress()).fallbackStringWithSubstitutes(
                    substitutes
                )
            returns (string memory uri) {
                return uri;
            } catch {
                revert("ERC721AQ: Invalid metadata");
            }
        }
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Base) returns (address from) {
        address prevOwner = _ownerOf(tokenId);
        if (prevOwner != address(0) && to != address(0)) {
            revert ERC721AQ__IS_SBT(tokenId);
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
