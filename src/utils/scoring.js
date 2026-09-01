// Fonctions de calcul et utilitaires génériques : notation des différents
// types de questions, statistiques par catégorie, mélange aléatoire,
// initiales d'un nom, et logique de l'arbre Action/Réaction.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function initials(prenom, nom) { return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase(); }
export function getResultReached(root, path) {
  let current = root;
  for (const actionId of (path || [])) {
    if (!current || current.type !== "evenement") return null;
    const action = (current.enfants || []).find(a => a.id === actionId);
    if (!action) return null;
    const next = (action.enfants || [])[0];
    if (!next) return null;
    current = next;
  }
  return current && current.type === "resultat" ? current : null;
}
export function walkTrail(root, path) {
  const trail = [];
  if (!root) return trail;
  trail.push(root);
  let current = root;
  for (const actionId of (path || [])) {
    if (!current || current.type !== "evenement") break;
    const action = (current.enfants || []).find(a => a.id === actionId);
    if (!action) break;
    trail.push(action);
    const next = (action.enfants || [])[0];
    if (!next) break;
    trail.push(next);
    current = next;
    if (next.type !== "evenement") break;
  }
  return trail;
}
export function countTreeResults(node) {
  if (!node) return 0;
  if (node.type === "resultat") return 1;
  return (node.enfants || []).reduce((s, c) => s + countTreeResults(c), 0);
}
export function validateActionTree(node) {
  if (!node || !node.texteFr || !node.texteFr.trim() || !node.texteNl || !node.texteNl.trim()) return false;
  if (node.type === "resultat") return typeof node.pourcentage === "number" && node.pourcentage >= 0 && node.pourcentage <= 100;
  if (node.type === "evenement") return (node.enfants || []).length > 0 && node.enfants.every(validateActionTree);
  if (node.type === "action") return (node.enfants || []).length === 1 && validateActionTree(node.enfants[0]);
  return false;
}
export function pointsPerAnswerOf(q) {
  if (typeof q.pointsParBonneReponse === "number") return q.pointsParBonneReponse;
  const n = q.type === "qcm_multi" ? (q.bonnesReponses || []).length : (q.cibles || []).length;
  return n > 0 ? q.points / n : 0;
}
export function scoreQcmMulti(q, raw) {
  const sel = Array.isArray(raw) ? raw : [];
  const good = q.bonnesReponses || [];
  const correctCount = sel.filter(i => good.includes(i)).length;
  const incorrectCount = sel.filter(i => !good.includes(i)).length;
  return Math.max(0, correctCount * pointsPerAnswerOf(q) - incorrectCount);
}
export function correctPlacementsOrdre(q, raw) {
  const items = q.items || [];
  const order = Array.isArray(raw) ? raw : [];
  return items.filter((it, i) => order[i] === it.id).length;
}
export function scoreOrdre(q, raw) {
  return correctPlacementsOrdre(q, raw) * pointsPerAnswerOf(q);
}
export function matchedCiblesCount(q, clicks) {
  const used = new Set(); let m = 0;
  (q.cibles || []).forEach(cible => {
    let idx2 = -1;
    clicks.forEach((c, i2) => { if (used.has(i2) || idx2 !== -1) return; if (Math.hypot(c.x - cible.x, c.y - cible.y) <= cible.rayon) idx2 = i2; });
    if (idx2 >= 0) { used.add(idx2); m++; }
  });
  return m;
}
export function scorePoint(q, raw) {
  const clicks = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const matched = matchedCiblesCount(q, clicks);
  const incorrectCount = clicks.length - matched;
  return Math.max(0, matched * pointsPerAnswerOf(q) - incorrectCount);
}
export function isFullyCorrect(q, raw, manualPoints, overridePoints) {
  if (overridePoints != null) return overridePoints === q.points;
  if (q.type === "qcm" || q.type === "vrai_faux") return raw === q.bonneReponse;
  if (q.type === "qcm_multi") return scoreQcmMulti(q, raw) === q.points;
  if (q.type === "point") return scorePoint(q, raw) === q.points;
  if (q.type === "legende") return manualPoints != null && manualPoints === q.points;
  if (q.type === "action_reaction") { const result = getResultReached(q.arbre, raw); return !!result && result.pourcentage === 100; }
  if (q.type === "relier") { const total = (q.paires || []).length; const n = (q.paires || []).filter((p, li) => raw && raw[li] === p.id).length; return total > 0 && n === total; }
  if (q.type === "ordre") { const total = (q.items || []).length; return total > 0 && correctPlacementsOrdre(q, raw) === total; }
  if (q.type === "ouverte" || q.type === "dessin_reseau") return !!(raw && typeof raw.points === "number" && raw.points === q.points);
  return false;
}
export function computeCategoryStats(validatedQuestionnaires, categories) {
  const stats = {};
  categories.forEach(cat => { stats[cat] = { correct: 0, total: 0 }; });
  validatedQuestionnaires.forEach(qn => {
    const counts = qn.categorieCounts || {};
    Object.entries(counts).forEach(([cat, v]) => {
      if (!stats[cat]) stats[cat] = { correct: 0, total: 0 };
      stats[cat].correct += v.correct || 0;
      stats[cat].total += v.total || 0;
    });
  });
  return stats;
}
export function computeCategoryEvolution(validatedQuestionnaires, categories) {
  const sorted = [...validatedQuestionnaires].sort((a, b) => (a.dateAttribution || "").localeCompare(b.dateAttribution || ""));
  const result = {};
  categories.forEach(cat => {
    const points = [];
    sorted.forEach(qn => {
      const v = (qn.categorieCounts || {})[cat];
      if (!v || !v.total) return;
      points.push({ label: qn.titre, date: qn.dateAttribution, score: Math.round((v.correct / v.total) * 100) });
    });
    if (points.length) result[cat] = points;
  });
  return result;
}

// Un questionnaire est "réussi" si, pour chaque catégorie concernée par ses
// questions, le score obtenu atteint le seuil configuré pour cette
// catégorie — exactement la même règle que celle déjà utilisée pour les
// questionnaires classiques (catégorie par catégorie), appliquée ici pour
// donner un verdict global unique (utilisé par les notes obligatoires : une
// note complète a un statut binaire réussi/à relire, pas un score nuancé).
export function questionnaireReussi(questionnaire, categoryConfig) {
  const scoreParCategorie = questionnaire?.scoreParCategorie;
  if (!scoreParCategorie || Object.keys(scoreParCategorie).length === 0) return null; // pas encore corrigé
  return Object.entries(scoreParCategorie).every(([cat, score]) => {
    const seuil = categoryConfig?.[cat]?.seuil ?? 60;
    return score >= seuil;
  });
}

// Pour une note obligatoire donnée, retrouve la tentative la plus récente
// de cet élève (s'il y en a une) et son statut : null = jamais commencée
// ou en cours (pas encore corrigée), true = réussie, false = échouée (à
// relire). Centralisé ici car utilisé à la fois dans l'affichage du
// carnet (lecture seule, côté staff) et dans la vue élève (interactive).
export function statutNoteObligatoire(note, questionnaires, eleveId, categoryConfig) {
  const tentatives = questionnaires
    .filter(q => q.noteId === note.id && q.eleveId === eleveId)
    .sort((a, b) => new Date(b.dateAttribution) - new Date(a.dateAttribution));
  const derniere = tentatives[0] || null;
  if (!derniere) return { statut: null, derniere: null };
  return { statut: questionnaireReussi(derniere, categoryConfig), derniere };
}

// Points attribués pour une question "légender une image" en fonction du
// nombre de repères validés corrects (via les boutons ✓/✗ en correction) —
// proportionnel au nombre total de repères, arrondi à l'entier le plus
// proche. Un tableau vide ou absent renvoie 0 plutôt que de planter.
export function computeLegendePoints(overrides, totalPoints) {
  if (!overrides || overrides.length === 0) return 0;
  const correct = overrides.filter(Boolean).length;
  return Math.round((totalPoints * correct) / overrides.length);
}
