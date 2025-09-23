"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StepIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700/50 border border-slate-600 text-sky-400">
    {children}
  </div>
);

export default function HowPage() {
  const t = useTranslations("HowPage");

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-8">
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            {t("title")}
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto">
            {t("intro")}
          </p>
          <p className="text-md sm:text-lg text-slate-400 mt-4 max-w-2xl mx-auto">
            {t("autoCreation")}
          </p>
        </div>

        <div className="my-10 max-w-4xl mx-auto">
          <Card className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg">
            <CardHeader className="pt-6">
              <CardTitle className="text-3xl font-bold text-center text-teal-300">
                {t("whatYouNeedTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-lg text-slate-300 pb-6">
              <p>{t("whatYouNeed")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="my-12">
          <h2 className="text-4xl font-bold text-center mb-10 text-sky-400">
            {t("howItWorksTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-2">
            <Card className="bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col p-6 text-center">
              <CardHeader className="p-0">
                <StepIcon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </StepIcon>
                <CardTitle className="text-2xl font-bold text-slate-200">
                  {t("step1Title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-0 mt-4">
                <ul className="list-disc list-outside pl-5 space-y-2 text-slate-400 text-left">
                  <li>{t("step1_1")}</li>
                  <li>{t("step1_2")}</li>
                  <li>{t("step1_3")}</li>
                  <li>{t("step1_4")}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col p-6 text-center">
              <CardHeader className="p-0">
                <StepIcon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </StepIcon>
                <CardTitle className="text-2xl font-bold text-slate-200">
                  {t("step2Title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-0 mt-4">
                <ul className="list-disc list-outside pl-5 space-y-2 text-slate-400 text-left">
                  <li>{t("step2_1")}</li>
                  <li>{t("step2_2")}</li>
                  <li>{t("step2_3")}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col p-6 text-center">
              <CardHeader className="p-0">
                <StepIcon>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </StepIcon>
                <CardTitle className="text-2xl font-bold text-slate-200">
                  {t("step3Title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-0 mt-4">
                <ul className="list-disc list-outside pl-5 space-y-2 text-slate-400 text-left">
                  <li>{t("step3_1")}</li>
                  <li>{t("step3_2")}</li>
                  <li>{t("step3_3")}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
