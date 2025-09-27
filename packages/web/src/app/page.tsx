"use client";

import { useTranslations } from "next-intl";
import { ReceiveLogs } from "@/components/ReceiveLogs";
import { SupportLogs } from "@/components/SupportLogs";
import { DepositLogs } from "@/components/DepositLogs";
import { DepositedLogs } from "@/components/DepositedLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientComponent from "./ClientComponent";
import React from "react";

export default function Home() {
  const t = useTranslations("Index");

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <h2 className="text-3xl font-bold text-center mb-2">{t("title")}</h2>
      <p className="text-center text-gray-400 mb-8">{t("description")}</p>
      <ClientComponent />
      <Tabs defaultValue="receive" className="w-full dark">
        <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
          <TabsList className="w-max sm:w-full justify-start gap-1 min-w-max">
            <TabsTrigger
              className="flex-none sm:flex-1 snap-start"
              value="receive"
            >
              {t("receiveLogs")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none sm:flex-1 snap-start"
              value="support"
            >
              {t("supportLogs")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none sm:flex-1 snap-start"
              value="deposited"
            >
              {t("depositedLogs")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none sm:flex-1 snap-start"
              value="deposit"
            >
              {t("depositLogs")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="receive">
          <ReceiveLogs />
        </TabsContent>
        <TabsContent value="support">
          <SupportLogs />
        </TabsContent>
        <TabsContent value="deposited">
          <DepositedLogs />
        </TabsContent>
        <TabsContent value="deposit">
          <DepositLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
