// Fonctions de normalisation de texte (recherche insensible aux accents),
// et génération d'identifiant de connexion / mot de passe pour un compte.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function stripAccents(str) { return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
export function normalizeText(str) { return stripAccents(str || "").toLowerCase().trim().replace(/\s+/g, ""); }
export function findCategoryMatch(name, categories) { return categories.find(c => normalizeText(c) === normalizeText(name)) || null; }
export function makePseudo(nom, prenom, users = [], excludeId = null) {
  const base = (stripAccents(nom).trim().toLowerCase().replace(/[^a-z]/g, "")) +
    (stripAccents(prenom).trim().toLowerCase().charAt(0).replace(/[^a-z]/g, ""));
  let candidate = base || "agent";
  let n = 2;
  while (users.some(u => u.id !== excludeId && u.pseudo === candidate)) { candidate = base + n; n++; }
  return candidate;
}
// Supabase Auth exige un mot de passe d'au moins 6 caractères. Le mot de
// passe réel (numéro d'agent complété par des zéros si besoin) doit être
// identique à ce qui est affiché ici, sinon le staff communique un mot de
// passe erroné à l'opérateur.
export function agentPassword(numeroAgent) {
  return numeroAgent && numeroAgent.length < 6 ? numeroAgent.padStart(6, "0") : (numeroAgent || "");
}
