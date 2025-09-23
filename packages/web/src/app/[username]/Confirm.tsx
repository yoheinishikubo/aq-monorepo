"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSpinnerOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletProvider";
import { formatDisplayBalance } from "@/lib/utils";
import {
  balanceOf,
  getTokenId,
  getTypedData,
  mintNFTTransaction,
  mintNFTWithERC20,
  saveSupportLog,
} from "../actions";
import { Signature, ZeroAddress } from "ethers";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useLocale, useTranslations } from "next-intl";

interface ConfirmSupportDialogProps {
  trigger: React.ReactNode;
  username: string;
  tokenAddress: string;
  value: bigint;
  symbol: string;
  decimals: string;
  creatorAddress: string;
}

export function ConfirmSupportDialog({
  trigger,
  username,
  tokenAddress,
  value,
  symbol,
  decimals,
  creatorAddress,
}: ConfirmSupportDialogProps) {
  const t = useTranslations("ConfirmSupportDialog");
  const locale = useLocale();
  const { nftAddress, signer } = useWallet();
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePay = async () => {
    if (!nftAddress || !signer?.address) {
      toast({
        title: t("error"),
        description: t("walletNotConnected"),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (tokenAddress === ZeroAddress) {
        const rawTx = await mintNFTTransaction(nftAddress, value);
        if (!rawTx) {
          throw new Error(t("failedToCreateTransaction"));
        }
        console.log("Raw transaction:", rawTx);

        await signer.sendTransaction(rawTx).then((tx: any) => tx.wait());
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await saveSupportLog(signer.address, creatorAddress, nftAddress);
        const tokenId = await getTokenId(nftAddress, await signer.getAddress());
        toast({
          title: t("success"),
          description: t("nftMinted"),
        });
        router.push(`/nft/${nftAddress}/${tokenId}`);
      } else {
        const typedData = await getTypedData(
          nftAddress,
          tokenAddress,
          signer.address,
          value
        );
        if (!typedData) {
          throw new Error(t("failedToGetTypedData"));
        }

        const signature = await signer.signTypedData(
          typedData.domain,
          typedData.types,
          typedData.values
        );
        const { v, r, s } = Signature.from(signature);
        const params = {
          owner: typedData.values.owner,
          spender: typedData.values.spender,
          value: typedData.values.value,
          nonce: typedData.values.nonce,
          deadline: typedData.values.deadline,
          v,
          r,
          s,
        };

        const currentBalance = await mintNFTWithERC20(
          nftAddress,
          tokenAddress,
          params
        );
        let updatedBalance;
        while (true) {
          updatedBalance = await balanceOf(nftAddress, signer.address);
          if (updatedBalance !== currentBalance) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        await saveSupportLog(signer.address, creatorAddress, nftAddress);
        const tokenId = await getTokenId(nftAddress, signer.address);

        toast({
          title: t("success"),
          description: t("nftMinted"),
        });
        router.push(`/nft/${nftAddress}/${tokenId}`);
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: t("paymentFailed"),
        description: t("paymentError"),
        variant: "destructive",
      });
      setIsProcessing(false);
      setOpen(false);
    } finally {
      // setIsProcessing(false);
      // setOpen(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setOpen(false);
    }
  }, [isProcessing]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isProcessing && <DialogSpinnerOverlay />}
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { username })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center text-2xl font-bold gap-4">
            <div>{formatDisplayBalance(value, decimals, 3, locale)}</div>
            <div>{symbol}</div>
          </div>
        </div>
        <DialogFooter className="sm:flex-col sm:space-y-2">
          <Button
            type="button"
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full"
          >
            {t("confirmButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="w-full"
          >
            {t("cancelButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
