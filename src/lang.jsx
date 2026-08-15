import { createContext, useContext } from "react";
import { T } from "./data/translations.js";

// Infrastructure de langue (FR/NL) : contexte React, hook useLang(), et
// fournisseur LangProvider utilisé une fois à la racine de l'app.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

/* ---------------------------------- LANGUE / TRADUCTION ---------------------------------- */
export const LANGS = { fr: "Français", nl: "Nederlands" };
export const LangContext = createContext({ lang: "fr", t: (k) => T.fr[k] || k });
export function useLang() { return useContext(LangContext); }
export function tFor(lang, k, vars) {
  let s = (T[lang] && T[lang][k]) || T.fr[k] || k;
  if (vars) Object.entries(vars).forEach(([key, val]) => { s = s.split(`{${key}}`).join(val); });
  return s;
}
export function LangProvider({ lang, children }) {
  const t = (k, vars) => tFor(lang, k, vars);
  return <LangContext.Provider value={{ lang, t }}>{children}</LangContext.Provider>;
}
