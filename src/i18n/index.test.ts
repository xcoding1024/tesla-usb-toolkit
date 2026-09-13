import { afterEach, describe, expect, it } from "vitest";
import { en } from "./en";
import { DEFAULT_LOCALE, getLocale, interpolate, messagesOf, setLocale, t } from "./index";
import { zh } from "./zh";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

afterEach(() => {
  setLocale(DEFAULT_LOCALE);
});

describe("locale catalogs", () => {
  it("defaults to English", () => {
    expect(getLocale()).toBe("en");
    expect(t.nav.overview).toBe(en.nav.overview);
    expect(t.format.unknownBytes).toBe("Unknown");
  });

  it("switches the live catalog to Chinese", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
    expect(t.nav.overview).toBe(zh.nav.overview);
    expect(t.rules.tipSeparateLightShow).toContain("单独 U 盘");
  });

  it("keeps the same key tree in English and Chinese", () => {
    expect(leafKeys(en)).toEqual(leafKeys(zh));
    expect(messagesOf("en").app.htmlLang).toBe("en");
    expect(messagesOf("zh").app.htmlLang).toBe("zh-CN");
  });

  it("fills named placeholders", () => {
    expect(interpolate(en.overview.volumesCount, { count: 3 })).toBe("3 volume(s) connected");
    expect(interpolate(zh.overview.volumesCount, { count: 3 })).toBe("3 个卷已连接");
  });
});
