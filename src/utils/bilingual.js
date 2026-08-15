// Résolution du texte selon la langue (FR/NL) pour les différents types de
// questions — avec repli automatique vers le FR (ou l'ancien format non
// bilingue) quand la traduction NL demandée est absente.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function qText(q, langue) {
  if (langue === "nl" && q.enonceNl && q.enonceNl.trim()) return q.enonceNl;
  return q.enonceFr || q.enonce || "";
}
export function qChoix(q, langue) {
  if (langue === "nl" && q.choixNl && q.choixNl.length && q.choixNl.every(c => c && c.trim())) return q.choixNl;
  return q.choixFr || q.choix || [];
}
export function itemText(item, langue) {
  if (!item) return "";
  if (langue === "nl" && item.texteNl && item.texteNl.trim()) return item.texteNl;
  return item.texteFr || item.texte || "";
}
export function paireText(p, side, langue) {
  if (!p) return "";
  const fr = side === "gauche" ? p.gaucheFr : p.droiteFr;
  const nl = side === "gauche" ? p.gaucheNl : p.droiteNl;
  const legacy = side === "gauche" ? p.gauche : p.droite;
  if (langue === "nl" && nl && nl.trim()) return nl;
  return fr || legacy || "";
}
export function arNodeText(node, langue) {
  if (!node) return "";
  if (langue === "nl" && node.texteNl && node.texteNl.trim()) return node.texteNl;
  return node.texteFr || node.texte || "";
}
