"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAddress, formatDisplayBalance } from "@/lib/utils";
import { getReceiveLogs } from "../app/actions";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletProvider";
import chains from "@/lib/chains.json";
import DOMPurify from "dompurify";
import { ReplyDialog } from "./ReplyDialog";
import { Button } from "./ui/button";
import { type SupportLog } from "@/types";
import { useLocale, useTranslations } from "next-intl";

export function ReceiveLogs() {
  const t = useTranslations("ReceiveLogs");
  const locale = useLocale();
  const { signer, connected } = useWallet();
  const [receiveLogs, setReceiveLogs] = useState<SupportLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const { browserURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME as keyof typeof chains] || {};

  const fetchLogs = () => {
    if (!signer?.address) {
      return;
    }
    setLoading(true);
    getReceiveLogs(signer.address, page, limit)
      .then((result) => {
        setReceiveLogs(result.items);
        setTotal(result.total);
      })
      .catch((error) => {
        console.error("Error fetching receive logs:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [signer?.address, page]);

  return !connected ? (
    <div></div>
  ) : (
    <div>
      <Table className="bg-gray-900 text-white">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left text-white">
              {t("supporter")}
            </TableHead>
            <TableHead className="text-left text-white">
              {t("tokenId")}
            </TableHead>
            <TableHead className="text-white">{t("reply")}</TableHead>
            <TableHead className="text-left text-white">{t("value")}</TableHead>
            <TableHead className="text-left text-white">
              {t("mintedAt")}
            </TableHead>
            <TableHead className="text-left text-white">
              {t("message")}
            </TableHead>
            <TableHead className="text-left text-white">
              {t("transaction")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receiveLogs.map((log) => {
            console.log("Receive Log:", log);
            return (
              <TableRow
                key={`${log.transactionHash}-${log.tokenId.toString()}`}
              >
                <TableCell>{formatAddress(log.supporterAddress)}</TableCell>
                <TableCell className="font-mono text-right">
                  {log.tokenId.toString()}
                </TableCell>
                <TableCell className="text-center">
                  {!log.message?.reply ? (
                    <ReplyDialog
                      contractAddress={log.nftAddress}
                      tokenId={log.tokenId.toString()}
                      to={log.supporterAddress}
                      username={log.username || ""}
                      value={log.value}
                      mintedAt={parseInt(log.timestamp) * 1000}
                      originalMessage={log.message?.message}
                      onMessageSent={fetchLogs}
                      trigger={
                        <Button variant="outline" className="bg-gray-900">
                          {t("reply")}
                        </Button>
                      }
                    />
                  ) : (
                    t("alreadyReplied")
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

                <TableCell
                  className="max-w-[150px] truncate"
                  title={log.message?.message || ""}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(log.message?.message || ""),
                  }}
                ></TableCell>

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
      {!loading && receiveLogs.length > 0 && (
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
