// The app's own language (screens, buttons, messages): English by default, French or Arabic.
// This is not the lessons' language, which lives on her account in the backend.
// The language is read once at start-up; changing it restarts the app, so Arabic can switch the
// whole layout to right-to-left and the font to Cairo.
import { DevSettings, I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";
import { getItem, setItem } from "./storage";
import { FR } from "./i18n/fr";
import { AR } from "./i18n/ar";

export type UiLang = "fr" | "en" | "ar";
export const UI_LANGS: { code: UiLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

const K_LANG = "rahati.uiLang";
const DICT: Record<UiLang, Record<string, string>> = { en: {}, fr: FR, ar: AR };

let current: UiLang = "en";
export const uiLang = () => current;
export const isRTL = () => current === "ar";
/** Locale for dates and numbers. Algerian Arabic keeps Western digits. */
export const locale = () => (current === "ar" ? "ar-DZ" : current === "fr" ? "fr-FR" : "en-GB");

/** Style that mirrors an arrow icon in right-to-left (a "back" chevron points right in Arabic). */
export const mirror = () => (current === "ar" ? { transform: [{ scaleX: -1 }] } : undefined);

/** Translate an English text; `{name}` placeholders are filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>) {
  const s = (current === "en" ? en : DICT[current][en]) ?? en;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}
/** "1 card" / "3 cards", in the current language. */
export const plural = (n: number, one: string, many: string) => t(n === 1 ? one : many, { n });

/** Reads the saved language and sets the layout direction. Called once before the app draws. */
export async function loadUiLang() {
  const saved = (await getItem(K_LANG)) as UiLang | null;
  current = saved && saved in DICT ? saved : "en";
  const rtl = current === "ar";
  if (Platform.OS === "web") {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = current;
    return;
  }
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL !== rtl) {
    // the phone remembers the direction for the next start; restart now so it applies
    I18nManager.forceRTL(rtl);
    await restart();
  }
}

export async function setUiLang(lang: UiLang) {
  await setItem(K_LANG, lang);
  if (Platform.OS !== "web") I18nManager.forceRTL(lang === "ar");
  await restart();
}

async function restart() {
  if (Platform.OS === "web") {
    window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload(); // development builds and Expo Go
  }
}
