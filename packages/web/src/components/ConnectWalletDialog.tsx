"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletProvider";
import { useTranslations } from "next-intl";

export function ConnectWalletDialog({
  trigger,
  onConnected,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  onConnected?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("ConnectWalletDialog");
  const { connectWallet } = useWallet();

  const handleConnect = async () => {
    await connectWallet();
    onOpenChange(false);
    if (onConnected) {
      onConnected();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConnect}>{t("connect")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
