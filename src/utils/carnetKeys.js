// Lecture des notes du carnet (compétences globales et sous-compétences),
// avec repli automatique vers l'ancien format positionnel, et calculs
// dérivés pour le radar et les graphiques d'évolution.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

import { RADAR_GROUPS } from "../data/carnetDisplay.js";

// Valeur d'une compétence pour un jour donné : uniquement la note directe
// posée par le moniteur sur le volet. Les sous-compétences (situationnelles)
// restent notables individuellement mais n'influencent plus cette valeur.
// Lecture d'une note, avec repli automatique vers l'ancien format (indexé
// par position) si la nouvelle clé stable (nom de la compétence) n'existe
// pas encore pour ce jour. Ça permet de migrer en douceur : les notes déjà
// enregistrées continuent de s'afficher normalement, sans opération de
// masse risquée, et toute nouvelle écriture passe par la clé stable.
export function getCompetenceGlobale(jourData, volet, vi) {
  const parNom = jourData.competencesGlobales?.[volet.titre];
  return parNom !== undefined ? parNom : jourData.competencesGlobales?.[vi];
}
export function getCritereValeur(jourData, volet, vi, ci) {
  const parNom = jourData.criteres?.[`${volet.titre}-${ci}`];
  return parNom !== undefined ? parNom : jourData.criteres?.[`${vi}-${ci}`];
}
function competenceEffectiveValue(jourData, volet, vi) {
  return getCompetenceGlobale(jourData, volet, vi) ?? null;
}
export function moyenneCategorieCarnet(jours, volets, categorieTitre) {
  const vi = volets.findIndex(v => v.titre === categorieTitre);
  if (vi === -1) return null;
  const volet = volets[vi];
  const valeurs = jours.map(j => competenceEffectiveValue(j, volet, vi)).filter(v => v != null);
  if (valeurs.length === 0) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}
export function computeRadarCarnet(jours, volets) {
  return RADAR_GROUPS.map(g => {
    const categories = g.axe === "Interface Syrem"
      ? ["SYREM Généralité", "PEX", "Factory Link", "GCTR"] : g.categories;
    const moyennes = categories.map(c => moyenneCategorieCarnet(jours, volets, c)).filter(v => v != null);
    const value = moyennes.length ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length : 0;
    return { axe: g.axe, value: Math.round(value * 10) / 10 };
  });
}
export function computeEvolutionCarnet(jours, volets, categories, offsetJour = 0) {
  return jours.map(j => {
    const point = { jour: offsetJour + j.numero };
    for (const cat of categories) {
      const vi = volets.findIndex(v => v.titre === cat);
      point[cat] = vi === -1 ? null : competenceEffectiveValue(j, volets[vi], vi);
    }
    return point;
  });
}
