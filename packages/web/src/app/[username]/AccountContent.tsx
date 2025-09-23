"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMetadata, getContractAddress, ownerOf } from "../actions";
import { Dialog, DialogSpinnerOverlay } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWallet } from "@/contexts/WalletProvider";
import { Tokens } from "./Tokens";
import { Button } from "@/components/ui/button";
import { type Metadata } from "@/types";
import { useTranslations } from "next-intl";
import { ErrorDialog } from "@/components/ErrorDialog";

export function AccountContent({ username }: { username: string }) {
  const t = useTranslations("Account");
  const { connected, setNftAddress, connectWallet } = useWallet();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [creatorAddress, setCreatorAddress] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  useEffect(() => {
    getContractAddress(username)
      .then((contractAddress) => {
        if (contractAddress) {
          setNftAddress(contractAddress);

          console.log(
            "Contract address for username:",
            username,
            "is",
            contractAddress
          );
          fetchMetadata(contractAddress).then((metadata) => {
            if (metadata) {
              const { name, description, image, banner_image_url } = metadata;
              setLoading(false);
              setMetadata({
                name: name || "",
                description: description || "",
                image: image || "",
                banner_image_url: banner_image_url || "",
              });

              ownerOf(contractAddress, 0n).then((owner) => {
                setCreatorAddress(owner);
              });
            }
          });
        } else {
          setLoading(false);
          setShowErrorDialog(true);
        }
      })
      .catch(() => {
        // console.error("Error fetching contract address:", error);
        setLoading(false);
        setShowErrorDialog(true);
      });
  }, [username, router]);

  return (
    <>
      <Dialog open={loading}>
        <DialogSpinnerOverlay />
        <div className="bg-gray-900 text-white min-h-screen w-full">
          {/* Banner Image */}
          <div className="w-full">
            <div className="relative mb-2 mx-auto group aspect-[7/1] md:aspect-[12/1]">
              {metadata?.banner_image_url && (
                <img
                  src={metadata.banner_image_url}
                  alt={t("bannerImageAlt")}
                  className="object-cover w-full h-full"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          </div>
          <div className="container mx-auto p-4 flex flex-col md:flex-row md:items-center md:justify-center">
            {/* Button below banner - mobile only */}
            <div className="flex justify-center mt-4 md:hidden">
              {!loading && connected ? (
                <Tokens
                  username={username}
                  creatorAddress={creatorAddress!}
                  trigger={
                    <Button
                      className="w-full"
                      variant="default"
                      disabled={!username || !creatorAddress}
                    >
                      {t("supportButton", { username })}
                    </Button>
                  }
                />
              ) : (
                <Button
                  className="w-full text-wrap"
                  variant="outlineDark"
                  onClick={() => connectWallet()}
                >
                  {t("connectWalletToSupport", { username })}
                </Button>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-start mt-8 md:mt-0 md:space-x-8 md:max-w-[1024px]">
              {/* Preview Image */}
              <div className="flex justify-center md:w-auto">
                <Avatar className="w-64 h-64 md:w-96 md:h-96 border-4 border-gray-800 shadow-lg rounded-lg">
                  <AvatarImage
                    src={metadata?.image || ""}
                    alt={`@${username}`}
                  />
                  <AvatarFallback>
                    {typeof username === "string"
                      ? username.charAt(0).toUpperCase()
                      : ""}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Right Column */}
              <div className="flex flex-col md:flex-1">
                {/* Description */}
                <div className="text-center md:text-left my-6 max-w-2xl mx-auto md:mx-0 break-all">
                  <p className="text-gray-300 leading-relaxed">
                    {metadata?.description}
                  </p>
                </div>

                {/* Button - desktop only */}
                <div className="flex justify-center md:justify-end mt-4">
                  {!loading && connected ? (
                    <div className="w-full flex flex-col justify-center space-y-4 md:space-y-4">
                      <Tokens
                        username={username}
                        creatorAddress={creatorAddress!}
                        trigger={
                          <Button
                            className="w-full"
                            variant="default"
                            disabled={!username || !creatorAddress}
                          >
                            {t("supportButton", { username })}
                          </Button>
                        }
                      />
                      <Button
                        className="w-full text-foreground"
                        variant="outline"
                        disabled={!username || !creatorAddress}
                        onClick={() => router.push(`/vault/${username}`)}
                      >
                        {t("vaultButton", { username })}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full text-wrap"
                      variant="outlineDark"
                      onClick={() => connectWallet()}
                    >
                      {t("connectWalletToSupport", { username })}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={() => {
          setShowErrorDialog(false);
          router.push(`/p/${username}`);
        }}
        title={t("errorTitle")}
        description={t("errorDescription", { username: username })}
      />
    </>
  );
}
