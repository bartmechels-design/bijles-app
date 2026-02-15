import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

function SubjectsIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="6" width="16" height="20" rx="3" fill="#f59e0b" />
      <rect x="6" y="9" width="10" height="2" rx="1" fill="#fef3c7" />
      <rect x="6" y="13" width="7" height="2" rx="1" fill="#fef3c7" />
      <rect x="6" y="17" width="10" height="2" rx="1" fill="#fef3c7" />
      <rect x="16" y="10" width="16" height="20" rx="3" fill="#3b82f6" />
      <rect x="18" y="13" width="10" height="2" rx="1" fill="#dbeafe" />
      <rect x="18" y="17" width="7" height="2" rx="1" fill="#dbeafe" />
      <rect x="18" y="21" width="10" height="2" rx="1" fill="#dbeafe" />
      <rect x="10" y="14" width="16" height="20" rx="3" fill="#10b981" />
      <rect x="12" y="17" width="10" height="2" rx="1" fill="#d1fae5" />
      <rect x="12" y="21" width="7" height="2" rx="1" fill="#d1fae5" />
      <rect x="12" y="25" width="10" height="2" rx="1" fill="#d1fae5" />
      <circle cx="36" cy="36" r="10" fill="#8b5cf6" />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">6</text>
    </svg>
  );
}

function LanguagesIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <ellipse cx="24" cy="24" rx="9" ry="20" fill="none" stroke="#bae6fd" strokeWidth="1.5" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="#bae6fd" strokeWidth="1.5" />
      <line x1="7" y1="15" x2="41" y2="15" stroke="#bae6fd" strokeWidth="1" />
      <line x1="7" y1="33" x2="41" y2="33" stroke="#bae6fd" strokeWidth="1" />
    </svg>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-cyan-400 px-4 py-20 sm:py-32">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/20" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-orange-400/15" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 text-8xl">🐵</div>
          <p className="mb-3 text-xl font-bold text-sky-100">
            {t("kokoIntro")}
          </p>
          <h1 className="mb-6 text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/90 sm:text-xl">
            {t("subtitle")}
          </p>
          <Link href={`/${locale}/signup`} className="inline-block rounded-full bg-amber-400 px-10 py-4 text-lg font-bold text-gray-900 shadow-lg transition-all hover:scale-105 hover:bg-amber-300 hover:shadow-xl active:scale-95 sm:text-xl">
            {t("cta")}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-amber-50 px-4 py-16 sm:py-20">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 text-5xl">🐵</div>
            <h3 className="text-lg font-bold text-gray-900">{t("features.ai")}</h3>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4">
              <SubjectsIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("features.subjects")}</h3>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4">
              <LanguagesIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("features.languages")}</h3>
          </div>
        </div>
      </section>
    </div>
  );
}
