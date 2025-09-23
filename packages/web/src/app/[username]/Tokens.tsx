"use client";

import { useState, useEffect } from "react";
import contracts from "@/lib/contracts.json";
import { getTokenInfo } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Balance from "./Balance";
import { type TokenInfo } from "@/types";
import { useTranslations } from "next-intl";
import { useWallet } from "@/contexts/WalletProvider";
import { ZeroAddress } from "ethers";
import { IS_KAIA } from "@/lib/utils";

export function Tokens({
  trigger,
  username,
  creatorAddress,
}: {
  trigger: React.ReactNode;
  username: string;
  creatorAddress: string;
}) {
  const t = useTranslations("Tokens");
  const { connected } = useWallet();
  const [open, setOpen] = useState(false);
  const [tokensInfo, setTokensInfo] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const tokenAddresses = [contracts.token1, contracts.token2, contracts.token3];

  useEffect(() => {
    if (!connected) {
      setOpen(false);
    }
  }, [connected]);

  useEffect(() => {
    if (open) {
      const fetchTokens = async () => {
        setLoading(true);
        const tokens = await Promise.all(
          tokenAddresses.map((address) => getTokenInfo(address))
        );

        // Disabled because KAIA pool is not available now
        // if (IS_KAIA) {
        //   const kaiaInfo = {
        //     name: "Kaia",
        //     symbol: "KAIA",
        //     decimals: "18",
        //     address: ZeroAddress,
        //   };
        //   setTokensInfo([kaiaInfo, ...tokens]);
        // } else {
        //   setTokensInfo(tokens);
        // }

        setTokensInfo(tokens);

        setLoading(false);
      };
      fetchTokens();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("symbol")}</TableHead>
              <TableHead>{t("balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? [...Array(tokenAddresses.length)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell className="font-medium">
                      <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              : tokensInfo.map((token, index) => (
                  <TableRow key={tokenAddresses[index]}>
                    <TableCell>{token.name}</TableCell>
                    <TableCell>{token.symbol}</TableCell>
                    <TableCell>
                      <Balance
                        tokenAddress={token.address}
                        username={username}
                        decimals={token.decimals}
                        symbol={token.symbol}
                        creatorAddress={creatorAddress}
                      />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
