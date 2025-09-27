"use client";

import { useState } from "react";
import { MessageDialog } from "@/components/MessageDialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useWallet } from "@/contexts/WalletProvider";

type MessageButtonProps = {
  contractAddress: string;
  tokenId: string;
  creatorAddress: string;
  username?: string;
  message?: {
    message?: string;
  };
};

export default function MessageButton({
  contractAddress,
  tokenId,
  creatorAddress,
  username,
  message,
}: MessageButtonProps) {
  const { connected } = useWallet();
  const t = useTranslations("MessageButton");
  const [messageSent, setMessageSent] = useState(false);

  const handleMessageSent = () => {
    setMessageSent(true);
  };

  if (!connected) {
    return <div />;
  }

  return (
    <>
      {message && !message.message && !messageSent ? (
        <MessageDialog
          username={username}
          contractAddress={contractAddress}
          tokenId={tokenId}
          creatorAddress={creatorAddress}
          onMessageSent={handleMessageSent}
          trigger={
            <Button variant="outline" className="w-full">
              {t("sendMessage")}
            </Button>
          }
        />
      ) : (
        <Button variant="outline" className="w-full" disabled>
          {t("messageSent")}
        </Button>
      )}
    </>
  );
}
