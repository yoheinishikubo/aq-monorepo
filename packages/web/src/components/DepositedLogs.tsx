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
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletProvider";
import chains from "@/lib/chains.json";
import { Button } from "./ui/button";
import { type DepositLog } from "@/types";
import { useLocale, useTranslations } from "next-intl";
import { getDepositedLogs } from "../app/actions";

export function DepositedLogs() {
  const t = useTranslations("DepositedLogs");
  const locale = useLocale();
  const { signer, connected } = useWallet();
  const [logs, setLogs] = useState<DepositLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const { browserURL } =
    chains[process.env.NEXT_PUBLIC_CHAIN_NAME as keyof typeof chains] || {};

  const fetchLogs = () => {
    if (!signer?.address) return;
    setLoading(true);
    getDepositedLogs(signer.address, page, limit)
      .then((result) => {
        setLogs(result.items);
        setTotal(result.total);
      })
      .catch((error) => {
        console.error("Error fetching deposited logs:", error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer?.address, page]);

  if (!connected) return <div></div>;

  return (
    <div>
      <Table className="bg-gray-900 text-white">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left text-white">{t("owner")}</TableHead>
            <TableHead className="text-left text-white">{t("value")}</TableHead>
            <TableHead className="text-left text-white">{t("share")}</TableHead>
            <TableHead className="text-left text-white">
              {t("mintedAt")}
            </TableHead>
            <TableHead className="text-left text-white">
              {t("transaction")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={`${log.transactionHash}-${log.timestamp}`}>
              <TableCell>{formatAddress(log.ownerAddress)}</TableCell>
              <TableCell className="font-mono text-right">
                {formatDisplayBalance(log.value, "6", 3, locale)}
              </TableCell>
              <TableCell className="font-mono text-right">
                {(log.share / 10000).toLocaleString(locale, {
                  style: "percent",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {new Date(parseInt(log.timestamp) * 1000)
                  .toLocaleString(locale)
                  .replace(/\d+/g, (m) => m.padStart(2, "0"))}
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
          ))}
        </TableBody>
      </Table>
      {!loading && logs.length > 0 && (
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
