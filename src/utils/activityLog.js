import { supabase } from "../lib/supabaseClient.js";

// Comparaison avant/après pour le journal d'activité (page Admin) : détecte
// les créations, modifications (avec détail des champs qui ont changé) et
// suppressions entre deux versions d'une même liste (profils, questions,
// questionnaires...).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function formatLogValue(v) {
  if (v === null || v === undefined || v === "") return "vide";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "vide";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}
// Compare deux versions d'un même élément champ par champ (parmi ceux listés
// dans fieldLabels) et retourne une phrase listant précisément ce qui a
// changé — ex: "Rôle : moniteur → admin · Team : —  → Team 3".
export function describeFieldChanges(before, after, fieldLabels) {
  const changes = [];
  for (const [field, label] of Object.entries(fieldLabels)) {
    if (JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field])) {
      changes.push(`${label} : ${formatLogValue(before?.[field])} → ${formatLogValue(after?.[field])}`);
    }
  }
  return changes.join(" · ");
}
export function diffEntities(oldArr, newArr, describeItem, fieldLabels) {
  const oldIds = new Set((oldArr || []).map(x => x.id));
  const newIds = new Set((newArr || []).map(x => x.id));
  const entries = [];
  for (const item of newArr || []) {
    if (!oldIds.has(item.id)) entries.push({ action: "creation", description: describeItem(item) });
    else {
      const before = (oldArr || []).find(o => o.id === item.id);
      if (JSON.stringify(before) !== JSON.stringify(item)) {
        const detail = fieldLabels ? describeFieldChanges(before, item, fieldLabels) : "";
        entries.push({ action: "modification", description: detail ? `${describeItem(item)} — ${detail}` : describeItem(item) });
      }
    }
  }
  for (const item of oldArr || []) {
    if (!newIds.has(item.id)) entries.push({ action: "suppression", description: describeItem(item) });
  }
  return entries;
}
// Écrit les entrées calculées par diffEntities (ou décrites à la main) dans
// la table activity_log. Best-effort : une erreur ici ne doit jamais faire
// échouer l'action métier elle-même, juste passer inaperçue.
export async function logActivity(entite, entries, auteur) {
  if (!entries || entries.length === 0) return;
  try {
    await supabase.from("activity_log").insert(entries.map(e => ({ auteur, entite, action: e.action, description: e.description })));
  } catch (e) { /* silencieux : le journal ne doit jamais bloquer l'action */ }
}
export const USER_LOG_FIELDS = { role: "Rôle", fonction: "Fonction", nom: "Nom", prenom: "Prénom", numeroAgent: "N° agent", team: "Team", responsableTeam: "Responsable team", langue: "Langue", superAdmin: "Admin +", formationStatut: "Statut formation" };
export const QUESTION_LOG_FIELDS = { type: "Type", categories: "Catégories", points: "Points", statut: "Statut", reference: "Référence", enonceFr: "Énoncé (FR)" };
export const QUESTIONNAIRE_LOG_FIELDS = { statut: "Statut", scoreGlobal: "Score", supprime: "Supprimé", correcteurId: "Correcteur" };
