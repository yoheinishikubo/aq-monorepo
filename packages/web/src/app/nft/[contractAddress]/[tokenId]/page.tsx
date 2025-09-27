"use server";
import { fetchMetadataForToken, getUsernameFromAddress } from "@/app/actions";
import { Constants, formatDisplayBalance } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MessageButton from "./MessageButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import chains from "@/lib/chains.json";
import { type Metadata, type Message } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";

export default async function NFTPage({
  params,
}: {
  params: Promise<{ contractAddress: string; tokenId: string }>;
}) {
  const t = await getTranslations("NFTPage");
  const locale = await getLocale();
  const resolvedParams = await Promise.resolve(params);
  const { contractAddress, tokenId } = resolvedParams;

  const { browserURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME as keyof typeof chains] || {};

  const metadata: Metadata & { message?: Message } =
    await fetchMetadataForToken(contractAddress, BigInt(tokenId));

  const owner =
    (metadata.attributes?.find(
      (attr) => attr.trait_type === Constants.LABEL_OWNER_ADDRESS
    )?.value as string) || "";

  const value =
    (metadata.attributes?.find(
      (attr) => attr.trait_type === Constants.LABEL_SUPPORTED_VALUE
    )?.value as string) || "";

  const creatorAddress =
    (metadata.attributes?.find(
      (attr) => attr.trait_type === Constants.LABEL_CREATOR_ADDRESS
    )?.value as string) || "";

  const username = await getUsernameFromAddress(contractAddress);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <Card className="overflow-hidden bg-gray-800 border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-4">
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-auto rounded-lg object-cover"
              />
            </div>
            <div className="p-4 md:p-8 flex flex-col">
              <CardHeader className="p-0">
                <CardTitle className="text-3xl font-bold text-white">
                  {metadata.name}
                </CardTitle>
                <CardDescription className="text-lg text-gray-400">
                  {t("tokenId", { tokenId })}
                </CardDescription>
              </CardHeader>
              <Separator className="my-4" />
              <CardContent className="p-0 flex-grow break-all">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {t("owner")}
                    </h3>
                    <Link
                      href={`${browserURL}/address/${owner}`}
                      className="text-blue-400 hover:underline break-all"
                      target="_blank"
                    >
                      {owner}
                    </Link>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {t("description")}
                    </h3>
                    <p className="text-gray-300">{metadata.description}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {t("value")}
                    </h3>
                    <p className="text-gray-300">
                      {formatDisplayBalance(BigInt(value), "6", 3, locale)} USDt
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {t("creatorAddress")}
                    </h3>
                    <p className="text-gray-300">{creatorAddress}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 mt-6">
                <div className="flex w-full flex-col space-y-2">
                  <Button asChild className="w-full">
                    <Link href={`/${username}`}>
                      {t("supportMore", { username })}
                    </Link>
                  </Button>
                  <MessageButton
                    username={username}
                    contractAddress={contractAddress}
                    tokenId={tokenId}
                    creatorAddress={creatorAddress}
                    message={metadata.message}
                  />
                </div>
              </CardFooter>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
