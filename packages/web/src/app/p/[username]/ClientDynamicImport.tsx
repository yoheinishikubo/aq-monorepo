"use client";

import dynamic from "next/dynamic";

const PreviewContent = dynamic(
  () => import("./PreviewContent").then((mod) => mod.PreviewContent),
  { ssr: false }
);

export default function ClientDynamicImport() {
  return <PreviewContent />;
}
