import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pap", "nl", "es", "en"],
  defaultLocale: "nl",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
