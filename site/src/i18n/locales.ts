import { site } from '../../generated/site';

export const locales = site.locales;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = site.defaultLocale;

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}
