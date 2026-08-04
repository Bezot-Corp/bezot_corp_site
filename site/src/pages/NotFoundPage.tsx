import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { Locale } from "../i18n/locales";
import { MainLayout } from "../layout/MainLayout";
import { getNotFoundSeo } from "../site";
import { applySeo } from "../seo";

type Props = {
  locale: Locale;
};

export function NotFoundPage({ locale }: Props) {
  const isFrench = locale === "fr-fr";

  useEffect(() => {
    applySeo(getNotFoundSeo(locale));
  }, [locale]);

  return (
    <MainLayout>
      <main className="page">
        <section>
          <h1>{isFrench ? "Page introuvable" : "Page not found"}</h1>
          <p>
            {isFrench
              ? "Cette URL ne correspond a aucune page publiee."
              : "This URL does not match any published page."}
          </p>
          <p>
            <Link to={`/${locale}`}>
              {isFrench ? "Retour a l'accueil" : "Back to home"}
            </Link>
          </p>
        </section>
      </main>
    </MainLayout>
  );
}
