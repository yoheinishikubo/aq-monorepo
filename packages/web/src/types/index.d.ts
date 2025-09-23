import { Wallet } from "@kaiachain/ethers-ext";
import { WalletProvider as WalletProviderType } from "@linenext/dapp-portal-sdk";
import React from "react";

declare global {
  interface Window {
    gtag: (
      type: "config",
      gaId: string,
      options: { page_path: string }
    ) => void;
  }
}

export type NFTItem = {
  contract: {
    contract_address: string;
    contract_type: string;
    contract_name: string;
    contract_symbol: string;
    verified: boolean;
  };
  token_id: string;
  token_uri: string;
  token_count: number;
};
export type NFTBalances = {
  results: NFTItem[];
  paging: {
    total_count: number;
    current_page: number;
    last_page: boolean;
    total_page: number;
  };
};

export interface KaiaEventLog {
  log_index: number;
  contract_address: string;
  type: string;
  topics: string[];
  data: string;
  items: any[];
  block_number: number;
  transaction_hash: string;
  estimated_event_log: string;
}

export interface KaiaEventLogsResponse {
  results: KaiaEventLog[];
  paging: {
    total_count: number;
    current_page: number;
    last_page: boolean;
    total_page: number;
  };
}

export interface Message {
  from?: string;
  to?: string;
  message?: string;
  reply?: string;
  signature?: string;
  sentAt?: number;
  repliedAt?: number;
}

export interface SupportLog {
  nftAddress: string;
  supporterAddress: string;
  creatorAddress: string;
  tokenId: bigint;
  value: bigint;
  timestamp: string;
  transactionHash: string;
  username?: string;
  message?: Message;
}

export interface DepositLog {
  ownerAddress: string;
  favoriteAddress: string;
  value: bigint;
  share: number;
  timestamp: string;
  transactionHash: string;
}

export type Metadata = {
  name?: string;
  description?: string;
  image?: string;
  banner_image_url?: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
};

export interface Reply {
  username: string;
  message: string;
  signer: string;
  receiver: string;
  contractAddress: string;
  tokenId: string;
  value: bigint;
  mintedAt: number;
  repliedAt?: number;
}

export type URIEncodedStrings = {
  raw: string;
  encoded: string;
  doubleEncoded: string;
};

export interface WalletContextType {
  loading: boolean;
  error: string | null;
  connected: boolean;
  nftAddress: string | null;
  setNftAddress: (address: string | null) => void;
  connectWallet: () => Promise<void>;
  disconnect: () => Promise<void>;
  provider: BrowserProvider | JsonRpcProvider | null;
  signer: Signer | null;
  getBalance: () => Promise<bigint>;
}

export interface WalletProviderProps {
  children: React.ReactNode;
}

export type TokenInfo = {
  name: string;
  symbol: string;
  decimals: string;
  address: string;
};

export interface EtherscanLog {
  address: string;
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
  data: string;
  topics: string[];
}

export interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanLog[];
}

export type PromiseFunction = () => Promise<any>;

export type MessageDialogProps = {
  contractAddress: string;
  tokenId: string;
  creatorAddress: string;
  username?: string;
  trigger?: React.ReactNode;
  onMessageSent?: () => void;
};
export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
