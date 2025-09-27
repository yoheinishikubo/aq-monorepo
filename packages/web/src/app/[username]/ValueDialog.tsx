"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatDisplayBalance, multiplyDecimals } from "@/lib/utils";
import { ConfirmSupportDialog } from "./Confirm";
import { HeartHandshake } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface ValueDialogProps {
  username: string;
  trigger: React.ReactNode;
  balance: bigint;
  decimals: string;
  symbol: string;
  tokenAddress: string;
  creatorAddress: string;
}

export function ValueDialog({
  username,
  trigger,
  balance,
  decimals,
  symbol,
  tokenAddress,
  creatorAddress,
}: ValueDialogProps) {
  const t = useTranslations("ValueDialog");
  const locale = useLocale();
  const [rawInput, setRawInput] = useState<string>(
    formatDisplayBalance(0n, decimals, 3, locale)
  );
  const [inputValue, setInputValue] = useState<bigint>(0n);
  const [open, setOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawInput(e.target.value);
  };

  const handleBlur = () => {
    console.log({ rawInput, decimals });
    const parsed = multiplyDecimals(rawInput, decimals, locale);
    setInputValue(parsed);
    setRawInput(formatDisplayBalance(parsed, decimals, 3, locale));
  };

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HeartHandshake className="w-5 h-5 mr-2" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { username })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="value" className="text-right">
              {symbol}
            </Label>
            <div className="relative flex-grow">
              <span className="absolute right-3 -top-5 text-xs text-gray-500">
                {t("balance", {
                  balance: formatDisplayBalance(balance, decimals, 3, locale),
                })}
              </span>
              <Input
                id="value"
                value={rawInput}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full pr-3 text-right text-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {decimals &&
              [
                { label: "1", factor: 1n * 10n ** BigInt(decimals || "0") },
                { label: "10", factor: 10n * 10n ** BigInt(decimals || "0") },
                { label: "100", factor: 100n * 10n ** BigInt(decimals || "0") },
                { label: t("max"), factor: balance },
              ].map(({ label, factor }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputValue(factor);
                    setRawInput(
                      formatDisplayBalance(factor, decimals, 3, locale)
                    );
                  }}
                >
                  {label}
                </Button>
              ))}
          </div>
        </div>
        <DialogFooter>
          <ConfirmSupportDialog
            symbol={symbol}
            decimals={decimals}
            tokenAddress={tokenAddress}
            username={username}
            value={inputValue}
            creatorAddress={creatorAddress}
            trigger={
              <Button
                type="submit"
                disabled={inputValue <= 0n || inputValue > balance}
              >
                {t("confirm")}
              </Button>
            }
          />

          <Button variant="outline" onClick={handleClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
