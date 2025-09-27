import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */

  compiler: {
    // Remove console.* only in production builds,
    // which includes builds run via next-on-pages
    removeConsole: process.env.NODE_ENV === "production",
  },
};

const withNextIntl = require("next-intl/plugin")("./src/i18n.ts");

export default withNextIntl(nextConfig);
