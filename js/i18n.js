// Finnish is the language of the markup. English lives here, keyed by the
// data-i18n / data-i18n-attr names in index.html. Finnish strings are read back
// from the DOM, so there is a single source for each language.

export const LANGUAGES = ["fi", "en"];
export const DEFAULT_LANGUAGE = "fi";
export const STORAGE_KEY = "nordic-depths:lang";

// Strings that only exist at runtime (Motion Lab readouts), in both languages.
export const RUNTIME = {
  fi: { stateOn: "Päällä", stateOff: "Pois" },
  en: { stateOn: "On", stateOff: "Off" },
};

export const EN = {
  docTitle: "Mykola Dotsenko — software developer in Turku · Nordic Depths",
  metaDescription:
    "Mykola Dotsenko builds digital products that work with Python, Django, React and TypeScript. The portfolio starts in a 2023 parallax forest and grows into a story about clear layers.",

  skip: "Skip to content",
  brandLabel: "Nordic Depths — back to top",
  navLabel: "Main navigation",
  navStory: "Story",
  navPrinciples: "Principles",
  navContact: "Contact",

  compassLabel: "Scenes",
  sceneOrigin: "Origin",
  sceneIdea: "Idea",
  sceneLayers: "Layers",
  sceneFocus: "Focus",
  sceneRhythm: "Rhythm",
  sceneCraft: "Craft",
  sceneStructure: "Structure",
  sceneOutcome: "Outcome",

  labEyebrow: "Live motion controls",
  labClose: "Close Motion Lab",
  labIntro:
    "See how the same layered idea behaves further down. Motion Lab only changes the new continuation — the original 2023 parallax stays exactly as it was.",
  labProfile: "Experience profile",
  profileSystem: "System",
  profileFull: "Full",
  profileCompact: "Compact",
  profileReduced: "Reduced",
  labIntensity: "Extension intensity",
  labTelemetry: "Live motion telemetry",
  labActiveProfile: "Active profile",
  labSystemReduce: "System reduce",
  labScene: "Current scene",
  labVelocity: "Scroll velocity",
  labReset: "Reset to system",
  labStorage: "Preferences stay on this device.",

  heroCaption: "Welcome to my portfolio",
  heroTitle: "I build digital products that work.",
  aboutTitle: "I’m Mykola Dotsenko — a software developer from Turku.",
  aboutText:
    "I design and build modern web services with Python, Django, React and TypeScript. To me, good software means a clear user experience, simple architecture and reliable delivery. I keep growing my skills and look for solutions that create real value for users and the business.",
  aboutNext: "Continue the story",
  aboutGoal: "My goal is to combine a clear user experience, strong technical execution and real business value",

  introEyebrow: "02 / From parallax to product thinking",
  introTitle1: "The same idea",
  introTitle2: "grew with me.",
  introText:
    "This forest began as a simple parallax experiment. The lesson outlived the demo: clear layers make complex things easier to understand. That same principle now shapes how I design interfaces, motion, and software systems.",
  introSignals: "Story continuity",
  introSignal1: "first experiment",
  introSignal2: "visible layers",
  introSignal3: "idea carried forward",

  xrayIndex: "03 / Layers",
  xrayKicker: "Every experience has structure",
  xrayTitle: "Start with layers.<br />Give each one a job.",
  xrayText:
    "The forest works because background, middle, and foreground each behave differently. Good product architecture follows the same idea: separate responsibilities, make relationships clear, and let every layer earn its place.",
  xrayLegend: "Depth layer speeds",
  layerFar: "Far",
  layerMiddle: "Middle",
  layerNear: "Near",

  mistIndex: "04 / Focus",
  mistKicker: "Hierarchy guides attention",
  mistTitle: "Depth is useful when it makes the next step obvious.",
  mistText:
    "The same visual depth that makes the forest readable also guides interface design: important things come forward, supporting context recedes, and the user always knows where to look next.",
  mistSignals: "Focus signals",
  mistSignal1: "clear focus",
  mistSignal2: "depth planes",
  mistSignal3: "decorative noise",

  nightIndex: "05 / Rhythm",
  nightKicker: "Interaction should follow intent",
  nightTitle: "Motion should explain change, not compete for attention.",
  nightText:
    "The user sets the pace. Native scrolling stays authoritative while motion adds context around that intent. When movement is reduced or removed, the experience still communicates the same structure and meaning.",
  nightNote:
    "If motion disappears, the experience still makes sense. Enhancement should add meaning, never carry it alone.",

  craftIndex: "06 / Craft",
  craftTitle: "The visual idea becomes an engineering discipline.",
  craft1Title: "Clear layers",
  craft1Text:
    "Each responsibility has one place. The original parallax, modern scene motion, user preferences, and semantic content stay deliberately separated.",
  craft2Title: "Adaptive by default",
  craft2Text:
    "The experience adapts to pointer type, screen size, and <code>prefers-reduced-motion</code> without changing the underlying story.",
  craft3Title: "Quality without waste",
  craft3Text:
    "Keep what creates value, remove what does not. The original artwork keeps its full look as lightweight WebP variants, while code, loading, and compositing carry the performance work.",

  systemIndex: "07 / Structure",
  systemKicker: "The craft beneath the scene",
  systemTitle: "Simple parts.<br />Clear boundaries.",
  systemText:
    "The same layered thinking becomes architecture: system signals resolve into one motion profile, small adapters handle browser behavior, and semantic HTML remains the stable center of the experience.",
  systemSignals: "Architecture constraints",
  systemSignal1: "scroll source",
  systemSignal2: "motion model",
  systemSignal3: "browser adapters",
  systemFlow: "Motion architecture flow",
  systemAdapters: "Browser adapters",
  node1Index: "01 / Signals",
  node1Title: "System + user",
  node1Text: "Media queries and locally persisted Motion Lab preferences.",
  node2Index: "02 / Pure model",
  node2Title: "Motion profile",
  node2Text: "One deterministic function clamps intensity and selects behavior.",
  node3Index: "03 / Scroll",
  node3Title: "Scroll adapter",
  node3Text: "ScrollTrigger maps native scroll to bounded transforms.",
  node4Index: "04 / Pointer",
  node4Title: "Pointer adapter",
  node4Text: "Fine pointers get one frame-coalesced depth signal.",
  node5Index: "05 / Output",
  node5Title: "Semantic DOM",
  node5Text: "The same content survives when every enhancement disappears.",

  outcomeIndex: "08 / Outcome",
  outcomeTitle: "Complex should feel simple.",
  outcomeText:
    "That is the thread through the whole page: layers create depth, hierarchy creates focus, motion creates context, and clear architecture keeps the experience dependable.",
  contactTitle: "Let’s talk",
  contactText: "Tell me about your project or team — I’m happy to talk.",
  contactMeta: "Mykola Dotsenko · Software developer · Turku, Finland",
  contactSource: "Source code",
  contactNotes: "Engineering notes",

  footerText: "Nordic Depths · From parallax experiment to product engineering story",
  footerLabel: "Footer",
  footerTop: "Back to top",
};

let finnish = null;

export function resolveLanguage({ search = "", stored = null } = {}) {
  const requested = new URLSearchParams(search).get("lang");
  if (LANGUAGES.includes(requested)) return requested;
  if (LANGUAGES.includes(stored)) return stored;
  return DEFAULT_LANGUAGE;
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

  // Captured once: a page restored from the back/forward cache may already show English.
  finnish ??= { ...captureStrings(), ...RUNTIME.fi };
  const dictionaries = { fi: finnish, en: { ...EN, ...RUNTIME.en } };
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
    if (!LANGUAGES.includes(language)) return;
    const changed = language !== current;
    current = language;
    apply(language);
    if (persist) {
      try {
        store?.setItem(STORAGE_KEY, language);
      } catch {
        // Storage is optional; the choice still applies to this page.
      }
    }
    if (changed) onChange(language);
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
