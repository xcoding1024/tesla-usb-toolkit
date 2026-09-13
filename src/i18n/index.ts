import { en } from "./en";
import { zh, type Messages } from "./zh";

export type Locale = "en" | "zh";

export const LOCALES: readonly Locale[] = ["en", "zh"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "tesla-toolkit.locale";

const catalogs: Record<Locale, Messages> = { en, zh };

let currentLocale: Locale = readStoredLocale();
const listeners = new Set<() => void>();

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh";
}

function readStoredLocale(): Locale {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_LOCALE;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function messagesOf(locale: Locale = currentLocale): Messages {
  return catalogs[locale];
}

export function subscribeLocale(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function applyDocumentLocale(locale: Locale = currentLocale): void {
  if (typeof document === "undefined") return;
  const messages = catalogs[locale];
  document.documentElement.lang = messages.app.htmlLang;
  document.title = messages.app.windowTitle;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Private mode / quota — keep the in-memory locale anyway.
  }
  applyDocumentLocale(locale);
  for (const listener of listeners) listener();
}

/** Live catalog. Callers keep reading `t.*`; values follow the current locale. */
export const t: Messages = new Proxy({} as Messages, {
  get(_target, prop: string | symbol) {
    return catalogs[currentLocale][prop as keyof Messages];
  },
});

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}

applyDocumentLocale();

export type { Messages };
