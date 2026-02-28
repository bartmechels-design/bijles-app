import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pap", "nl", "es", "en"],
  defaultLocale: "nl",
});

export type Locale = (typeof routing.locales)[number];
