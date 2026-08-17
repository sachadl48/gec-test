// Conversion entre le format des lignes Supabase (colonnes snake_case) et
// le format utilisé dans toute l'application (camelCase).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function rowToUser(row) {
  return { id: row.id, pseudo: row.pseudo, role: row.role, nom: row.nom, prenom: row.prenom, numeroAgent: row.numero_agent, fonction: row.fonction || undefined, langue: row.langue || "fr", team: row.team || "", responsableTeam: row.responsable_team || "", formationStatut: row.formation_statut || undefined, carnet: row.carnet || undefined, superAdmin: row.super_admin === true, jeuStationsMeilleurScore: row.jeu_stations_meilleur_score || 0, email: row.email || "" };
}
export function rowToQuestion(row) {
  return {
    id: row.id, categories: row.categories || [], type: row.type,
    enonceFr: row.enonce_fr || row.enonce || "", enonceNl: row.enonce_nl || "",
    points: row.points,
    pointsParBonneReponse: row.points_par_bonne_reponse ?? undefined, media: row.media || null,
    choixFr: row.choix_fr || row.choix || undefined, choixNl: row.choix_nl || undefined,
    bonneReponse: row.bonne_reponse ?? undefined, bonnesReponses: row.bonnes_reponses || undefined,
    cibles: row.cibles || undefined, marqueurs: row.marqueurs || undefined, paires: row.paires || undefined, arbre: row.arbre || undefined,
    items: row.items || undefined,
    reponseAttendue: row.reponse_attendue || undefined, reference: row.reference || "", dureeSecondes: row.duree_secondes || null,
    numero: row.numero ?? undefined, statut: row.statut || undefined, remarqueSuspension: row.remarque_suspension || undefined,
    verrouillePar: row.verrouille_par || null, verrouilleLe: row.verrouille_le || null,
  };
}
export function questionToRow(q) {
  return {
    categories: q.categories || [], type: q.type,
    enonce_fr: q.enonceFr || null, enonce_nl: q.enonceNl || null,
    points: q.points,
    points_par_bonne_reponse: q.pointsParBonneReponse ?? null, media: q.media || null,
    choix_fr: q.choixFr || null, choix_nl: q.choixNl || null,
    bonne_reponse: q.bonneReponse ?? null, bonnes_reponses: q.bonnesReponses || null,
    cibles: q.cibles || null, marqueurs: q.marqueurs || null, paires: q.paires || null, arbre: q.arbre || null,
    items: q.items || null,
    reponse_attendue: q.reponseAttendue || null, reference: q.reference || null, duree_secondes: q.dureeSecondes || null,
    numero: q.numero ?? null, statut: q.statut || null, remarque_suspension: q.remarqueSuspension || null,
  };
}
export function rowToQuestionnaire(row) {
  return {
    id: row.id, eleveId: row.eleve_id, titre: row.titre, categories: row.categories || [], mode: row.mode,
    nbQuestions: row.nb_questions, questionIds: row.question_ids || [], dateAttribution: row.date_attribution, statut: row.statut,
    reponses: row.reponses || null, scoreParCategorie: row.score_par_categorie || null, scoreGlobal: row.score_global,
    categorieCounts: row.categorie_counts || null, remarques: row.remarques || null, manualGrades: row.manual_grades || null,
    overrides: row.overrides || null, correcteurId: row.correcteur_id || null, dateValidation: row.date_validation,
    luConfirme: !!row.lu_confirme, luConfirmeDate: row.lu_confirme_date,
    questionLangues: row.question_langues || undefined, langueMode: row.langue_mode || undefined,
    supprime: !!row.supprime, justificationSuppression: row.justification_suppression || undefined,
    supprimePar: row.supprime_par || undefined, dateSuppression: row.date_suppression || undefined,
    noteId: row.note_id || undefined,
  };
}
export function questionnaireToRow(qn) {
  return {
    eleve_id: qn.eleveId, titre: qn.titre, categories: qn.categories || [], mode: qn.mode,
    nb_questions: qn.nbQuestions, question_ids: qn.questionIds || [], date_attribution: qn.dateAttribution, statut: qn.statut,
    reponses: qn.reponses ?? null, score_par_categorie: qn.scoreParCategorie ?? null, score_global: qn.scoreGlobal ?? null,
    categorie_counts: qn.categorieCounts ?? null, remarques: qn.remarques ?? null, manual_grades: qn.manualGrades ?? null,
    overrides: qn.overrides ?? null, correcteur_id: qn.correcteurId || null, date_validation: qn.dateValidation || null,
    lu_confirme: !!qn.luConfirme, lu_confirme_date: qn.luConfirmeDate || null,
    question_langues: qn.questionLangues ?? null, langue_mode: qn.langueMode ?? null,
    supprime: !!qn.supprime, justification_suppression: qn.justificationSuppression || null,
    supprime_par: qn.supprimePar || null, date_suppression: qn.dateSuppression || null,
    note_id: qn.noteId || null,
  };
}
