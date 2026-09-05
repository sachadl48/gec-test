// Ligne du temps des formations en cours (Aperçu admin) : logique de
// calcul séparée du rendu visuel, pour rester testable facilement.

export function parseDateFr(dateFr) {
  if (!dateFr) return null;
  const parts = dateFr.split("/").map(Number);
  const [d, m, y] = parts;
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// Une ligne par élève actuellement en formation (pas diplômé, pas raté),
// avec les dates de SA filière active uniquement (reg ou disp selon sa
// fonction actuelle) — pas les deux à la fois, un élève ne suit qu'une
// seule filière à un instant donné.
export function computeFormationTimelineRows(users) {
  return (users || [])
    .filter(u => u.role === "eleve" && (u.fonction === "Élève régulateur" || u.fonction === "Élève dispatcheur") && u.formationStatut !== "echouee")
    .map(u => {
      const isDisp = u.fonction === "Élève dispatcheur";
      const dateDebut = parseDateFr(isDisp ? u.carnet?.dispFormationDebut : u.carnet?.regFormationDebut);
      const dateFin = parseDateFr(isDisp ? u.carnet?.dispFormationFin : u.carnet?.regFormationFin);
      return { id: u.id, prenom: u.prenom, nom: u.nom, fonction: u.fonction, dateDebut, dateFin };
    });
}

// Position d'une barre sur l'axe J -> J+4mois, en pourcentage (0-100).
// - startsBeforeToday : la formation a déjà commencé, pas de date de
//   début à afficher, la barre part directement du bord gauche.
// - endsAfterWindow : la fin dépasse la fenêtre visible, la barre continue
//   en pointillés au-delà du bord droit plutôt que de s'arrêter net.
// Renvoie null si les dates sont absentes ou invalides (l'appelant doit
// alors afficher l'avertissement "pas de date de formation").
export function computeBarPosition(dateDebut, dateFin, today, windowEnd) {
  if (!dateDebut || !dateFin || isNaN(dateDebut) || isNaN(dateFin)) return null;
  const totalMs = windowEnd - today;
  if (totalMs <= 0) return null;
  const clamp = (v) => Math.max(0, Math.min(100, v));
  return {
    startPct: clamp(((dateDebut - today) / totalMs) * 100),
    endPct: clamp(((dateFin - today) / totalMs) * 100),
    startsBeforeToday: dateDebut <= today,
    endsAfterWindow: dateFin > windowEnd,
  };
}

// La fenêtre visible de la ligne du temps : de maintenant à +4 mois.
export function formationTimelineWindow(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getFullYear(), start.getMonth() + 4, start.getDate());
  return { start, end };
}
