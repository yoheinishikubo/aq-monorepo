import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

export default function Footer() {
  const t = useTranslations("Footer");
  return (
    <footer className="bg-gray-800 text-white p-4 text-center">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center space-x-4">
          <Link href="/terms" className="hover:underline">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t("privacy")}
          </Link>
        </div>
        <p className="mt-4">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
