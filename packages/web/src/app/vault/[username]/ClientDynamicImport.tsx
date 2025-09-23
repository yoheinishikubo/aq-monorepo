"use client";

import dynamic from "next/dynamic";

const VaultContent = dynamic(() => import("./VaultContent"), {
  ssr: false,
});

export default VaultContent;
