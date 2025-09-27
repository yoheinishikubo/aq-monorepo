// components/Header.tsx
"use client";

import React from "react";
import { useWallet } from "@/contexts/WalletProvider";
import { formatAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DisconnectWalletDialog } from "./DisconnectWalletDialog";
import LanguageSwitcher from "./LanguageSwitcher";
import { Button } from "./ui/button";

export default function Header() {
  const t = useTranslations("Header");
  const { connected, loading, disconnect, signer, connectWallet } = useWallet();
  const router = useRouter();

  return (
    <header className="bg-gray-800 text-white w-full">
      {/* match your card’s max width and center it */}
      <div className="max-w-full mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-3xl font-bold" onClick={() => router.push("/")}>
          {t("title")}
        </h1>
        <div className="flex items-center">
          {loading ? (
            <span className="text-lg font-medium">{t("loading")}</span>
          ) : !connected || !signer ? (
            <Button
              variant={"outlineDark"}
              size={"sm"}
              className="text-xs font-medium"
              onClick={() => connectWallet()}
            >
              {t("connectWallet")}
            </Button>
          ) : (
            <DisconnectWalletDialog
              onDisconnected={() => disconnect()}
              trigger={
                <button className="text-lg font-medium">
                  {formatAddress(signer?.address)}
                </button>
              }
            />
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
