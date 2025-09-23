export type Locale = {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  population: number;
};

export const locales: Locale[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    population: 1430,
  },
  {
    code: "zh-CN",
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    direction: "ltr",
    population: 1400,
  },
  {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "rtl",
    population: 600,
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    population: 558,
  },
  {
    code: "ms-MY",
    name: "Malay",
    nativeName: "Bahasa Melayu",
    direction: "ltr",
    population: 77,
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    population: 321,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    population: 422,
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    direction: "ltr",
    population: 258,
  },
  {
    code: "id-ID",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    direction: "ltr",
    population: 270,
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    population: 133,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    direction: "ltr",
    population: 128,
  },
  {
    code: "fa",
    name: "Farsi",
    nativeName: "فارسی",
    direction: "rtl",
    population: 110,
  },
  {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    direction: "ltr",
    population: 90,
  },
  {
    code: "kr",
    name: "Korean",
    nativeName: "한국어",
    direction: "ltr",
    population: 75,
  },
  {
    code: "uk",
    name: "Ukrainian",
    nativeName: "Українська",
    direction: "ltr",
    population: 41,
  },
  {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "繁體中文",
    direction: "ltr",
    population: 23,
  },
  {
    code: "th",
    name: "Thai",
    nativeName: "ไทย",
    direction: "ltr",
    population: 70,
  },
];

export const localeCodes = locales.map((l) => l.code);
