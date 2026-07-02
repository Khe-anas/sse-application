type SupportedLanguage = 'fr' | 'ar' | 'en';

const FIELD_SUFFIX: Record<SupportedLanguage, 'Fr' | 'Ar' | 'En'> = {
  fr: 'Fr',
  ar: 'Ar',
  en: 'En',
};

export function normalizeLanguage(language: string | undefined): SupportedLanguage {
  if (language?.startsWith('ar')) return 'ar';
  if (language?.startsWith('en')) return 'en';
  return 'fr';
}

export function getLocalizedField(source: object | null | undefined, field: string, language: string | undefined) {
  if (!source) return '';

  const record = source as Record<string, unknown>;
  const suffix = FIELD_SUFFIX[normalizeLanguage(language)];

  return firstTextValue(
    record[`${field}${suffix}`],
    record[`${field}Fr`],
    record[field]
  );
}

function firstTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
}
