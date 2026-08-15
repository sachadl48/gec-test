import { PALETTE } from "../theme.js";

// Couleur associée à une catégorie de questions, basée sur sa position dans
// la liste des catégories (couleurs qui tournent en boucle sur la palette).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function catColor(categories, cat) { const i = categories.indexOf(cat); return PALETTE[i >= 0 ? i % PALETTE.length : 0]; }
