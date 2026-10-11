import type { SkinServiceLanguage } from "./skinServiceI18n";

export function documentClauseNumber(query: string) {
  const normalized = query.normalize("NFKC").trim();
  return /^\d+\.\d+$/.test(normalized) ? normalized : null;
}

export function matchesDocumentQuery(text: string, query: string, language: SkinServiceLanguage) {
  const normalized = text.normalize("NFKC").toLocaleLowerCase(language);
  return query.normalize("NFKC").trim().toLocaleLowerCase(language).split(/\s+/u)
    .every(word => normalized.includes(word));
}
