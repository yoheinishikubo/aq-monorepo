"use server";

import { ContractTransaction, getAddress } from "ethers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import contracts from "@/lib/contracts.json";
import chains from "@/lib/chains.json";
import abi from "@/lib/abi.json";

import {
  ADDRESSES,
  Constants,
  generateDataArray,
  getCreationCode,
  _getNFTAddress,
  getURIEncodedStrings,
  FALLBACK,
  IS_KAIA,
  _getVaultAddress,
} from "@/lib/utils";
import {
  AbiCoder,
  Contract,
  getCreate2Address,
  keccak256,
  toUtf8String,
  Interface,
} from "ethers";
import {
  TokenInfo,
  EtherscanLog,
  EtherscanResponse,
  PromiseFunction,
  Message,
  SupportLog,
  Metadata,
  PaginatedResult,
  KaiaEventLogsResponse,
  DepositLog,
} from "@/types";

const permitTypes = {
  Permit: [
    {
      name: "owner",
      type: "address",
    },
    {
      name: "spender",
      type: "address",
    },
    {
      name: "value",
      type: "uint256",
    },
    {
      name: "nonce",
      type: "uint256",
    },
    {
      name: "deadline",
      type: "uint256",
    },
  ],
};

const factoryAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "raw",
            type: "string",
          },
          {
            internalType: "string",
            name: "encoded",
            type: "string",
          },
          {
            internalType: "string",
            name: "doubleEncoded",
            type: "string",
          },
        ],
        internalType: "struct URIEncodedStrings",
        name: "name_",
        type: "tuple",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
      {
        internalType: "address",
        name: "owner_",
        type: "address",
      },
      {
        internalType: "address",
        name: "platformFeeRecipient_",
        type: "address",
      },
      {
        internalType: "uint96",
        name: "platformFeeFraction_",
        type: "uint96",
      },
    ],
    name: "deployNFT",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const metadataAbi = [
  {
    inputs: [
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "write",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hash",
        type: "bytes32",
      },
      {
        internalType: "address[]",
        name: "keys",
        type: "address[]",
      },
    ],
    name: "setKeysForHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const ethCall = async (
  contractAddress: string,
  method: string,
  params: any[] = []
): Promise<any> => {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }
  const iface = new Interface(abi);
  const calldata = iface.encodeFunctionData(method, params);
  const response = await fetch(rpcURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: contractAddress, data: calldata }, "latest"],
      id: 1,
    }),
  });
  const { result }: { result: string } = await response.json();
  if (!result) {
    throw new Error(`Failed to call ${method} on contract ${contractAddress}`);
  }
  return iface.decodeFunctionResult(method, result);
};

export const getUsernameFromAddress = async (
  address: string
): Promise<string> => {
  const { env } = getCloudflareContext();
  if (!env.CONTRACTS_REVERSE) {
    throw new Error("CONTRACTS_REVERSE binding is not available.");
  }
  const username = await env.CONTRACTS_REVERSE.get(address.toLowerCase());
  if (!username) {
    throw new Error(`Username not found for address: ${address}`);
  }
  return username;
};

export const mintNFTTransaction = async (
  nftAddress: string,
  value: bigint
): Promise<ContractTransaction> => {
  const contract = new Contract(nftAddress, abi);

  // const tx = await contract.safeMintWithNativeToken.populateTransaction({
  //   value,
  // });

  const tx =
    await contract.safeMintWithNativeTokenToStableCoin.populateTransaction(
      contracts.swapFactory,
      contracts.swapRouter,
      contracts.quoter,
      3000,
      contracts.usdt,
      {
        value,
      }
    );

  return tx;
};

export const mintNFTWithERC20 = async (
  nftAddress: string,
  tokenAddress: string,
  params: any
): Promise<bigint> => {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  console.log("Minting NFT with params:", params);

  const currentBalance = await balanceOf(nftAddress, params.owner);

  const contract = new Contract(nftAddress, abi);

  // const tx = await contract.safeMintWithERC20.populateTransaction(
  //   tokenAddress,
  //   params
  // );

  const tx = await contract.safeMintWithERC20ToStablecoin.populateTransaction(
    tokenAddress,
    params,
    contracts.swapFactory,
    contracts.swapRouter,
    contracts.quoter,
    3000,
    contracts.usdt
  );

  await fetch(process.env.RUNNER_URL!, {
    method: "POST",
    body: JSON.stringify({ tx, keyVersion: "1", rpcURL }),
    headers: {
      Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
      "Content-Type": "application/json",
    },
  });

  return currentBalance;
};

export const deployNFT = async (
  chainName: keyof typeof chains,
  factoryAddress: string,
  name: string,
  creator: string,
  platformFeeRecipient: string,
  platformFeeFraction: number
) => {
  const { rpcURL } = chains[chainName];

  const factory = new Contract(factoryAddress, factoryAbi);

  console.log({ name });

  const uriEncodedName = getURIEncodedStrings(name);

  const tx = await factory.deployNFT.populateTransaction(
    uriEncodedName,
    "AQM",
    creator,
    platformFeeRecipient,
    platformFeeFraction
  );

  const body = JSON.stringify({
    tx,
    keyVersion: "1",
    rpcURL,
  });

  try {
    const response = await fetch(process.env.RUNNER_URL!, {
      method: "POST",
      body,
      headers: {
        Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
        "Content-Type": "application/json",
      },
    });
    console.log("Deploy NFT response:", response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error deploying NFT:", response.status, errorText);
      throw new Error(
        `Failed to deploy NFT: ${response.status} - ${errorText}`
      );
    }
  } catch (error) {
    console.error("Network error during deployNFT fetch:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

export const getTypedData = async (
  nftAddress: string,
  tokenAddress: string,
  userAddress: string,
  value: bigint
): Promise<any> => {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  console.log({ tokenAddress, nftAddress, userAddress, value });

  const nonce = await ethCall(tokenAddress, "nonces", [userAddress]).then(
    (res: any) => BigInt(res)
  );
  console.log("Nonce:", nonce.toString());

  const deadline = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour from now

  const values = {
    owner: userAddress,
    spender: nftAddress,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };

  const domain = await ethCall(tokenAddress, "eip712Domain", []).then(
    (domain: {
      name: string;
      version: string;
      chainId: bigint;
      verifyingContract: string;
    }) => ({
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    })
  );

  return {
    domain,
    types: permitTypes,
    values,
  };
};

export const getTokenInfo = async (
  contractAddress: string
): Promise<TokenInfo> => {
  const { env } = getCloudflareContext();
  if (!env.TOKENS) {
    throw new Error("TOKENS binding is not available.");
  }
  const cachedTokenInfo = await env.TOKENS.get(contractAddress);
  if (cachedTokenInfo) {
    console.log("Token info found in cache for contract:", contractAddress);
    return JSON.parse(cachedTokenInfo);
  }

  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  const name = await ethCall(contractAddress, "name").then((res: any) => res);
  if (!name) {
    throw new Error(`Token name not found for contract: ${contractAddress}`);
  }

  const symbol = await ethCall(contractAddress, "symbol").then(
    (res: any) => res
  );
  if (!symbol) {
    throw new Error(`Token symbol not found for contract: ${contractAddress}`);
  }
  const decimals = await ethCall(contractAddress, "decimals").then((res: any) =>
    res.toString()
  );
  if (!decimals) {
    throw new Error(
      `Token decimals not found for contract: ${contractAddress}`
    );
  }

  const tokenInfo = {
    name,
    symbol,
    decimals,
    address: contractAddress,
  };

  env.TOKENS.put(contractAddress, JSON.stringify(tokenInfo));

  return tokenInfo;
};

export const getTokenId = async (
  contractAddress: string,
  userAddress: string
): Promise<bigint> => {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  const balance = await balanceOf(contractAddress, userAddress); // Update cache

  const tokenId = await ethCall(contractAddress, "tokenOfOwnerByIndex", [
    userAddress,
    balance - 1n,
  ]).then((res: any) => BigInt(res));

  return tokenId;
};

export const fetchMetadataForToken = async (
  contractAddress: string,
  tokenId: bigint
): Promise<Metadata & { message?: Message }> => {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  const metadataJson = await ethCall(contractAddress, "tokenURI", [
    tokenId,
  ]).then((res: any) => {
    if (!res) {
      throw new Error(
        `Token URI not found for contract: ${contractAddress}, tokenId: ${tokenId}`
      );
    }

    return res[0].replace("data:application/json,", "");
  });

  const metadata = JSON.parse(decodeURIComponent(metadataJson));
  console.log(metadata);

  const message = await getMessage(contractAddress, tokenId.toString());
  if (message) {
    metadata.message = message;
  }

  return metadata;
};

export const fetchMetadata = async (
  contractAddress: string
): Promise<Metadata> => {
  const { env } = getCloudflareContext();
  if (!env.METADATA) {
    throw new Error("METADATA binding is not available.");
  }

  const cachedMetadata = await env.METADATA.get(contractAddress);
  if (cachedMetadata) {
    console.log("Metadata found in cache for contract:", contractAddress);
    return JSON.parse(cachedMetadata);
  }

  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  console.log({ chainName, rpcURL, contractAddress });

  const [metadataUri] = await ethCall(contractAddress, "contractURI").then(
    (res: any) => res as string[]
  );

  console.log("Metadata URI:", metadataUri);

  if (!metadataUri) {
    throw new Error(`Metadata URI not found for contract: ${contractAddress}`);
  }
  const metadataJson = metadataUri.replace("data:application/json,", "");

  await env.METADATA.put(contractAddress, decodeURIComponent(metadataJson), {
    expirationTtl: 60 * 60 * 24 * 1, // 1 days
  });

  const metadata = JSON.parse(decodeURIComponent(metadataJson));
  return metadata;
};

export const getContractAddress = async (username: string) => {
  const { env } = getCloudflareContext();
  if (!env.CONTRACTS) {
    throw new Error("CONTRACTS binding is not available.");
  }

  const contractAddress = await env.CONTRACTS.get(username.toLowerCase());

  if (!contractAddress) {
    throw new Error(`Contract not found for username: ${username}`);
  }
  console.log(
    "Contract address for username:",
    username,
    "is",
    contractAddress
  );
  return contractAddress;
};

export const deployContract = async (data: Metadata): Promise<void> => {
  try {
    console.log("Deploying contract with data:", data.attributes);
    const { env } = getCloudflareContext();
    const creatorAddress = data.attributes?.find(
      (attr) => attr.trait_type === Constants.LABEL_CREATOR_ADDRESS
    )?.value;
    if (!creatorAddress) {
      throw new Error("Creator address not found in metadata.");
    }

    const platformAddress = data.attributes?.find(
      (attr) => attr.trait_type === Constants.LABEL_PLATFORM_ADDRESS
    )?.value;
    if (!platformAddress) {
      throw new Error("Platform address not found in metadata.");
    }

    if (!data.name) {
      throw new Error("NFT name is required.");
    }

    console.log("Deploying NFT with data:", data.name);

    const nftAddress = _getNFTAddress(
      contracts.factoryAQMint,
      contracts.upgradeableBeaconForNFT,
      data.name
    );

    const dataUri = `data:application/json,${encodeURIComponent(
      JSON.stringify({
        attributes: data.attributes,
        banner_image_url: data.banner_image_url,
        image: data.image,
        name: "___HERE___",
        description: data.description,
      })
    )}`;

    // console.log("Data URI:", dataUri);

    console.log("NFT Address:", nftAddress);

    const dataArray = generateDataArray(dataUri);
    const addressArray = await getAddressArray2(
      process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains,
      contracts.metadata,
      dataArray
    );
    await getAddressArray2(
      process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains,
      contracts.metadata,
      dataArray.reverse()
    );

    await setAddressesForContractWithAddress(
      process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains,
      contracts.metadata,
      addressArray,
      nftAddress
    );

    await deployNFT(
      process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains,
      contracts.factoryAQMint,
      data.name,
      creatorAddress as string,
      platformAddress as string,
      parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS!)
    );

    await new Promise((resolve) => setTimeout(resolve, 15000));

    const username = data.name.split(" ")[0];
    await env.CONTRACTS_REVERSE?.put(nftAddress.toLowerCase(), username);
    await env.CONTRACTS?.put(username.toLowerCase(), nftAddress);

    console.log("Contract deployed successfully for username:", username);

    return Promise.resolve();
  } catch (error) {
    console.error("Error in deployContract:", error);
    return Promise.reject(error); // Re-throw the error to be handled by the caller
  }
};

export const setAddressesForContract = async (
  chainName: keyof typeof chains,
  metadataAddress: string,
  addressArray: string[],
  hash: string
) => {
  const { rpcURL } = chains[chainName];

  const metadata = new Contract(metadataAddress, metadataAbi);

  const tx = await metadata.setKeysForHash.populateTransaction(
    hash,
    addressArray
  );

  const body = JSON.stringify({
    tx,
    keyVersion: "1",
    rpcURL,
  });

  await fetch(process.env.RUNNER_URL!, {
    method: "POST",
    body,
    headers: {
      Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
      "Content-Type": "application/json",
    },
  });
};

export const setAddressesForContractWithAddress = async (
  chainName: keyof typeof chains,
  metadataAddress: string,
  addressArray: string[],
  address: string
) => {
  const addressHash = keccak256(new AbiCoder().encode(["address"], [address]));
  const hash = keccak256(
    new AbiCoder().encode(["address", "bytes32"], [address, addressHash])
  );
  await setAddressesForContract(chainName, metadataAddress, addressArray, hash);
};

export const setAddressesForContractWithFallback = async (
  chainName: keyof typeof chains,
  metadataAddress: string,
  addressArray: string[]
) => {
  await setAddressesForContract(
    chainName,
    metadataAddress,
    addressArray,
    FALLBACK
  );
};

export const getAddressArray2 = async (
  chainName: keyof typeof chains,
  metadataAddress: string,
  dataArray: Uint8Array[][]
) => {
  const { rpcURL } = chains[chainName];
  if (!rpcURL) {
    throw new Error(`RPC URL not found for chain: ${chainName}`);
  }

  let i = 0;
  const promiseArray = dataArray.map((data) =>
    data.map((d) => async () => {
      if (d.length < 100 && Object.keys(ADDRESSES).includes(toUtf8String(d))) {
        const specialKey = toUtf8String(d);
        return ADDRESSES[specialKey];
      }

      const creationCode = getCreationCode(d);
      const salt = keccak256(creationCode);
      const computed = getCreate2Address(metadataAddress, salt, salt);

      const response = await fetch(rpcURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getCode",
          params: [computed, "latest"],
          id: 1,
        }),
      });
      const { result: code }: { result: string } = await response.json();

      console.log({ length: code.length });
      if (code.length > 2) {
        return computed;
      } else {
        i++;
        const keyVersion = (i + 2).toString();
        console.log({ keyVersion });

        const iface = new Interface(metadataAbi);
        const calldata = iface.encodeFunctionData("write", [d]);

        const tx = {
          to: metadataAddress,
          data: calldata,
        };

        const body = JSON.stringify({
          tx,
          keyVersion,
          rpcURL,
        });

        fetch(process.env.RUNNER_URL!, {
          method: "POST",
          body,
          headers: {
            Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
            "Content-Type": "application/json",
          },
        });
        return computed;
      }
    })
  );
  const promiseArrayReduced = promiseArray.reduce((a, b) => [...a, ...b], []);

  const addresses = await series(promiseArrayReduced);
  console.log({ addresses });
  return addresses as string[];
};

export async function getReceiveLogs(
  creatorAddress: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<SupportLog>> {
  const { env } = getCloudflareContext();
  if (!env.RECEIVE_LOGS) {
    throw new Error("RECEIVE_LOGS binding is not available.");
  }

  const logs = await env.RECEIVE_LOGS.get(creatorAddress);
  if (logs) {
    console.log("Receive logs found in cache for creator:", creatorAddress);
    const parsedLogs = JSON.parse(logs);
    const total = parsedLogs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = parsedLogs.slice(start, end);

    const items = await Promise.all(
      paginatedLogs.map(async (log: any) => {
        const message = await getMessage(log.nftAddress, log.tokenId);
        return {
          nftAddress: log.nftAddress,
          supporterAddress: log.supporterAddress,
          creatorAddress: log.creatorAddress,
          tokenId: BigInt(log.tokenId),
          value: BigInt(log.value),
          timestamp: log.timestamp,
          transactionHash: log.transactionHash,
          username: log.username || "DoeJane15619", // Add username if available
          message: message,
        } as SupportLog;
      })
    );
    return { items, total };
  }

  return { items: [], total: 0 };
}

export async function getSupportLogs(
  userAddress: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<SupportLog>> {
  const { env } = getCloudflareContext();
  if (!env.SUPPORT_LOGS) {
    throw new Error("SUPPORT_LOGS binding is not available.");
  }
  if (!env.CONTRACTS_REVERSE) {
    throw new Error("CONTRACTS_REVERSE binding is not available.");
  }

  const logs = await env.SUPPORT_LOGS.get(userAddress);
  if (logs) {
    console.log({ logs });
    console.log("Support logs found in cache for user:", userAddress);
    const parsedLogs = JSON.parse(logs);
    const total = parsedLogs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = parsedLogs.slice(start, end);
    const items = await Promise.all(
      paginatedLogs.map(async (log: any) => {
        const message = (await getMessage(log.nftAddress, log.tokenId)) || {};
        return {
          nftAddress: log.nftAddress,
          supporterAddress: log.supporterAddress,
          creatorAddress: log.creatorAddress,
          tokenId: BigInt(log.tokenId),
          value: BigInt(log.value),
          timestamp: log.timestamp,
          transactionHash: log.transactionHash,
          username: log.username || "DoeJane15619", // Add username if available
          message: message,
        } as SupportLog;
      })
    );
    return { items, total };
  }
  return { items: [], total: 0 };
}

export async function getDepositLogs(
  ownerAddress: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<DepositLog>> {
  const { env } = getCloudflareContext();
  if (!env.DEPOSIT_LOGS) {
    throw new Error("DEPOSIT_LOGS binding is not available.");
  }

  const logs = await env.DEPOSIT_LOGS.get(ownerAddress);
  if (logs) {
    const parsedLogs = JSON.parse(logs) as any[];
    const total = parsedLogs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = parsedLogs.slice(start, end);

    const items: DepositLog[] = paginatedLogs.map((log: any) => ({
      ownerAddress: log.ownerAddress,
      favoriteAddress: log.favoriteAddress,
      value: BigInt(log.value) as unknown as bigint,
      share: Number(log.share),
      timestamp: log.timestamp,
      transactionHash: log.transactionHash,
    }));
    return { items, total };
  }

  return { items: [], total: 0 };
}

export async function getDepositedLogs(
  favoriteAddress: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResult<DepositLog>> {
  const { env } = getCloudflareContext();
  if (!env.DEPOSITED_LOGS) {
    throw new Error("DEPOSITED_LOGS binding is not available.");
  }

  const logs = await env.DEPOSITED_LOGS.get(favoriteAddress);
  if (logs) {
    const parsedLogs = JSON.parse(logs) as any[];
    const total = parsedLogs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = parsedLogs.slice(start, end);

    const items: DepositLog[] = paginatedLogs.map((log: any) => ({
      ownerAddress: log.ownerAddress,
      favoriteAddress: log.favoriteAddress,
      value: BigInt(log.value) as unknown as bigint,
      share: Number(log.share),
      timestamp: log.timestamp,
      transactionHash: log.transactionHash,
    }));
    return { items, total };
  }

  return { items: [], total: 0 };
}

export async function updateLogs(
  chainId: number,
  nftAddress: string,
  topic0: string,
  topic1: string,
  topic2: string,
  _topic3: string
): Promise<SupportLog[]> {
  let result: EtherscanLog[] = [];
  if (IS_KAIA) {
    result = await fetchLatestLogsKaia(
      chainId.toString(), // Re-add the chainId.toString() line
      nftAddress,
      topic0,
      topic1,
      topic2
    );
  } else {
    result = await fetchLatestLogs(
      chainId.toString(), // Re-add the chainId.toString() line
      nftAddress,
      topic0,
      topic1,
      topic2,
      0
    );
  }

  console.log("Fetched logs:", result);

  const logs = result
    .sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp))
    .map((log) => {
      const nftAddress = getAddress(log.address);
      const supporter = new AbiCoder().decode(["address"], log.topics[1])[0];
      const recipient = new AbiCoder().decode(["address"], log.topics[2])[0];
      const tokenId = new AbiCoder().decode(["uint256"], log.topics[3])[0];
      const value = new AbiCoder().decode(["uint256"], log.data)[0];
      const timestamp = log.timeStamp;
      const transactionHash = log.transactionHash;

      return {
        nftAddress,
        supporterAddress: supporter,
        creatorAddress: recipient,
        tokenId: tokenId.toString(),
        value: value.toString(),
        timestamp,
        transactionHash,
      };
    });

  return logs;
}

export async function updateDepositLogs(
  chainId: number,
  contractAddress: string,
  topic0: string,
  topic1: string,
  topic2: string
): Promise<DepositLog[]> {
  let result: EtherscanLog[] = [];
  if (IS_KAIA) {
    result = await fetchLatestLogsKaia(
      chainId.toString(),
      contractAddress,
      topic0,
      topic1,
      topic2
    );
  } else {
    result = await fetchLatestLogs(
      chainId.toString(),
      contractAddress,
      topic0,
      topic1,
      topic2,
      0
    );
  }

  const logs: DepositLog[] = result
    .sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp))
    .map((log) => {
      const owner = new AbiCoder().decode(["address"], log.topics[1])[0];
      const favorite = new AbiCoder().decode(["address"], log.topics[2])[0];
      const share = new AbiCoder().decode(["uint24"], log.topics[3])[0];
      const [value] = new AbiCoder().decode(["uint256", "uint256"], log.data);

      console.log({ owner, favorite, share, value });

      return {
        ownerAddress: owner,
        favoriteAddress: favorite,
        value: value.toString() as unknown as bigint,
        share: Number(share),
        timestamp: log.timeStamp,
        transactionHash: log.transactionHash,
      } as unknown as DepositLog;
    });

  return logs;
}

export async function saveSupportLog(
  userAddress: string,
  creatorAddress: string,
  nftAddress: string
): Promise<void> {
  const { env } = getCloudflareContext();
  if (!env.SUPPORT_LOGS) {
    throw new Error("SUPPORT_LOGS binding is not available.");
  }

  if (!env.RECEIVE_LOGS) {
    throw new Error("RECEIVE_LOGS binding is not available.");
  }

  const contractInterface = new Interface(abi);
  const topic0 = contractInterface.getEvent("AQMintSupported")?.topicHash;

  if (!topic0) {
    throw new Error("Topic0 for AQMintSupported event not found.");
  }

  const chainId =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains]?.chainId;

  const supportLogs = await updateLogs(
    chainId,
    nftAddress,
    topic0,
    new AbiCoder().encode(["address"], [userAddress]),
    "",
    new AbiCoder().encode(["address"], [nftAddress])
  );

  const supportLogsWithUsernames = await Promise.all(
    supportLogs.map(async (log) => {
      if (log.username) {
        return log;
      }
      const username = await env.CONTRACTS_REVERSE.get(
        log.nftAddress.toLowerCase()
      );
      return {
        ...log,

        username: username,
      };
    })
  );

  await env.SUPPORT_LOGS.put(
    userAddress,
    JSON.stringify(supportLogsWithUsernames)
  );

  const receiveLogs = await updateLogs(
    chainId,
    nftAddress,
    topic0,
    "",
    new AbiCoder().encode(["address"], [creatorAddress]),
    new AbiCoder().encode(["address"], [nftAddress])
  );

  const receiveLogsWithUsernames = await Promise.all(
    receiveLogs.map(async (log) => {
      if (log.username) {
        return log;
      }
      const username = await env.CONTRACTS_REVERSE.get(
        log.nftAddress.toLowerCase()
      );
      return {
        ...log,
        username: username,
      };
    })
  );

  await env.RECEIVE_LOGS.put(
    userAddress,
    JSON.stringify(receiveLogsWithUsernames)
  );
}

export async function saveDepositLog(
  ownerAddress: string,
  favoriteAddress: string
): Promise<void> {
  const { env } = getCloudflareContext();
  if (!env.DEPOSIT_LOGS) {
    throw new Error("DEPOSIT_LOGS binding is not available.");
  }
  if (!env.DEPOSITED_LOGS) {
    throw new Error("DEPOSITED_LOGS binding is not available.");
  }

  const contractInterface = new Interface(abi);
  const topic0 = contractInterface.getEvent("AQVaultDeposited")?.topicHash;
  if (!topic0) {
    throw new Error("Topic0 for AQVaultDeposited event not found.");
  }

  const chainId =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains]?.chainId;

  // Logs for deposits made by the owner (optionally filtered by favorite)
  const depositLogs = await updateDepositLogs(
    chainId,
    contracts.factoryAQMint,
    topic0,
    new AbiCoder().encode(["address"], [ownerAddress]),
    ""
  );

  await env.DEPOSIT_LOGS.put(ownerAddress, JSON.stringify(depositLogs));

  // Logs for deposits received by the favorite
  const depositedLogs = await updateDepositLogs(
    chainId,
    contracts.factoryAQMint,
    topic0,
    "",
    new AbiCoder().encode(["address"], [favoriteAddress])
  );

  await env.DEPOSITED_LOGS.put(favoriteAddress, JSON.stringify(depositedLogs));
}

export async function fetchLatestLogs(
  chainId: string,
  contractAddress: string,
  topic0: string,
  topic1: string,
  topic2: string,
  fromBlock: number
): Promise<EtherscanLog[]> {
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { apiURL, apiKey } = chains[chainName];

  const url = new URL(apiURL); // V2 base URL :contentReference[oaicite:2]{index=2}

  url.searchParams.set("chainid", chainId.toString()); // Specify Sepolia Base via chainid :contentReference[oaicite:3]{index=3}
  url.searchParams.set("module", "logs"); // Use the logs module :contentReference[oaicite:4]{index=4}
  url.searchParams.set("action", "getLogs"); // Action to retrieve logs :contentReference[oaicite:5]{index=5}
  if (contractAddress) {
    url.searchParams.set("address", contractAddress); // Target contract address
  }
  url.searchParams.set("topic0", topic0); // Filter by first indexed event topic
  if (topic1) {
    url.searchParams.set("topic1", topic1);
    url.searchParams.set("topic0_1_opr", "and"); // Ensure topic0 is present
  }
  if (topic2) {
    url.searchParams.set("topic2", topic2);
    url.searchParams.set("topic0_2_opr", "and"); // Ensure topic0 is present
  }
  if (topic1 && topic2) {
    url.searchParams.set("topic1_2_opr", "and"); // Ensure both topic1 and topic2 are present
  }

  // url.searchParams.set("sort", "desc"); // Sort logs by descending order (new
  // url.searchParams.set("sort", "asc"); // Get newest logs first
  // url.searchParams.set("fromBlock", fromBlock.toString());
  if (fromBlock > 0) {
    url.searchParams.set("fromBlock", fromBlock.toString()); // Specify starting block
  }
  // @ts-ignore
  // url.searchParams.set('page', page.toString()); // Pagination: page number
  // url.searchParams.set('offset', offset.toString()); // Pagination: logs per page
  url.searchParams.set("apikey", apiKey); // Your Etherscan API key

  console.log(url.toString()); // Log the full URL for debugging

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  const data: EtherscanResponse = await response.json();
  if (data.status !== "1") {
    throw new Error(`Etherscan API error: ${data.message}`);
  }

  return data.result;
}

export async function fetchLatestLogsKaia(
  chainId: string,
  contractAddress: string,
  topic0: string,
  topic1: string,
  topic2: string
): Promise<EtherscanLog[]> {
  console.log({
    chainId,
    contractAddress,
    topic0,
    topic1,
    topic2,
  });
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
  const { apiURL, apiKey } = chains[chainName];
  const url = `${apiURL}/v1/accounts/${contractAddress}/event-logs?size=2000`;

  const response = await fetch(url, {
    headers: {
      Accept: "*/*",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from Kaia: ${response.statusText}`);
  }

  const data = (await response.json()) as KaiaEventLogsResponse;
  console.log({ data });

  data.results.map((log) => {
    console.log(log.items);
  });
  console.log({ topic0 });
  return data.results
    .filter(
      (log) =>
        (topic0 === "" || log.topics[0] === topic0) &&
        (topic1 === "" || log.topics[1] === topic1) &&
        (topic2 === "" || log.topics[2] === topic2)
    )
    .map((log) => {
      // Some events (e.g., AQMintSupported) encode a timestamp in the
      // second uint256 of the data. Others (e.g., AQVaultDeposited) do not.
      // Decode defensively and fall back to current time when absent.
      let ts = Math.floor(Date.now() / 1000).toString();
      try {
        const decoded = new AbiCoder().decode(["uint256", "uint256"], log.data);
        if (decoded?.[1] != null) {
          ts = decoded[1].toString();
        }
      } catch (_) {
        // No timestamp encoded in data; keep fallback.
      }
      return {
        address: log.contract_address,
        blockNumber: log.block_number.toString(),
        transactionHash: log.transaction_hash,
        data: log.data,
        topics: log.topics,
        timeStamp: ts,
      };
    });
}

export const getMessage = async (
  contractAddress: string,
  tokenId: string
): Promise<Message> => {
  const { env } = getCloudflareContext();

  if (!env.MESSAGES) {
    throw new Error("MESSAGES binding is not available.");
  }

  const key = `${contractAddress}-${tokenId}`.toLowerCase();
  console.log(`Fetching message for key: ${key}`);

  const messageString = await env.MESSAGES.get(key);

  if (!messageString) {
    return {};
  }

  return JSON.parse(messageString) as Message;
};

export const saveReply = async (
  contractAddress: string,
  tokenId: string,
  reply: string,
  signature: string
) => {
  const { env } = getCloudflareContext();
  if (!env.MESSAGES) {
    throw new Error("MESSAGES binding is not available.");
  }
  const key = `${contractAddress}-${tokenId}`.toLowerCase();
  const savedMessage = await getMessage(contractAddress, tokenId);

  if (!savedMessage) {
    throw new Error(`No message found for ${key} to save reply.`);
  }

  console.log(`Saving reply for key: ${key}`);
  const replyData = {
    ...savedMessage,
    reply,
    signature,
    repliedAt: Date.now(),
  };
  await env.MESSAGES.put(key, JSON.stringify(replyData));
  console.log(`Reply saved for ${key}`);
};

export const saveMessage = async (
  contractAddress: string,
  tokenId: string,
  message: string,
  from: string,
  to: string,
  signature: string
) => {
  const { env } = getCloudflareContext();
  if (!env.MESSAGES) {
    throw new Error("MESSAGES binding is not available.");
  }

  const key = `${contractAddress}-${tokenId}`.toLowerCase();

  console.log(`Saving message for key: ${key}`);

  const messageData = {
    message,
    from,
    to,
    signature,
    sentAt: Date.now(),
    repliedAt: 0,
  };

  await env.MESSAGES.put(key, JSON.stringify(messageData));

  console.log(`Message saved for ${key}`);
};

export const series = async (promises: PromiseFunction[]) => {
  const initialValue: any[] = [];
  return await promises.reduce(async (res, next: PromiseFunction) => {
    const r = await res;
    r.push(await next());
    return r;
  }, Promise.resolve(initialValue));
};

export const support = async (contractAddress: string, tokenId: string) => {
  console.log(`Supporting token ${tokenId} on contract ${contractAddress}`);
  // In a real app, this would interact with a smart contract
  return { success: true };
};

export const getVaultAddress = async (
  userAddress: string,
  creatorAddress: string
): Promise<string> => {
  return _getVaultAddress(
    contracts.factoryAQMint,
    contracts.upgradeableBeaconForVault,
    userAddress,
    creatorAddress
  );
};

export const getValueDeposited = async (
  vaultAddress: string
): Promise<bigint> => {
  return await ethCall(vaultAddress, "deposited", [])
    .then((res: any) => BigInt(res[0]))
    .catch((err) => {
      console.error(
        `Error fetching deposited value for vault ${vaultAddress}:`,
        err
      );
      return 0n; // Return 0 if there's an error (e.g., contract doesn't exist)
    });
};

export const depositToVault = async (
  owner: string,
  creator: string,
  share: number,
  params: any
): Promise<bigint> => {
  const currentBalance = await balanceOf(contracts.usdt, owner);
  const contract = new Contract(contracts.factoryAQMint, abi);
  const shareBps = share * 100;

  // Construct the PermitRequest tuple expected by the ABI
  const request = {
    owner: params.owner,
    spender: params.spender,
    value: params.value,
    deadline: params.deadline,
    v: params.v,
    r: params.r,
    s: params.s,
  };

  // Call using positional arguments to match the ABI
  const tx = await contract.deposit.populateTransaction(
    owner,
    creator,
    shareBps,
    request
  );

  const { rpcURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains];

  const body = JSON.stringify({
    tx,
    keyVersion: "1",
    rpcURL,
  });

  await fetch(process.env.RUNNER_URL!, {
    method: "POST",
    body,
    headers: {
      Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
      "Content-Type": "application/json",
    },
  });

  return currentBalance;
};

export const balanceOf = async (
  contractAddress: string,
  ownerAddress: string
): Promise<bigint> => {
  return await ethCall(contractAddress, "balanceOf", [ownerAddress]).then(
    (res: any) => BigInt(res[0])
  );
};

export const ownerOf = async (
  contractAddress: string,
  tokenId: bigint
): Promise<string> => {
  return await ethCall(contractAddress, "ownerOf", [tokenId]).then(
    (res: any) => res[0] as string
  );
};

export const requestFaucet = async (to: string): Promise<void> => {
  const contract = new Contract(contracts.faucet, abi);
  const tx = await contract.batchMintSameUnits.populateTransaction(to, 2000n);

  const { rpcURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains];

  const body = JSON.stringify({
    tx,
    keyVersion: "3",
    rpcURL,
  });

  await fetch(process.env.RUNNER_URL!, {
    method: "POST",
    body,
    headers: {
      Authorization: "Bearer " + process.env.RUNNER_TOKEN!,
      "Content-Type": "application/json",
    },
  });
};
