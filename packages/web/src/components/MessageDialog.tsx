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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveMessage } from "@/app/actions";
import { useWallet } from "@/contexts/WalletProvider";

import { MessageDialogProps } from "@/types";
import { useTranslations } from "next-intl";

export function MessageDialog({
  contractAddress,
  tokenId,
  creatorAddress,
  username,
  trigger,
  onMessageSent,
}: MessageDialogProps) {
  const t = useTranslations("MessageDialog");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sent, setSent] = useState(false);
  const { signer } = useWallet();

  const handleSend = async () => {
    if (!signer?.address || !signer.signMessage) {
      alert(t("connectWallet"));
      return;
    }
    const signature = await signer.signMessage(message);
    await saveMessage(
      contractAddress,
      tokenId,
      message,
      signer.address,
      creatorAddress,
      signature
    );
    setOpen(false);
    setShowConfirmation(false);
    setSent(true);
    if (onMessageSent) {
      onMessageSent();
    }
  };

  return (
    <>
      {!sent && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {trigger || <Button>{t("title")}</Button>}
          </DialogTrigger>
          <DialogContent className="rounded-md">
            {!showConfirmation ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t("title")}</DialogTitle>
                  <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="mb-4 break-all">
                    <p>
                      <b>To:</b> @{username}
                    </p>
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="message">{t("message")}</Label>
                    <Textarea
                      placeholder={t("placeholder")}
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowConfirmation(true)}>
                    {t("send")}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{t("confirmTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("confirmDescription")}
                  </DialogDescription>
                  <div className="mt-4 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 break-all">
                    {message}
                  </div>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmation(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleSend}>{t("confirmSend")}</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
