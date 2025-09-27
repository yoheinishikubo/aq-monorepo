"use client";

import dynamic from "next/dynamic";

const AccountContent = dynamic(
  () => import("./AccountContent").then((mod) => mod.AccountContent),
  { ssr: false }
);

export default function ClientDynamicImport({
  username,
}: {
  username: string;
}) {
  return <AccountContent username={username} />;
}
