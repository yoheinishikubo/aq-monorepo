"use client";
// Minor change to trigger TS re-compilation
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
// import { Wallet } from "ethers";
import DappPortalSDK from "@linenext/dapp-portal-sdk";

import { WalletContextType, WalletProviderProps } from "@/types";
import { JsonRpcProvider, Signer, BrowserProvider, Wallet } from "ethers";
import chains from "@/lib/chains.json";
import { IS_KAIA } from "@/lib/utils";

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<
    JsonRpcProvider | BrowserProvider | null
  >(null);
  const sdkRef = useRef<DappPortalSDK | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [nftAddress, setNftAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);

  useEffect(() => {
    if (!IS_KAIA) {
      return;
    }
    const initializeSDK = async () => {
      try {
        const clientId = process.env.NEXT_PUBLIC_MINI_DAPP_CLIENT_ID;
        if (!clientId) {
          throw new Error(
            "MINI_DAPP_CLIENT_ID is not set in environment variables."
          );
        }
        const chainName = process.env
          .NEXT_PUBLIC_CHAIN_NAME! as keyof typeof chains;
        if (!chainName || !chains[chainName]) {
          throw new Error(
            "NEXT_PUBLIC_CHAIN_NAME is not set correctly in environment variables."
          );
        }
        DappPortalSDK.init({
          clientId,
          chainId: "1001",
        }).then((sdk) => {
          sdkRef.current = sdk;
        });
      } catch (err: any) {
        console.error("Failed to initialize SDK:", err);
        setError(err.message || "Unknown error initializing SDK.");
      }
    };

    initializeSDK();

    return () => {
      if (sdkRef.current) {
        sdkRef.current.getWalletProvider().disconnect();
        sdkRef.current = null;
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!IS_KAIA) {
      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY; // Use NEXT_PUBLIC_ for client-side access
      if (!privateKey) {
        throw new Error("PRIVATE_KEY is not set in environment variables.");
      }

      const newWallet = new Wallet(privateKey); // Wallet without a connected provider

      console.log("Wallet initialized:", newWallet.address);

      setSigner(newWallet);
      setConnected(true);

      return;
    }

    console.log(sdkRef.current);
    if (!sdkRef.current) {
      setError("SDK is not initialized.");
      return;
    }
    setLoading(true);
    try {
      const walletProvider = await sdkRef.current.getWalletProvider();
      const browserProvider = new BrowserProvider(walletProvider);
      setSigner(await browserProvider.getSigner());
      setProvider(browserProvider);
      setConnected(true);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Unknown error connecting wallet.");
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async (): Promise<bigint> => {
    if (!provider) {
      return Promise.reject("Provider is not initialized.");
    }
    if (!signer) {
      return Promise.reject("Signer is not initialized.");
    }
    return await provider.getBalance(await signer?.getAddress());
  };

  const disconnect = async () => {
    if (sdkRef.current) {
      // The disconnect method is not available on the sdk instance.
      sdkRef.current.getWalletProvider().disconnect();
    }
    setSigner(null);
    setProvider(null);
    setConnected(false);
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        loading,
        error,
        connected,
        nftAddress,
        setNftAddress,
        connectWallet,
        disconnect,
        getBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
