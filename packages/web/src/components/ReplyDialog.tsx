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
import { useWallet } from "@/contexts/WalletProvider";
import { encodeReply } from "@/lib/utils";
import { saveReply } from "@/app/actions";
import DOMPurify from "dompurify";

interface ReplyDialogProps {
  contractAddress: string;
  tokenId: string;
  to: string;
  username: string;
  value: bigint;
  mintedAt: number;
  originalMessage?: string;
  trigger?: React.ReactNode;
  onMessageSent?: () => void;
}

import { useTranslations } from "next-intl";

export function ReplyDialog({
  contractAddress,
  tokenId,
  to,
  username,
  value,
  mintedAt,
  originalMessage,
  trigger,
  onMessageSent,
}: ReplyDialogProps) {
  const t = useTranslations("ReplyDialog");
  const { signer } = useWallet();
  const [message, setMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReply = async () => {
    if (!signer) {
      alert(t("connectWallet"));
      return;
    }
    if (!signer) {
      alert(t("enterMessage"));
      return;
    }

    setIsReplying(true);

    try {
      const encodedMessage = encodeReply(
        username,
        message,
        signer.address,
        to,
        contractAddress,
        tokenId,
        value,
        mintedAt,
        Date.now()
      );

      console.log("Encoded Message:", encodedMessage);

      const signature = await signer.signMessage(`data:${encodedMessage}`);
      console.log("Signature:", signature);

      await saveReply(contractAddress, tokenId, encodedMessage, signature);
      onMessageSent?.();
      setMessage("");
      setIsOpen(false);
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error sending reply:", error);
      alert(t("failedToSend"));
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            {t("replyToMessage")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-md">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription
                className="break-all"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(originalMessage || ""),
                }}
              />
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="mb-4 break-all">
                <p>
                  <b>To:</b> {to}
                </p>
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="message">{t("yourReply")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("placeholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowConfirmation(true)}>
                {t("sendReply")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="min-w-0">
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
              <div className="mt-4 break-all">
                <p className="mb-2">
                  <b>To:</b> {to}
                </p>
                <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 break-all">
                  {message}
                </div>
              </div>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleReply} disabled={isReplying}>
                {isReplying ? t("sending") : t("confirmSend")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
