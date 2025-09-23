export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export const pageview = (url: string) => {
  if (typeof window !== "undefined" && GA_ID) {
    window.gtag("config", GA_ID, {
      page_path: url,
    });
  }
};
