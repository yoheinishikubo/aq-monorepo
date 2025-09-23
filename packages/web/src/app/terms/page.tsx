import { getTranslations } from "next-intl/server";

import LegalContent from "@/components/LegalContent";

const Page = async () => {
  const t = await getTranslations();

  return (
    <LegalContent
      title={t("terms.title")}
      description={t("terms.description")}
      date={t("terms.date")}
      content={[
        {
          title: t("terms.content.1.title"),
          texts: [t("terms.content.1.texts.1")],
        },
        {
          title: t("terms.content.2.title"),
          texts: [t("terms.content.2.texts.1")],
        },
        {
          title: t("terms.content.3.title"),
          texts: [t("terms.content.3.texts.1")],
        },
        {
          title: t("terms.content.4.title"),
          texts: [t("terms.content.4.texts.1")],
        },
        {
          title: t("terms.content.5.title"),
          texts: [t("terms.content.5.texts.1")],
        },
        {
          title: t("terms.content.6.title"),
          texts: [t("terms.content.6.texts.1")],
        },
        {
          title: t("terms.content.7.title"),
          texts: [t("terms.content.7.texts.1")],
        },
        {
          title: t("terms.content.8.title"),
          texts: [t("terms.content.8.texts.1")],
        },
        {
          title: t("terms.content.9.title"),
          texts: [t("terms.content.9.texts.1")],
        },
        {
          title: t("terms.content.10.title"),
          texts: [t("terms.content.10.texts.1")],
        },
        {
          title: t("terms.content.11.title"),
          texts: [t("terms.content.11.texts.1")],
        },
        {
          title: t("terms.content.12.title"),
          texts: [t("terms.content.12.texts.1")],
        },
      ]}
    />
  );
};

export default Page;
