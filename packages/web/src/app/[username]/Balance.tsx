"use client";

import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { balanceOf } from "../actions";
import { ValueDialog } from "./ValueDialog";
import { formatDisplayBalance } from "@/lib/utils";
import { useWallet } from "@/contexts/WalletProvider";
import { ZeroAddress } from "ethers";

export default function Balance({
  tokenAddress,
  username,
  decimals,
  symbol,
  creatorAddress,
}: {
  tokenAddress: string;
  username: string;
  decimals: string;
  symbol: string;
  creatorAddress: string;
}) {
  const { signer, getBalance } = useWallet();
  const [balance, setBalance] = useState(0n);
  const locale = useLocale();

  useEffect(() => {
    if (!tokenAddress) {
      console.error("Token address is required");
      return;
    }
    if (!signer?.address) {
      setBalance(0n);
      return;
    }
    // Here you can add any side effects or data fetching related to the token address
    console.log("Token address:", tokenAddress);

    if (tokenAddress === ZeroAddress) {
      getBalance().then((fetchedBalance: bigint) => {
        console.log("Native balance:", fetchedBalance);
        setBalance(fetchedBalance); // No need to cast to bigint as it's already of type bigint
      });
    } else {
      balanceOf(tokenAddress, signer?.address!)
        .then((fetchedBalance) => {
          console.log("Token balance:", fetchedBalance);

          setBalance(fetchedBalance as bigint); // Explicitly cast to bigint to resolve type error
        })
        .catch((error) => {
          console.error("Error fetching token balance:", error);
          setBalance(0n);
        });
    }
  }, [tokenAddress, signer?.address]);

  return (
    <div className="flex items-center justify-end">
      <div>
        <span className="font-mono">
          {formatDisplayBalance(balance, decimals, 3, locale)}
        </span>
      </div>
      <ValueDialog
        symbol={symbol}
        balance={balance}
        decimals={decimals}
        username={username}
        tokenAddress={tokenAddress}
        creatorAddress={creatorAddress}
        trigger={
          <Button
            size="icon"
            variant="outline"
            className="ml-4 size-4 mb-1"
            disabled={!balance}
          >
            <ChevronRightIcon />
          </Button>
        }
      />
    </div>
  );
}
