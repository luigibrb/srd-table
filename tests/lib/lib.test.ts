import { describe, expect, it } from "vitest";
import { setLocale, t, tn } from "../../src/i18n";
import { en } from "../../src/i18n/en";
import { it as italian } from "../../src/i18n/it";
import { isStateFile, pairCharacterFiles } from "../../src/lib/files";
import { explainParts, fileSlug } from "../../src/lib/format";

describe("files", () => {
  it("pairs builds with their play states the CLI's way", () => {
    const pairs = pairCharacterFiles([
      { name: "aerin.json", data: 1 },
      { name: "aerin.state.json", data: 2 },
      { name: "brakka.json", data: 3 },
    ]);
    expect(pairs.map((p) => [p.build.name, p.state?.name ?? null])).toEqual([
      ["aerin.json", "aerin.state.json"],
      ["brakka.json", null],
    ]);
    expect(isStateFile("x.STATE.json")).toBe(true);
    expect(fileSlug("Aerin the Bold!", "x")).toBe("aerin-the-bold");
  });
});

describe("format", () => {
  it("explains a stat from its parts as given", () => {
    expect(
      explainParts([
        { source: "Chain Mail", value: 16 },
        { source: "Defense", value: 1 },
      ]),
    ).toBe("16 Chain Mail + 1 Defense");
  });
});

describe("i18n", () => {
  it("fills placeholders and picks plurals", () => {
    expect(t("common.level", { level: 3 })).toBe("Level 3");
    expect(tn("characters.count", 1)).toBe("1 character");
    expect(tn("characters.count", 4)).toBe("4 characters");
  });

  it("speaks Italian with the same placeholders as English", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, text] of Object.entries(en)) {
      expect(placeholders(italian[key as keyof typeof en]), key).toEqual(placeholders(text));
    }
    setLocale("it");
    try {
      expect(t("common.level", { level: 3 })).toBe("Livello 3");
      expect(tn("characters.count", 1)).toBe("1 personaggio");
      expect(tn("characters.count", 4)).toBe("4 personaggi");
    } finally {
      setLocale("en");
    }
  });

  it("has every plural key in both forms", () => {
    const keys = Object.keys(en);
    for (const k of keys.filter((k) => k.endsWith(".one"))) {
      expect(keys).toContain(k.replace(/\.one$/, ".other"));
    }
  });
});
