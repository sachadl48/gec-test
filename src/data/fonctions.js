import { C } from "../theme.js";

// Fonctions (rôles) des opérateurs en formation, équipes, et libellés
// associés.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export const FONCTIONS = ["Élève régulateur", "Régulateur", "Élève dispatcheur", "Dispatcheur"];
export const TEAMS = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6"];
export const FONCTION_LABELS = {
  "Élève régulateur": { fr: "Élève régulateur", nl: "Regulator in vorming" },
  "Régulateur": { fr: "Régulateur", nl: "Regulator" },
  "Élève dispatcheur": { fr: "Élève dispatcheur", nl: "Dispatcher in vorming" },
  "Dispatcheur": { fr: "Dispatcheur", nl: "Dispatcher" },
};
export function fonctionLabel(fonction, langue) { return FONCTION_LABELS[fonction]?.[langue === "nl" ? "nl" : "fr"] || fonction; }
export function fonctionColor(fonction) {
  if (fonction === "Régulateur") return { color: C.green, bg: C.greenSoft };
  if (fonction === "Dispatcheur") return { color: C.blue, bg: C.blueSoft };
  return { color: C.gold, bg: C.goldSoft };
}
