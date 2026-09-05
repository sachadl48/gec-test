// Liste des matières/manœuvres/actions que l'élève doit d'office avoir
// faites au moins une fois pendant sa formation. DONNÉES D'EXEMPLE,
// fournies par Sacha juste pour voir à quoi ressemble la fonctionnalité
// — à remplacer ici une fois la vraie liste connue. Le reste du code
// (les 2 onglets par jour, le tableau récapitulatif, le détail au clic)
// fonctionne déjà avec n'importe quelle liste, sans changement nécessaire
// ailleurs.
export const MATIERES_ACTIONS = [
  { cle: "position_t", label: "Position T" },
  { cle: "tag_elisabeth", label: "TAG Elisabeth" },
  { cle: "tp_37v4", label: "TP 37v4" },
];

// Pour chaque élément de la liste, retrouve toutes les occurrences parmi
// les jours donnés (numéro du jour + moniteur + date) — alimente à la
// fois la couleur de la ligne (blanc/vert) et le détail affiché au clic.
export function computeMatieresRecap(jours) {
  return MATIERES_ACTIONS.map(item => {
    const occurrences = (jours || [])
      .filter(j => j.matieresFaites?.[item.cle])
      .map(j => ({ numero: j.numero, moniteur: j.moniteurComplet || null, date: j.date || null }));
    return { ...item, count: occurrences.length, occurrences };
  });
}
