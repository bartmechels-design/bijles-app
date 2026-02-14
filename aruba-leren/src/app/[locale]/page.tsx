import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";

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
        {/* Simple warm accent */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/20" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-orange-400/15" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 text-8xl">🐵</div>
          <p className="mb-3 text-xl font-bold text-sky-100">
            Hoi, ik ben Koko!
          </p>
          <h1 className="mb-6 text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-white/90 sm:text-xl">
            {t("subtitle")}
          </p>
          <button className="rounded-full bg-amber-400 px-10 py-4 text-lg font-bold text-gray-900 shadow-lg transition-all hover:scale-105 hover:bg-amber-300 hover:shadow-xl active:scale-95 sm:text-xl">
            {t("cta")}
          </button>
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
            <div className="mb-4 text-5xl">📚</div>
            <h3 className="text-lg font-bold text-gray-900">{t("features.subjects")}</h3>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 text-5xl">🇦🇼</div>
            <h3 className="text-lg font-bold text-gray-900">{t("features.languages")}</h3>
          </div>
        </div>
      </section>
    </div>
  );
}
