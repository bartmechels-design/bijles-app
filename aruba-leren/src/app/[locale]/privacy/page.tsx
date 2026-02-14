import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacyPolicy" });

  return {
    title: t("title"),
    description: t("introText"),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = useTranslations("privacyPolicy");

  const dataItems = [
    t("dataItems.0"),
    t("dataItems.1"),
    t("dataItems.2"),
    t("dataItems.3"),
  ];

  const notDoItems = [
    t("notDoItems.0"),
    t("notDoItems.1"),
    t("notDoItems.2"),
    t("notDoItems.3"),
  ];

  const parentControlItems = [
    t("parentControlItems.0"),
    t("parentControlItems.1"),
    t("parentControlItems.2"),
    t("parentControlItems.3"),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <article className="prose prose-lg prose-blue max-w-none">
        {/* Title */}
        <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-8 text-sm text-gray-500">{t("lastUpdated")}</p>

        {/* Introduction */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("introTitle")}
          </h2>
          <p className="leading-relaxed text-gray-700">{t("introText")}</p>
        </section>

        {/* Data Collection */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("dataCollectionTitle")}
          </h2>
          <p className="mb-4 leading-relaxed text-gray-700">
            {t("dataCollectionIntro")}
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
            {dataItems.map((item, index) => (
              <li key={index} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
          <p className="font-medium leading-relaxed text-gray-900">
            {t("dataCollectionNote")}
          </p>
        </section>

        {/* Why We Save This */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("whyTitle")}
          </h2>
          <p className="leading-relaxed text-gray-700">{t("whyText")}</p>
        </section>

        {/* What We Don't Do */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("notDoTitle")}
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700">
            {notDoItems.map((item, index) => (
              <li key={index} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* How AI Works */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("aiTitle")}
          </h2>
          <p className="leading-relaxed text-gray-700">{t("aiText")}</p>
        </section>

        {/* Parent Control */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("parentControlTitle")}
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700">
            {parentControlItems.map((item, index) => (
              <li key={index} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Consent */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("consentTitle")}
          </h2>
          <p className="leading-relaxed text-gray-700">{t("consentText")}</p>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-800">
            {t("contactTitle")}
          </h2>
          <p className="leading-relaxed text-gray-700">{t("contactText")}</p>
        </section>
      </article>
    </div>
  );
}
