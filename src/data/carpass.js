// Structure des compétences évaluées dans CarPass SYREM (onglet du
// carnet). DONNÉES TEMPORAIRES — Sacha n'a pas encore fourni la vraie
// liste des compétences générales et sous-compétences ; ceci n'est
// qu'un exemple à 3 compétences générales x 3 sous-compétences chacune,
// à remplacer ici une fois la vraie liste connue. Le reste du code (le
// tableau, le stockage des cotations) fonctionne déjà avec n'importe
// quelle liste, sans changement nécessaire ailleurs.

import { C } from "../theme.js";

export const CARPASS_COMPETENCES = [
  {
    id: "1", titre: "Compétence générale 1",
    sousCompetences: [
      { id: "1.1", titre: "Sous-compétence 1.1" },
      { id: "1.2", titre: "Sous-compétence 1.2" },
      { id: "1.3", titre: "Sous-compétence 1.3" },
    ],
  },
  {
    id: "2", titre: "Compétence générale 2",
    sousCompetences: [
      { id: "2.1", titre: "Sous-compétence 2.1" },
      { id: "2.2", titre: "Sous-compétence 2.2" },
      { id: "2.3", titre: "Sous-compétence 2.3" },
    ],
  },
  {
    id: "3", titre: "Compétence générale 3",
    sousCompetences: [
      { id: "3.1", titre: "Sous-compétence 3.1" },
      { id: "3.2", titre: "Sous-compétence 3.2" },
      { id: "3.3", titre: "Sous-compétence 3.3" },
    ],
  },
];

// Échelle de cotation propre à CarPass — distincte de l'échelle 1-5 déjà
// utilisée ailleurs dans le carnet (COTATION_SCALE).
export const CARPASS_COTATION_SCALE = [
  { value: 0, label: "0", desc: "N'y arrive pas", descNl: "Lukt niet", color: C.red, bg: C.redSoft },
  { value: 1, label: "1", desc: "Y arrive, avec un peu d'aide", descNl: "Lukt, met wat hulp", color: C.gold, bg: C.goldSoft },
  { value: 2, label: "2", desc: "Y arrive tout seul", descNl: "Lukt zelfstandig", color: C.green, bg: C.greenSoft },
];

// Les 10 volets de la section "Commentaires fin de formation" — clé
// interne (utilisée pour le stockage) + libellé affiché dans les deux
// langues. Traductions NL à vérifier/corriger par Sacha si besoin — ce
// sont des termes assez spécifiques, ma traduction est une première
// proposition raisonnable, pas une certitude.
export const CARPASS_COMMENTAIRES_CHAMPS = [
  { cle: "multitasking", label: "Multitasking", labelNl: "Multitasking" },
  { cle: "gestionStress", label: "Gestion du stress", labelNl: "Stressbeheersing" },
  { cle: "adaptabilite", label: "Adaptabilité", labelNl: "Aanpassingsvermogen" },
  { cle: "apprentissage", label: "Facilité d'apprentissage / Compréhension", labelNl: "Leergemak / Begrip" },
  { cle: "attentifRemarques", label: "Attentif aux remarques", labelNl: "Aandachtig voor opmerkingen" },
  { cle: "proactivite", label: "Proactivité", labelNl: "Proactiviteit" },
  { cle: "travailEquipe", label: "Travail en équipe", labelNl: "Teamwerk" },
  { cle: "comportement", label: "Comportement", labelNl: "Gedrag" },
  { cle: "application", label: "Application", labelNl: "Toepassing" },
  { cle: "memorisation", label: "Mémorisation", labelNl: "Memorisatie" },
];
