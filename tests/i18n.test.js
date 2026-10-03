import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DEFAULT_LANGUAGE, EN, LANGUAGES, RUNTIME, UK, normalizeLanguage, resolveLanguage } from "../js/i18n.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const markupKeys = new Set([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]),
  ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((match) =>
    match[1].split(";").map((pair) => pair.split(":")[1].trim()),
  ),
]);
const documentKeys = new Set(["docTitle", "metaDescription"]);
const dictionaries = { en: EN, uk: UK };

// Finnish markup of each data-i18n element (no element nests one of its own tag).
const finnishMarkup = Object.fromEntries(
  [...html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)].map((match) => [
    match[2],
    match[3],
  ]),
);
const tags = (value) => [...value.matchAll(/<\/?[a-z][a-z0-9]*/g)].map((match) => match[0]).sort();

test("Finnish is the default language", () => {
  assert.equal(DEFAULT_LANGUAGE, "fi");
  assert.equal(resolveLanguage(), "fi");
  assert.match(html, /<html lang="fi">/);
});

test("the page speaks Finnish, English and Ukrainian, and every language has a switch button", () => {
  assert.deepEqual(LANGUAGES, ["fi", "en", "uk"]);
  for (const language of LANGUAGES) {
    assert.match(html, new RegExp(`data-lang-option="${language}"`), language);
  }
});

test("the URL beats the stored choice, and unknown values are ignored", () => {
  assert.equal(resolveLanguage({ search: "?lang=en", stored: "fi" }), "en");
  assert.equal(resolveLanguage({ search: "?lang=fi", stored: "en" }), "fi");
  assert.equal(resolveLanguage({ search: "?lang=uk", stored: "en" }), "uk");
  assert.equal(resolveLanguage({ search: "", stored: "en" }), "en");
  assert.equal(resolveLanguage({ search: "", stored: "uk" }), "uk");
  assert.equal(resolveLanguage({ search: "?lang=de", stored: "sv" }), "fi");
});

test("“ua” is understood as Ukrainian, case does not matter", () => {
  assert.equal(normalizeLanguage("ua"), "uk");
  assert.equal(normalizeLanguage("UA"), "uk");
  assert.equal(normalizeLanguage("EN"), "en");
  assert.equal(normalizeLanguage("ru"), null);
  assert.equal(normalizeLanguage(undefined), null);
  assert.equal(resolveLanguage({ search: "?lang=ua" }), "uk");
});

for (const [language, dictionary] of Object.entries(dictionaries)) {
  test(`every translatable string in the markup has a ${language} version`, () => {
    const missing = [...markupKeys, ...documentKeys].filter(
      (key) => typeof dictionary[key] !== "string" || !dictionary[key].trim(),
    );
    assert.deepEqual(missing, []);
  });

  test(`the ${language} dictionary has no keys the page never uses`, () => {
    const unused = Object.keys(dictionary).filter((key) => !markupKeys.has(key) && !documentKeys.has(key));
    assert.deepEqual(unused, []);
  });

  test(`${language} strings keep the markup of the Finnish ones`, () => {
    const broken = Object.entries(finnishMarkup)
      .filter(([key, finnish]) => JSON.stringify(tags(dictionary[key] ?? "")) !== JSON.stringify(tags(finnish)))
      .map(([key]) => key);
    assert.deepEqual(broken, []);
  });
}

test("runtime strings exist in every language", () => {
  const keys = Object.keys(RUNTIME.fi).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(RUNTIME[language]).sort(), keys, language);
  }
});
