"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogSpinnerOverlay,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import * as Comlink from "comlink";
import { useToast } from "@/components/ui/use-toast";
import { deployContract } from "@/app/actions";
import { useWallet } from "@/contexts/WalletProvider";
import { Copy } from "lucide-react";
import { type Metadata } from "@/types";
import { useTranslations } from "next-intl";

export function PreviewContent() {
  const t = useTranslations("PreviewContent");
  const params = useParams();
  const username = params.username as string;

  const { signer, connected } = useWallet();

  const router = useRouter();
  const { toast } = useToast();

  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [iconImage, setIconImage] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const profileWorkerRef = useRef<Comlink.Remote<ProfileWorkerApi> | null>(
    null
  );
  const [status, setStatus] = useState("Idle");
  const [ready, setReady] = useState(false);
  const [matched, setMatched] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const [, setDebugInfo] = useState("");

  type ProfileWorkerApi = {
    fetchProfileData: (username: string, walletAddress: string) => Promise<any>;
    compressProfileImages: (metadata: Metadata) => Promise<void>;
    updateCreatorAddress: (newAddress: string) => Promise<void>;
    initFFmpegWorker: (
      callback: Comlink.Remote<(message: string) => Promise<void>>,
      callback2: Comlink.Remote<(message: string) => Promise<void>>
    ) => Promise<void>;
    deploy: () => Promise<void>;
  };
  useEffect(() => {
    if (!connected) {
      return;
    }

    if (status === "Image loaded") {
      console.log("Status is 'Image loaded'");
      profileWorkerRef.current
        ?.updateCreatorAddress(signer.address)
        .then(() => {
          setReady(true);
        });
    }
  }, [status, connected]);

  useEffect(() => {
    console.log("Current status:", status);
    if (!username || !profileWorkerRef.current) {
      return;
    }

    if (status === "Address matched") {
      setMatched(true);
    }

    if (status === "FFmpeg Worker ready") {
      profileWorkerRef.current
        .fetchProfileData(username, signer?.address || "")
        .then((data: any) => {
          setBannerImage(data.banner_image_url || null);
          setIconImage(data.image || null);
          setDescription(data.description || null);
          setName(data.name || null);
          profileWorkerRef.current?.compressProfileImages(data);
        })
        .catch((error: any) => {
          console.error("Error fetching profile data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [status, username]);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL("@/workers/profile-fetch.worker.ts", import.meta.url),
      { type: "module" }
    );
    profileWorkerRef.current = Comlink.wrap<ProfileWorkerApi>(workerInstance);

    // Pass a Comlink-wrapped callback to the worker for status updates
    const handleStatusUpdate = Comlink.proxy(async (message: string) => {
      setStatus(message);
      setDebugInfo((prev) => prev + message + "\n");
    }) as unknown as Comlink.Remote<(message: string) => Promise<void>>;

    const handleMetadataUpdate = Comlink.proxy(async (data: string) => {
      setMetadata(JSON.parse(data));
    }) as unknown as Comlink.Remote<(data: string) => void>;

    profileWorkerRef.current
      .initFFmpegWorker(handleStatusUpdate, handleMetadataUpdate)
      .catch((error) => {
        console.error("Error initializing FFmpeg worker:", error);
        setStatus("Failed to initialize FFmpeg worker");
      });

    return () => {
      workerInstance.terminate();
    };
  }, []);

  useEffect(() => {
    if (!signer?.address || !metadata) {
      setMatched(false);
      return;
    }

    if (metadata.description?.includes(signer.address)) {
      setMatched(true);
      setStatus("Address matched");
    } else {
      setMatched(false);
      setStatus("Idle");
    }
  }, [signer, metadata?.description]);

  const handleCopy = () => {
    navigator.clipboard.writeText(signer?.address || "").then(
      () => {
        toast({
          title: t("copied"),
          description: t("addressCopied"),
        });
      },
      () => {
        toast({
          title: t("copyFailed"),
          description: t("couldNotCopyAddress"),
          variant: "destructive",
        });
      }
    );
  };

  return (
    <>
      <Dialog open={loading}>
        <DialogSpinnerOverlay />
      </Dialog>
      <div className="bg-gray-900 text-white min-h-screen">
        <div className="container mx-auto p-4">
          {/* Banner Image */}
          <div className="relative mb-2 mx-auto max-w-[600px] group">
            <AspectRatio ratio={7 / 1}>
              {bannerImage && (
                <img
                  src={bannerImage}
                  alt={t("bannerImageAlt")}
                  className="rounded-md object-cover w-full h-full"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-md" />
            </AspectRatio>
            {/* Icon Image - Overlapping Banner */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
              <Avatar className="w-32 h-32 border-4 border-gray-800 shadow-lg rounded-lg transition-transform duration-300 group-hover:scale-105">
                <AvatarImage src={iconImage || ""} alt={`@${username}`} />
                <AvatarFallback>
                  {typeof username === "string"
                    ? username.charAt(0).toUpperCase()
                    : ""}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Spacer for overlapping avatar */}
          <div className="mt-20" />

          {/* Username and Name */}
          <div className="text-center mt-4">
            <h1 className="text-3xl font-bold text-white">{name}</h1>
            <p className="text-lg text-gray-400">@{username}</p>
          </div>

          {/* Description */}
          <div className="text-center my-6 max-w-2xl mx-auto break-all">
            <p className="text-gray-300 leading-relaxed">{description}</p>
          </div>

          {/* Caution Text and Confirm Button */}
          {connected && (
            <div className="flex flex-col items-center mt-8">
              <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 rounded-lg p-4 w-full max-w-md text-sm mb-6">
                <p className="font-semibold mb-2">
                  {t("areYouUsername", { username })}
                </p>
                <p>{t("deployInstruction")}</p>
                <div className="flex items-center space-x-2 my-2">
                  <Input
                    type="text"
                    value={signer?.address}
                    readOnly
                    className="bg-gray-800/50 text-white flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopy}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2">{t("confirmProceed")}</p>
              </div>

              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-4 max-w-md text-sm mb-6">
                <p className="font-bold mb-2">{t("achtung")}</p>
                <p>{t("ensureDetails")}</p>
              </div>

              <Dialog>
                <DialogSpinnerOverlay />
                <DialogTrigger asChild>
                  {
                    <Button
                      className="w-full max-w-[200px]"
                      disabled={!ready || !matched}
                      onClick={async () => {
                        setLoading(true);
                        setStatus("Deploying...");
                        setDebugInfo(JSON.stringify(metadata, null, 2));

                        try {
                          await deployContract(metadata!);
                          console.log("Contract deployed successfully");
                          router.push(`/${username}`); // Navigate to the preview page after deployment
                        } catch (error) {
                          console.error("Deployment failed:", error);
                          setStatus("Deployment failed");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {t("confirm")}
                    </Button>
                  }
                </DialogTrigger>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
