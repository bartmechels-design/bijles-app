"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeFlags: Record<string, string> = {
  nl: "🇳🇱",
  pap: "🇦🇼",
  es: "🇪🇸",
  en: "🇬🇧",
};

const localeColors: Record<string, { active: string; inactive: string }> = {
  nl: {
    active: "bg-orange-500 text-white shadow-orange-200",
    inactive: "text-orange-700 hover:bg-orange-50",
  },
  pap: {
    active: "bg-sky-500 text-white shadow-sky-200",
    inactive: "text-sky-700 hover:bg-sky-50",
  },
  es: {
    active: "bg-red-500 text-white shadow-red-200",
    inactive: "text-red-700 hover:bg-red-50",
  },
  en: {
    active: "bg-indigo-500 text-white shadow-indigo-200",
    inactive: "text-indigo-700 hover:bg-indigo-50",
  },
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("languageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const isOnTutorPage = pathname.startsWith('/tutor/');

  // On tutor pages, track active locale separately — no page reload needed
  const [tutorLocale, setTutorLocale] = useState(locale);

  // Sync if ChatInterface dispatches the same event (keeps both in sync)
  useEffect(() => {
    const handler = (e: CustomEvent) => setTutorLocale(e.detail);
    window.addEventListener('tutoringLocaleChange', handler as EventListener);
    return () => window.removeEventListener('tutoringLocaleChange', handler as EventListener);
  }, []);

  // Reset to URL locale when leaving tutor pages
  useEffect(() => {
    if (!isOnTutorPage) setTutorLocale(locale);
  }, [isOnTutorPage, locale]);

  const handleLocaleChange = (newLocale: string) => {
    if (isOnTutorPage) {
      // Don't reload the page — notify ChatInterface via custom event
      setTutorLocale(newLocale);
      window.dispatchEvent(new CustomEvent('tutoringLocaleChange', { detail: newLocale }));
      return;
    }
    router.replace(pathname, { locale: newLocale });
  };

  const activeLocale = isOnTutorPage ? tutorLocale : locale;

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Language switcher">
      {routing.locales.map((loc) => {
        const isActive = activeLocale === loc;
        const colors = localeColors[loc];
        return (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
              isActive
                ? `${colors.active} shadow-md`
                : `${colors.inactive} hover:scale-105`
            }`}
            aria-label={`Switch to ${t(loc)}`}
            aria-current={isActive ? "true" : undefined}
          >
            <span>{localeFlags[loc]}</span>
            <span className="hidden sm:inline">{t(loc)}</span>
          </button>
        );
      })}
    </div>
  );
}
