import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DEFAULT_LANGUAGE, EN, RUNTIME, resolveLanguage } from "../js/i18n.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const markupKeys = new Set([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]),
  ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((match) =>
    match[1].split(";").map((pair) => pair.split(":")[1].trim()),
  ),
]);

test("Finnish is the default language", () => {
  assert.equal(DEFAULT_LANGUAGE, "fi");
  assert.equal(resolveLanguage(), "fi");
  assert.match(html, /<html lang="fi">/);
});

test("the URL beats the stored choice, and unknown values are ignored", () => {
  assert.equal(resolveLanguage({ search: "?lang=en", stored: "fi" }), "en");
  assert.equal(resolveLanguage({ search: "?lang=fi", stored: "en" }), "fi");
  assert.equal(resolveLanguage({ search: "", stored: "en" }), "en");
  assert.equal(resolveLanguage({ search: "?lang=de", stored: "sv" }), "fi");
});

test("every translatable string in the markup has an English version", () => {
  const missing = [...markupKeys].filter((key) => typeof EN[key] !== "string" || !EN[key].trim());
  assert.deepEqual(missing, []);
});

test("the English dictionary has no keys the page never uses", () => {
  const documentKeys = new Set(["docTitle", "metaDescription"]);
  const unused = Object.keys(EN).filter((key) => !markupKeys.has(key) && !documentKeys.has(key));
  assert.deepEqual(unused, []);
});

test("runtime strings exist in both languages", () => {
  assert.deepEqual(Object.keys(RUNTIME.fi).sort(), Object.keys(RUNTIME.en).sort());
});
