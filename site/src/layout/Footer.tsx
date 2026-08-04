import { Link, useLocation } from "react-router-dom";
import { defaultLocale, isLocale, type Locale } from "../i18n/locales";
import { getPagePath } from "../site";

function getActiveLocale(pathname: string): Locale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function Footer() {
  const location = useLocation();
  const locale = getActiveLocale(location.pathname);
  const isFrench = locale === "fr-fr";

  const privacyPath = getPagePath("privacy", locale);
  const legalNoticePath = getPagePath("legal-notice", locale);

  return (
    <footer className="site-footer">
      <p>© {new Date().getFullYear()} Bezot Corp. {isFrench ? "Tous droits réservés." : "All rights reserved."}</p>

      <nav aria-label={isFrench ? "Liens légaux" : "Legal links"}>
        {privacyPath && (
          <Link to={privacyPath}>
            {isFrench ? "Confidentialité" : "Privacy Policy"}
          </Link>
        )}

        {legalNoticePath && (
          <Link to={legalNoticePath}>
            {isFrench ? "Mentions légales" : "Legal Notice"}
          </Link>
        )}
      </nav>
    </footer>
  );
}