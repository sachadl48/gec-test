// Génère un identifiant unique côté client (préfixé), pour tout ce qui est
// créé localement avant d'être enregistré (nouvelle question, nouveau
// critère, etc.).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function genId(prefix) { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
