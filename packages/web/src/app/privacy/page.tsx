import { getTranslations } from "next-intl/server";

import LegalContent from "@/components/LegalContent";

const Page = async () => {
  const t = await getTranslations();

  return (
    <LegalContent
      title={t("privacy.title")}
      description={t("privacy.description")}
      date={t("privacy.date")}
      content={[
        {
          title: t("privacy.content.1.title"),
          texts: [t("privacy.content.1.texts.1")],
        },
        {
          title: t("privacy.content.2.title"),
          texts: [
            t("privacy.content.2.texts.1"),
            t("privacy.content.2.texts.2"),
          ],
        },
        {
          title: t("privacy.content.3.title"),
          texts: [
            t("privacy.content.3.texts.1"),
            t("privacy.content.3.texts.2"),
          ],
        },
        {
          title: t("privacy.content.4.title"),
          texts: [t("privacy.content.4.texts.1")],
        },
        {
          title: t("privacy.content.5.title"),
          texts: [t("privacy.content.5.texts.1")],
        },
        {
          title: t("privacy.content.6.title"),
          texts: [t("privacy.content.6.texts.1")],
        },
        {
          title: t("privacy.content.7.title"),
          texts: [t("privacy.content.7.texts.1")],
        },
        {
          title: t("privacy.content.8.title"),
          texts: [t("privacy.content.8.texts.1")],
        },
      ]}
    />
  );
};

export default Page;
