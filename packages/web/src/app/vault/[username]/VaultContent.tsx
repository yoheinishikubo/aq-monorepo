"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogSpinnerOverlay,
} from "@/components/ui/dialog";
import { useLocale, useTranslations } from "next-intl";

import contracts from "@/lib/contracts.json";
import {
  balanceOf,
  depositToVault,
  fetchMetadata,
  getContractAddress,
  getTokenInfo,
  getTypedData,
  getValueDeposited,
  getVaultAddress,
  ownerOf,
  saveDepositLog,
} from "@/app/actions";
import { type Metadata } from "@/types";
import {
  formatAddress,
  formatDisplayBalance,
  multiplyDecimals,
} from "@/lib/utils";
import { useWallet } from "@/contexts/WalletProvider";
import { Signature } from "ethers";

export default function VaultContent({ username }: { username: string }) {
  const locale = useLocale();
  const t = useTranslations("ConfirmSupportDialog");

  const { signer, connected, connectWallet } = useWallet();

  // Profile metadata
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  // Balances
  const [usdtBalance, setUsdtBalance] = useState<bigint>(0n);
  const [deposited, setDeposited] = useState<bigint>(0n);

  // Input control (display string + parsed bigint)
  const [rawInput, setRawInput] = useState<string>("0");
  const [inputValue, setInputValue] = useState<bigint>(0n);
  const [creatorAddress, setCreatorAddress] = useState<string | null>(null);
  // Yield share input (0-100%)
  const [share, setShare] = useState<number>(50);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const minThreshold = useMemo(() => {
    const d = "6";
    return multiplyDecimals("1000", d, locale);
  }, [locale]);

  const additionalRequired = useMemo(() => {
    const need = minThreshold - deposited;
    return need > 0n ? need : 0n;
  }, [minThreshold, deposited]);

  useEffect(() => {}, [deposited]);

  useEffect(() => {
    if (!signer) {
      return;
    }
    if (!signer.address) {
      return;
    }
    if (!creatorAddress) {
      return;
    }

    updateBalances();
  }, [creatorAddress, signer]);

  // Load profile metadata and token info
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const contractAddress = await getContractAddress(username);
        setCreatorAddress(await ownerOf(contractAddress, 0n));

        const md = await fetchMetadata(contractAddress);
        if (!cancelled) setMetadata(md);

        // Select default token (USDt)
        const t = await getTokenInfo(contracts.usdt);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Load balances when signer or token changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (signer?.address) {
          const bal = await balanceOf(contracts.usdt, signer.address);
          if (!cancelled) setUsdtBalance(bal);
        } else {
          if (!cancelled) setUsdtBalance(0n);
        }

        // Deposited: placeholder 0n (no on-chain API available yet)
        if (!cancelled) setDeposited(0n);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (!cancelled) {
          setUsdtBalance(0n);
          setDeposited(0n);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [signer?.address]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawInput(e.target.value);
  };

  const handleBlur = () => {
    const d = "6";
    const parsed = multiplyDecimals(rawInput || "0", d, locale);
    setInputValue(parsed);
    setRawInput(formatDisplayBalance(parsed, d, 3, locale));
  };

  const onRefund = async () => {};

  const updateBalances = async () => {
    if (!signer?.address) {
      return;
    }
    if (!creatorAddress) {
      return;
    }

    balanceOf(contracts.usdt, signer.address).then((bal) => {
      console.log("USDt balance:", bal);
      setUsdtBalance(bal);
    });

    getVaultAddress(signer.address, creatorAddress).then((addr) => {
      console.log("Vault address:", addr);

      getValueDeposited(addr).then((val) => {
        console.log("Value deposited:", val);
        setDeposited(val);
      });
    });
  };

  const onDeposit = async () => {
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    setIsProcessing(true);
    if (!signer?.address) {
      setIsProcessing(false);
      return;
    }
    if (inputValue <= 0n) {
      setIsProcessing(false);
      return;
    }
    if (inputValue > usdtBalance) {
      setIsProcessing(false);
      return;
    }
    if (!creatorAddress) {
      setIsProcessing(false);
      return;
    }

    // Get typed data for permit
    const typedData = await getTypedData(
      contracts.factoryAQMint,
      contracts.usdt,
      signer.address,
      inputValue
    );
    if (!typedData) {
      throw new Error(t("failedToGetTypedData"));
    }

    const signature = await signer.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.values
    );
    const { v, r, s } = Signature.from(signature);
    const params = {
      owner: typedData.values.owner,
      spender: typedData.values.spender,
      value: typedData.values.value,
      nonce: typedData.values.nonce,
      deadline: typedData.values.deadline,
      v,
      r,
      s,
    };

    const currentBalance = await depositToVault(
      signer.address,
      creatorAddress,
      share,
      params
    );

    let updatedBalance;
    while (true) {
      updatedBalance = await balanceOf(contracts.usdt, signer.address);
      if (updatedBalance !== currentBalance) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    await saveDepositLog(signer.address, creatorAddress);

    setInputValue(0n);
    setRawInput("0");

    await updateBalances();
    setIsProcessing(false);
  };

  const setMin = () => {
    const d = "6";
    const v = additionalRequired;
    setInputValue(v);
    setRawInput(formatDisplayBalance(v, d, 3, locale));
  };

  const setMax = () => {
    const d = "6";
    const v = usdtBalance;
    setInputValue(v);
    setRawInput(formatDisplayBalance(v, d, 3, locale));
  };

  const canDeposit = useMemo(() => {
    if (inputValue <= 0n) return false;
    if (inputValue > usdtBalance) return false;
    return deposited + inputValue >= minThreshold;
  }, [inputValue, usdtBalance, deposited, minThreshold]);

  const canRefund = useMemo(() => {
    // Enable when there is something deposited
    return deposited > 0n;
  }, [deposited]);

  const d = "6";
  const symbol = "USDt";

  return (
    <div className="bg-gray-900 text-white min-h-screen overflow-x-hidden">
      {/* Banner */}
      <div className="w-full">
        <div className="relative mb-2 mx-auto group aspect-[7/1] md:aspect-[12/1]">
          {metadata?.banner_image_url && (
            <img
              src={metadata.banner_image_url}
              alt="banner"
              className="object-cover w-full h-full"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-8">
        <div className="mx-auto md:max-w-[640px] grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
          {/* Icon */}
          <div className="flex justify-center">
            <Avatar className="w-40 h-40 md:w-52 md:h-52 border-4 border-gray-800 shadow-lg rounded-lg">
              <AvatarImage src={metadata?.image || ""} alt={`@${username}`} />
              <AvatarFallback>
                {typeof username === "string"
                  ? username.charAt(0).toUpperCase()
                  : ""}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Vault for @{username}</h2>
              <p className="text-gray-300 mt-1">
                This is the vault for @{username}.
              </p>
            </div>

            <Separator className="my-2" />

            {!connected ? (
              <div className="mt-2 text-center">
                <Button
                  className="w-full md:w-auto"
                  variant="outlineDark"
                  onClick={connectWallet}
                >
                  {`Connect Wallet to Access Vault for @${username}`}
                </Button>
              </div>
            ) : (
              <>
                {/* Input area */}
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="vaultValue" className="text-right">
                    {symbol}
                  </Label>
                  <div className="relative flex-grow pt-10">
                    <div className="absolute right-3 top-0 text-xs text-gray-400 text-right space-y-0.5">
                      <div>
                        Balance:{" "}
                        {formatDisplayBalance(usdtBalance, d, 3, locale)}{" "}
                        {symbol}
                      </div>
                      <div>
                        Deposited:{" "}
                        {formatDisplayBalance(deposited, d, 3, locale)} {symbol}
                      </div>
                    </div>
                    <Input
                      id="vaultValue"
                      value={rawInput}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full pr-3 text-right text-lg"
                      disabled={loading}
                    />
                    <div className="flex gap-2 mt-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-black"
                        onClick={setMin}
                        disabled={usdtBalance === 0n}
                      >
                        min
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-black"
                        onClick={setMax}
                        disabled={usdtBalance === 0n}
                      >
                        max
                      </Button>
                    </div>
                    {deposited + inputValue < minThreshold && (
                      <div className="text-xs text-red-400 mt-1 text-right">
                        Minimum required:{" "}
                        {formatDisplayBalance(minThreshold, d, 3, locale)}{" "}
                        {symbol}
                      </div>
                    )}
                  </div>
                </div>

                {/* Share input */}
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="share" className="text-right">
                    Yield Share to Fav(%)
                  </Label>
                  <div className="flex-grow">
                    <Input
                      id="share"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={String(share)}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        if (Number.isNaN(num)) {
                          setShare(0);
                        } else {
                          const clamped = Math.max(
                            0,
                            Math.min(100, Math.floor(num))
                          );
                          setShare(clamped);
                        }
                      }}
                      className="w-full pr-3 text-right text-lg"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4 justify-center">
                  <Button disabled={!canDeposit} onClick={onDeposit}>
                    Deposit
                  </Button>
                  <Button variant="outlineDark" disabled={!canRefund}>
                    Refund
                  </Button>
                </div>

                {/* Confirm Deposit Dialog */}
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <DialogContent className="rounded-md md:max-w-lg max-w-[calc(100vw-2rem)]">
                    {isProcessing && <DialogSpinnerOverlay />}
                    <DialogHeader>
                      <DialogTitle>Confirm Deposit</DialogTitle>
                      <DialogDescription asChild>
                        <div>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell>Amount</TableCell>
                                <TableCell className="text-right">
                                  <strong>
                                    {formatDisplayBalance(
                                      inputValue,
                                      d,
                                      3,
                                      locale
                                    )}{" "}
                                    USDt
                                  </strong>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>For</TableCell>
                                <TableCell className="text-right break-words whitespace-normal">
                                  <strong>@{username}</strong>
                                  <div className="text-xs text-gray-500 break-words whitespace-normal">
                                    {formatAddress(creatorAddress)}
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Yield Share</TableCell>
                                <TableCell className="text-right">
                                  <strong>
                                    {share}% to @{username}
                                  </strong>
                                  <br />
                                  <strong>{100 - share}% to you</strong>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Refundable</TableCell>
                                <TableCell className="text-right">
                                  <strong>Anytime</strong>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        onClick={async () => {
                          await onConfirm();
                          setConfirmOpen(false);
                        }}
                        disabled={isProcessing}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmOpen(false)}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
