// Finnish is the language of the markup. English and Ukrainian live in
// js/i18n/, keyed by the data-i18n / data-i18n-attr names in index.html.
// Finnish strings are read back from the DOM, so each language has one source.
import EN from "./i18n/en.js";
import UK from "./i18n/uk.js";

export { EN, UK };

export const LANGUAGES = ["fi", "en", "uk"];
export const DEFAULT_LANGUAGE = "fi";
export const STORAGE_KEY = "nordic-depths:lang";

// "ua" is what many people type for Ukrainian; the language code is "uk".
const ALIASES = { ua: "uk" };

// Strings that only exist at runtime (Motion Lab readouts).
export const RUNTIME = {
  fi: { stateOn: "Päällä", stateOff: "Pois" },
  en: { stateOn: "On", stateOff: "Off" },
  uk: { stateOn: "Увімк.", stateOff: "Вимк." },
};

const TRANSLATIONS = { en: EN, uk: UK };

export function normalizeLanguage(value) {
  const code = String(value ?? "").toLowerCase();
  const language = ALIASES[code] ?? code;
  return LANGUAGES.includes(language) ? language : null;
}

export function resolveLanguage({ search = "", stored = null } = {}) {
  return normalizeLanguage(new URLSearchParams(search).get("lang")) ?? normalizeLanguage(stored) ?? DEFAULT_LANGUAGE;
}

function parseAttrBindings(value) {
  return value
    .split(";")
    .map((pair) => pair.split(":").map((part) => part.trim()))
    .filter(([attr, key]) => attr && key);
}

// Reads the Finnish strings out of the markup before anything is swapped.
export function captureStrings(root = document) {
  const strings = {};
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    strings[element.dataset.i18n] ??= element.innerHTML;
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    for (const [attr, key] of parseAttrBindings(element.dataset.i18nAttr)) {
      strings[key] ??= element.getAttribute(attr) ?? "";
    }
  });
  strings.docTitle = document.title;
  strings.metaDescription = document.querySelector('meta[name="description"]')?.content ?? "";
  return strings;
}

let finnish = null;

export function initI18n({ storage, onChange = () => {} } = {}) {
  const store = (() => {
    try {
      return storage ?? window.localStorage;
    } catch {
      return null;
    }
  })();
  const read = () => {
    try {
      return store?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };

  // Captured once: a page restored from the back/forward cache may already be translated.
  finnish ??= { ...captureStrings(), ...RUNTIME.fi };
  const dictionaries = { fi: finnish };
  for (const [language, strings] of Object.entries(TRANSLATIONS)) {
    dictionaries[language] = { ...strings, ...RUNTIME[language] };
  }

  const buttons = Array.from(document.querySelectorAll("[data-lang-option]"));
  const switcher = document.querySelector("[data-lang-switch]");
  let current = DEFAULT_LANGUAGE;

  const t = (key) => dictionaries[current][key] ?? dictionaries.fi[key] ?? key;

  const apply = (language) => {
    const dictionary = dictionaries[language];
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = dictionary[element.dataset.i18n];
      if (value !== undefined && element.innerHTML !== value) element.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
      for (const [attr, key] of parseAttrBindings(element.dataset.i18nAttr)) {
        if (dictionary[key] !== undefined) element.setAttribute(attr, dictionary[key]);
      }
    });
    document.title = dictionary.docTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", dictionary.metaDescription);
    document.documentElement.lang = language;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.langOption === language));
    });
  };

  const setLanguage = (language, { persist = true } = {}) => {
    const next = normalizeLanguage(language);
    if (!next) return;
    const changed = next !== current;
    current = next;
    apply(next);
    if (persist) {
      try {
        store?.setItem(STORAGE_KEY, next);
      } catch {
        // Storage is optional; the choice still applies to this page.
      }
    }
    if (changed) onChange(next);
  };

  const onClick = (event) => {
    const button = event.target.closest("[data-lang-option]");
    if (button) setLanguage(button.dataset.langOption);
  };

  const initial = resolveLanguage({ search: window.location.search, stored: read() });
  if (initial !== DEFAULT_LANGUAGE) setLanguage(initial, { persist: false });
  else apply(DEFAULT_LANGUAGE);
  document.documentElement.classList.remove("i18n-pending");

  if (switcher) switcher.hidden = false;
  switcher?.addEventListener("click", onClick);

  return {
    get language() {
      return current;
    },
    t,
    setLanguage,
    cleanup() {
      switcher?.removeEventListener("click", onClick);
    },
  };
}
