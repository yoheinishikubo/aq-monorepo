import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Can be imported from a shared config
import { locales } from "./i18n-config";

const deepmerge = <T>(obj1: T, obj2: T): T => {
  const result = { ...obj1 } as T;

  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      const val2 = obj2[key];
      const val1 = (result as any)[key];

      if (
        typeof val1 === "object" &&
        val1 !== null &&
        !Array.isArray(val1) &&
        typeof val2 === "object" &&
        val2 !== null &&
        !Array.isArray(val2)
      ) {
        (result as any)[key] = deepmerge(val1, val2);
      } else {
        (result as any)[key] = val2;
      }
    }
  }

  return result;
};

export default getRequestConfig(async () => {
  // Validate that the incoming `locale` parameter is valid
  const cookieStore = await cookies();
  const localeCode = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const locale = locales.find((l) => l.code === localeCode) || locales[0];

  const messages = (await import(`../messages/${locale.code}.json`)).default;
  const enMessages = (await import(`../messages/en.json`)).default;

  return {
    locale: locale.code,
    messages: deepmerge(enMessages, messages),
    direction: locale.direction,
  };
});
