"use client";

import dynamic from "next/dynamic";

const WalletProvider = dynamic(
  () => import("./WalletProvider").then((mod) => mod.WalletProvider),
  { ssr: false }
);

export default function WalletProviderDynamicImport({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}
