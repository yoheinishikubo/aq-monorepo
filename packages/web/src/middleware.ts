import { NextRequest, NextResponse } from "next/server";
import { localeCodes } from "./i18n-config";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && localeCodes.includes(cookieLocale)) {
    return cookieLocale;
  }

  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  // @ts-ignore locales are readonly
  const locale = match(languages, localeCodes, "en");
  return locale;
}

export function middleware(request: NextRequest) {
  const locale = getLocale(request);
  const response = NextResponse.next();
  response.cookies.set("NEXT_LOCALE", locale);
  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next).*)",
    // Optional: only run on root (/) URL
    // '/'
  ],
};
