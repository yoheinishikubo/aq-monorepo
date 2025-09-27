import { clsx, type ClassValue } from "clsx";
import {
  AbiCoder,
  Contract,
  getCreate2Address,
  keccak256,
  solidityPacked,
  toUtf8Bytes,
  toUtf8String,
  ZeroAddress,
  Interface,
} from "ethers";
import contracts from "./contracts.json";
import chains from "./chains.json";
import abi from "./abi.json";
import { twMerge } from "tailwind-merge";
import { WalletProvider as WalletProviderType } from "@linenext/dapp-portal-sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import BeaconProxy from "@/lib/BeaconProxy.json";
import { Reply, URIEncodedStrings } from "@/types";

export const IS_KAIA: boolean =
  !!process.env.NEXT_PUBLIC_CHAIN_NAME &&
  ["kairos", "kaia"].includes(process.env.NEXT_PUBLIC_CHAIN_NAME);

export const FALLBACK = keccak256(toUtf8Bytes("FALLBACK"));

export const MAX_SIZE = 3068 * 8; // 8 originally

export const ADDRESSES: Record<string, string> = {
  ___HERE___: ZeroAddress,
};

export const Constants = {
  LABEL_CREATOR_ADDRESS: "Creator Address",
  LABEL_PLATFORM_ADDRESS: "Platform Address",
  LABEL_OWNER_ADDRESS: "Owner Address",
  LABEL_SUPPORTED_VALUE: "Supported Value",
};

export const decodeReply = (encoded: string): Reply => {
  const decoded = new AbiCoder().decode(
    [
      "string",
      "string",
      "string",
      "string",
      "string",
      "string",
      "uint256",
      "uint256",
      "uint256",
    ],
    encoded
  );
  return {
    username: decoded[0],
    message: decoded[1],
    signer: decoded[2],
    receiver: decoded[3],
    contractAddress: decoded[4],
    tokenId: decoded[5],
    value: BigInt(decoded[6]),
    mintedAt: Number(decoded[7]),
    repliedAt: Number(decoded[8]),
  };
};

export const encodeReply = (
  username: string,
  message: string,
  signer: string,
  receiver: string,
  contractAddress: string,
  tokenId: string,
  value: bigint,
  mintedAt: number,
  repliedAt: number = Date.now()
): string => {
  console.log({
    username,
    message,
    signer,
    receiver,
    contractAddress,
    tokenId,
    value,
    mintedAt,
    repliedAt,
  });
  const encoded = new AbiCoder().encode(
    [
      "string",
      "string",
      "string",
      "string",
      "string",
      "string",
      "uint256",
      "uint256",
      "uint256",
    ],
    [
      username,
      message,
      signer,
      receiver,
      contractAddress,
      tokenId,
      value,
      mintedAt,
      repliedAt,
    ]
  );
  return encoded;
};

export function formatAddress(address: string | null | undefined, chars = 4) {
  if (!address) {
    return "";
  }
  return `${address.substring(0, chars)}...${address.substring(
    address.length - chars
  )}`;
}

export function formatDisplayBalance(
  balance: bigint,
  decimals: string = "18",
  fractionDigits: number = 3,
  locale: string = "en-US"
): string {
  return (Number(balance) / Math.pow(10, Number(decimals))).toLocaleString(
    locale,
    {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }
  );
}

export function toHex(num: bigint | number) {
  return "0x" + num.toString(16);
}

export function multiplyDecimals(
  s: string,
  decimals: string,
  locale: string = "en-US"
): bigint {
  const decimalPlaces = parseInt(decimals, 10);
  if (isNaN(decimalPlaces) || decimalPlaces < 0) {
    throw new Error("Invalid decimals value");
  }

  // Get the locale-specific decimal separator
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(1.1);
  const decimalSeparator = parts.find((part) => part.type === "decimal")!.value;

  // Split the string by the locale-specific separator
  const [integerPart, fractionalPart = ""] = s.split(decimalSeparator);

  // Remove any non-digit characters from the integer part (e.g., thousands separators)
  const cleanedIntegerPart = integerPart.replace(/\D/g, "");

  // Pad or truncate the fractional part
  const adjustedFractionalPart = (
    fractionalPart + "0".repeat(decimalPlaces)
  ).slice(0, decimalPlaces);

  const combined = cleanedIntegerPart + adjustedFractionalPart;
  if (combined === "") {
    return 0n;
  }
  return BigInt(combined);
}

export const getURIEncodedStrings = (raw: string): URIEncodedStrings => ({
  raw,
  encoded: encodeURIComponent(raw),
  doubleEncoded: encodeURIComponent(encodeURIComponent(raw)),
});

export const generateDataArray = (data: string) => {
  const re = new RegExp(Object.keys(ADDRESSES).join("|"), "gim");
  data = data.replace(re, (match) => `\0${match}\0`);
  const sourceArray = data.split(/\0/);
  return sourceArray.map((source) => {
    const bytes = toUtf8Bytes(source);
    // console.log({ bytes: bytes.length });
    if (bytes.length <= MAX_SIZE) {
      return [bytes];
    } else {
      const m = splitUint8Array(bytes, MAX_SIZE);
      //   console.log({ m });
      return m;
    }
  });
};

export const getCreationCode = (data: Uint8Array) => {
  const dataWithPrefix = solidityPacked(["bytes", "bytes"], ["0x00", data]);

  return solidityPacked(
    ["bytes", "uint32", "bytes", "bytes"],
    [
      "0x63",
      toUtf8String(dataWithPrefix).length,
      "0x80600e6000396000f3",
      dataWithPrefix,
    ]
  );
};

export const getInitCode = (upgradeableBeacon: string, name: string) => {
  // const parent = new Contract(parentAddress, abi);

  const iface = new Interface(abi);
  const salt = keccak256(new AbiCoder().encode(["string"], [name]));
  return new AbiCoder().encode(
    ["address", "bytes"],
    [
      upgradeableBeacon,
      iface.encodeFunctionData("initialize", [contracts.factoryAQMint, salt]),
    ]
  );
};

// Generates init code using a precomputed bytes32 salt (no UTF-8 conversion)
export const getInitCodeWithSalt = (
  upgradeableBeaconAddress: string,
  salt: string
) => {
  const iface = new Interface(abi);
  return new AbiCoder().encode(
    ["address", "bytes"],
    [
      upgradeableBeaconAddress,
      iface.encodeFunctionData("initialize", [contracts.factoryAQMint, salt]),
    ]
  );
};

export const _getNFTAddress = (
  parentAddress: string,
  upgradeableBeaconForNFT: string,
  name: string
) => {
  const salt = keccak256(new AbiCoder().encode(["string"], [name]));
  const bytecode = solidityPacked(
    ["bytes", "bytes"],
    [BeaconProxy.bytecode, getInitCode(upgradeableBeaconForNFT, name)]
  );
  return getCreate2Address(parentAddress, salt, keccak256(bytecode));
};

export const _getVaultAddress = (
  parentAddress: string,
  upgradeableBeaconForVault: string,
  userAddress: string,
  creatorAddress: string
) => {
  const salt = keccak256(
    new AbiCoder().encode(["address", "address"], [userAddress, creatorAddress])
  );
  const bytecode = solidityPacked(
    ["bytes", "bytes"],
    [BeaconProxy.bytecode, getInitCodeWithSalt(upgradeableBeaconForVault, salt)]
  );
  return getCreate2Address(parentAddress, salt, keccak256(bytecode));
};

export const splitUint8Array = (buffer: Uint8Array, chunkSize: number) => {
  let result = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    if (i + chunkSize < buffer.length) {
      result.push(buffer.slice(i, i + chunkSize));
    } else {
      result.push(buffer.slice(i));
    }
  }
  return result;
};

export const getWalletAddress = async (walletProvider: WalletProviderType) => {
  if (!walletProvider) {
    throw new Error("Wallet provider is not available.");
  }

  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];

  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }
};
