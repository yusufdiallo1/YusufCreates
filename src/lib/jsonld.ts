import { SITE } from "./constants";

/**
 * Shared JSON-LD node identifiers.
 *
 * The Person node on /about and the ProfessionalService node on the homepage
 * reference each other by @id, so search engines resolve them as one entity
 * rather than two unrelated things that happen to share a name.
 */
export const PERSON_ID = `${SITE.url}/about#person`;
export const SERVICE_ID = `${SITE.url}/#service`;

export const professionalServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": SERVICE_ID,
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  areaServed: [
    { "@type": "Country", name: "Saudi Arabia" },
    { "@type": "Place", name: "Gulf Cooperation Council" },
  ],
  availableLanguage: ["en", "ar"],
  address: {
    "@type": "PostalAddress",
    addressCountry: "SA",
  },
  founder: { "@id": PERSON_ID },
  provider: { "@id": PERSON_ID },
};

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Yusuf Diallo",
  url: `${SITE.url}/about`,
  jobTitle: "Software developer",
  knowsLanguage: ["en", "ar"],
  homeLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "SA",
    },
  },
  worksFor: { "@id": SERVICE_ID },
  sameAs: [
    "https://github.com/yusufdiallo1",
    "https://linkedin.com/in/yusufdiallo",
    "https://x.com/yusufcreates",
    "https://instagram.com/yusufcreates",
  ],
};
