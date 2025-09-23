"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decodeReply, formatDisplayBalance } from "@/lib/utils";
import { getMessage, getSupportLogs } from "../app/actions";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletProvider";
import chains from "@/lib/chains.json";
import DOMPurify from "dompurify";
import { Button } from "./ui/button";
import { createReplyCard, embedMessageInJpeg } from "@/lib/image";
import { MessageDialog } from "./MessageDialog";
import Link from "next/link";
import { type SupportLog } from "@/types";
import { useLocale, useTranslations } from "next-intl";

export function SupportLogs() {
  const t = useTranslations("SupportLogs");
  const locale = useLocale();
  const { signer, connected } = useWallet();
  const [supportLogs, setSupportLogs] = useState<SupportLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const { browserURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME as keyof typeof chains] || {};

  const refreshLogs = () => {
    if (!signer?.address) {
      return;
    }
    setLoading(true);
    getSupportLogs(signer.address, page, limit)
      .then((result) => {
        setSupportLogs(result.items);
        setTotal(result.total);
      })
      .catch((error) => {
        console.error("Error fetching support logs:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshLogs();
  }, [signer?.address, page]);

  async function downloadReplyCard(contractAddress: string, tokenId: string) {
    const { signature, reply } = await getMessage(contractAddress, tokenId);
    if (!signature || !reply) {
      alert(t("noReplyCard"));
      return;
    }

    const { message, receiver, value, mintedAt, repliedAt, username } =
      decodeReply(reply);

    const dataUrl = await createReplyCard(
      message,
      username,
      contractAddress,
      tokenId,
      receiver,
      value,
      mintedAt,
      repliedAt
    );

    if (dataUrl) {
      const newJpegDataUrl = embedMessageInJpeg(dataUrl, reply, signature);
      const link = document.createElement("a");
      link.href = newJpegDataUrl;
      link.download = `reply-card-${contractAddress}-${tokenId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return !connected ? (
    <div></div>
  ) : (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-gray-900 text-white">
              {t("accountSupported")}
            </TableHead>
            <TableHead className="bg-gray-900 text-white">
              {t("tokenId")}
            </TableHead>
            <TableHead className="bg-gray-900 text-white">
              {t("message")}
            </TableHead>
            <TableHead className="bg-gray-900 text-white">
              {t("value")}
            </TableHead>
            <TableHead className="bg-gray-900 text-white">
              {t("mintedAt")}
            </TableHead>

            <TableHead className="bg-gray-900 text-white">
              {t("reply")}
            </TableHead>
            <TableHead className="bg-gray-900 text-white">
              {t("transaction")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {supportLogs.map((log, index) => {
            return (
              <TableRow key={index}>
                <TableCell>
                  <Link href={`/${log.username}`}>@{log.username}</Link>
                </TableCell>
                <TableCell className="font-mono text-right">
                  <Link
                    href={`/nft/${log.nftAddress}/${log.tokenId.toString()}`}
                  >
                    {log.tokenId.toString()}
                  </Link>
                </TableCell>
                <TableCell
                  className="max-w-[150px] truncate text-center"
                  title={log.message?.message || ""}
                >
                  {log.message?.message ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(log.message?.message || ""),
                      }}
                    ></div>
                  ) : (
                    <MessageDialog
                      contractAddress={log.nftAddress}
                      tokenId={log.tokenId.toString()}
                      creatorAddress={log.creatorAddress}
                      username={log.username}
                      trigger={
                        <Button
                          variant="outline"
                          className="bg-gray-900 text-white"
                        >
                          {t("message")}
                        </Button>
                      }
                      onMessageSent={refreshLogs}
                    />
                  )}
                </TableCell>
                <TableCell className="font-mono text-right">
                  {formatDisplayBalance(log.value, "6", 3, locale)}
                </TableCell>
                <TableCell className="font-mono text-right">
                  {new Date(parseInt(log.timestamp) * 1000)
                    .toLocaleString(locale)
                    .replace(/\d+/g, (match) => match.padStart(2, "0"))}
                </TableCell>

                <TableCell className="text-center">
                  {log.message?.reply ? (
                    <Button
                      variant="outline"
                      className="bg-gray-900 text-white"
                      onClick={() =>
                        downloadReplyCard(
                          log.nftAddress,
                          log.tokenId.toString()
                        )
                      }
                    >
                      {t("download")}
                    </Button>
                  ) : (
                    t("notYet")
                  )}
                </TableCell>

                <TableCell>
                  {browserURL ? (
                    <a
                      href={`${browserURL}/tx/${log.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("view")}
                    </a>
                  ) : (
                    log.transactionHash
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!loading && supportLogs.length > 0 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            variant="outline"
            className="bg-gray-900 text-white"
          >
            {t("previous")}
          </Button>
          <span className="text-white">
            {t("page")} {page} {t("of")} {Math.ceil(total / limit)}
          </span>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page * limit >= total}
            variant="outline"
            className="bg-gray-900 text-white"
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
