// Constantes d'affichage du carnet de formation : postes, échelle de
// cotation, regroupements visuels par bandeau, et données pour le radar
// et les graphiques d'évolution.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

import { C } from "../theme.js";

export const POSTES_REGULATEUR = ["P11", "P12", "P21", "P22", "P23", "R1", "R2", "R5", "FOR"];
export const POSTES_DISPATCHEUR = ["11", "12", "13", "21", "22", "23", "P13", "R1", "R2", "R3", "R4", "R5", "FOR"];
// Regroupe un poste par lieu, pour l'export Excel du carnet (colonne
// "Lieu Salle/MTC" du journal quotidien) : FOR -> MTC, tout ce qui
// commence par R -> Réseau, le reste -> DTM.
export function groupePoste(poste) {
  if (!poste) return "";
  const p = String(poste).toUpperCase();
  if (p === "FOR") return "MTC";
  if (p.startsWith("R")) return "Réseau";
  return "DTM";
}

export const COTATION_SCALE = [
  { value: 1, label: "1", desc: "Très faible", descComplete: "Très faible, néant, médiocre, catastrophique", color: C.red, bg: C.redSoft },
  { value: 2, label: "2", desc: "Faible", descComplete: "Faible, insuffisant, bof", color: C.gold, bg: C.goldSoft },
  { value: 3, label: "3", desc: "Satisfaisant", descComplete: "Satisfaisant, requis pour permettre de maintenir l'élève sur une courbe d'apprentissage lui permettant en fin de formation d'arriver à l'autonomie — relatif et non absolu", color: C.teal, bg: C.tealSoft },
  { value: 4, label: "4", desc: "Bien", descComplete: "Bien, peu de remarque, au-dessus de la moyenne", color: C.green, bg: C.greenSoft },
  { value: 5, label: "5", desc: "Excellent", descComplete: "Excellent, exceptionnel, très bien", color: C.blue, bg: C.blueSoft },
];
// Regroupements purement visuels (bandeau vertical coloré) dans le carnet —
// distincts par parcours, car certaines compétences (ex. "Communication")
// n'appartiennent pas au même groupe selon qu'on est régulateur ou dispatcheur.
export const VOLET_CLUSTERS_REGULATEUR = [
  { label: "Gestion d'incident", color: C.rose, bg: C.roseSoft, categories: ["Regulation", "Safety", "Multi Tasking"] },
  { label: "Généralité", color: C.blue, bg: C.blueSoft, categories: ["Généralités", "Administratif", "Respect des règles", "IRIS/Qualité"] },
  { label: "Communication", color: C.gold, bg: C.goldSoft, categories: ["Communication", "client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
  { label: "SYREM", color: C.grey, bg: C.greySoft, categories: ["SYREM Généralité", "PEX", "Factory Link", "GCTR"] },
  { label: "Hermès", color: C.green, bg: C.greenSoft, categories: ["Hermès", "Crew Management (Hermès)"] },
];
export const VOLET_CLUSTERS_DISPATCHEUR = [
  { label: "Gestion d'incident", color: C.rose, bg: C.roseSoft, categories: ["Gestion d'incident", "Safety", "Travaux / Travaux de nuit", "Multi Tasking"] },
  { label: "Généralité", color: C.blue, bg: C.blueSoft, categories: ["Généralités", "Administratif", "Respect des règles", "IRIS/Qualité"] },
  { label: "Communication", color: C.gold, bg: C.goldSoft, categories: ["Communication", "client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
  { label: "SYREM", color: C.grey, bg: C.greySoft, categories: ["SYREM Généralité", "PEX", "Factory Link", "GCTR"] },
  { label: "Hermès", color: C.green, bg: C.greenSoft, categories: ["Hermès", "Crew Management (Hermès)"] },
];


// Regroupements du radar "Interfaces" (2 étages, comme dans la feuille Excel
// "Radar" : moyenne des jours notés par catégorie, puis moyenne des
// catégories du groupe). Les catégories citées mais absentes des volets
// actuels (Hermès, CBTC, IVL, Crew Management) n'ont simplement pas de
// données pour l'instant — l'axe reste à 0, comme dans le fichier d'origine.
export const RADAR_GROUPS = [
  { axe: "Régulation", categories: ["Regulation"] },
  { axe: "Interface Syrem", categories: ["SYREM", "PEX", "Factory Link", "GCTR"] },
  { axe: "Interface Hermes", categories: ["Hermès", "Crew Management (Hermès)", "IVL"] },
  { axe: "Safety", categories: ["Safety", "CBTC"] },
  { axe: "Multi Tasking", categories: ["Multi Tasking"] },
  { axe: "Admin/Qualité", categories: ["Généralités", "Administratif", "Respect des règles", "IRIS/Qualité"] },
  { axe: "Communication", categories: ["Communication"] },
  { axe: "Attitude", categories: ["client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
];
export const EVOLUTION_GRAPHS = [
  { titre: "Régulation-Safety-Multitasking", categories: ["Regulation", "Safety", "Multi Tasking"] },
  { titre: "Interfaces SYREM", categories: ["SYREM", "PEX", "Factory Link", "GCTR"] },
  { titre: "Admin", categories: ["Généralités", "Respect des règles", "Administratif", "IRIS/Qualité"] },
  { titre: "Comportement-Client", categories: ["Communication", "client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
];
export const EVOLUTION_COLORS = [C.navy, C.gold, C.teal, C.red];
