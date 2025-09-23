"use client";

import { useState } from "react";
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

export function DisconnectWalletDialog({
  trigger,
  onDisconnected,
}: {
  trigger?: React.ReactNode;
  onDisconnected?: () => void;
}) {
  const t = useTranslations("DisconnectWalletDialog");
  const [open, setOpen] = useState(false);
  const { disconnect } = useWallet();

  const handleDisconnect = async () => {
    await disconnect();
    setOpen(false);
    if (onDisconnected) {
      onDisconnected();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDisconnect}>
            {t("disconnect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
