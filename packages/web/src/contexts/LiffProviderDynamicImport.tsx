"use client";

import dynamic from "next/dynamic";

const LiffProvider = dynamic(
  () => import("./LiffProvider").then((mod) => mod.LiffProvider),
  { ssr: false }
);

export default function LiffProviderDynamicImport({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiffProvider>{children}</LiffProvider>;
}
