const APP_TIME_ZONE = 'Africa/Tunis';

export const getLocale = (language?: string) => {
  const normalized = language || document.documentElement.lang;
  if (normalized === 'ar') return 'ar-TN';
  if (normalized === 'en') return 'en-US';
  return 'fr-FR';
};

export const parseBackendDate = (value: string) => {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasTimeZone ? value : `${value}Z`;
  return new Date(normalized);
};

export const formatBackendDateTime = (value?: string, language?: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseBackendDate(value));
};

export const formatBackendShortDateTime = (value?: string, language?: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parseBackendDate(value));
};

export const formatTodayLong = (language?: string) =>
  new Intl.DateTimeFormat(getLocale(language), {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
