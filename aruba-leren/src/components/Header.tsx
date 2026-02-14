import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <header className="sticky top-0 z-50 border-b-2 border-amber-200 bg-white/95 shadow-md backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-extrabold transition-transform hover:scale-105"
          >
            <span className="text-2xl">🐵</span>
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent">
              {tCommon("appName")}
            </span>
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-amber-50 hover:text-amber-700"
            >
              {t("home")}
            </Link>
            <Link
              href="/privacy"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-amber-50 hover:text-amber-700"
            >
              {t("privacy")}
            </Link>
          </div>
        </div>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
