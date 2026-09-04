// Contenu de l'enquête de satisfaction. DONNÉES TEMPORAIRES — Sacha n'a
// pas encore fourni les vraies questions ; ceci n'est qu'un exemple
// générique, à remplacer ici une fois le vrai contenu connu. Le reste du
// code (le formulaire, le stockage des réponses) fonctionne déjà avec
// n'importe quelle liste, sans changement nécessaire ailleurs.

// Échelle de satisfaction 1-5, propre à cette enquête — distincte des
// autres échelles déjà utilisées ailleurs dans le carnet (COTATION_SCALE,
// CARPASS_COTATION_SCALE).
export const SATISFACTION_SCALE = [
  { value: 1, label: "1", desc: "Très insatisfait", descNl: "Zeer ontevreden" },
  { value: 2, label: "2", desc: "Insatisfait", descNl: "Ontevreden" },
  { value: 3, label: "3", desc: "Neutre", descNl: "Neutraal" },
  { value: 4, label: "4", desc: "Satisfait", descNl: "Tevreden" },
  { value: 5, label: "5", desc: "Très satisfait", descNl: "Zeer tevreden" },
];

// Partie 1 — questions sur la formation elle-même. Note 1-5 + commentaire
// libre pour chacune.
export const ENQUETE_FORMATION_QUESTIONS = [
  { cle: "contenu", label: "Contenu de la formation", labelNl: "Inhoud van de opleiding" },
  { cle: "rythme", label: "Rythme de la formation", labelNl: "Tempo van de opleiding" },
  { cle: "supports", label: "Supports pédagogiques (notes, documents)", labelNl: "Lesmateriaal (nota's, documenten)" },
  { cle: "preparation", label: "Préparation aux tâches réelles du métier", labelNl: "Voorbereiding op de echte taken van het beroep" },
  { cle: "ambiance", label: "Ambiance générale pendant la formation", labelNl: "Algemene sfeer tijdens de opleiding" },
];
