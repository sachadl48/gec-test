import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { supabase } from "./lib/supabaseClient.js";
import * as XLSX from "xlsx";
import {
  Home, Users, HelpCircle, ClipboardList, ShieldCheck, LogOut, Plus, Trash2,
  Edit2, CheckCircle2, XCircle, Search, X, Shuffle, TrendingUp, TrendingDown,
  Lock, UserCircle2, ChevronRight, BadgeCheck, ClipboardCheck, Eye, Filter,
  RotateCcw, AlertTriangle, Loader2, PlayCircle, Upload, Music, MapPin,
  AlignLeft, ListChecks, ToggleLeft, Hash, Tag, Video, XCircle as XCircleIcon,
  Undo2, ExternalLink, FileDown, Printer, MessageSquare, Globe, CheckSquare, Square,
  Link2, Timer, BookCheck, ListOrdered, GitBranch, ArrowUpDown, ChevronUp, ChevronDown, Image as ImageIcon,
  PauseCircle, Ban, Gamepad2
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

/* ---------------------------------- TOKENS ---------------------------------- */
const C = {
  bg: "#F2F2EE", paper: "#FFFFFF", ink: "#16233F", inkSoft: "#5B6577",
  navy: "#16233F", navy2: "#1F3157", line: "#E2E1D9", gold: "#C89B3C",
  goldSoft: "#F3E7CC", teal: "#2F7A78", tealSoft: "#DCEDEB", red: "#C1443C",
  redSoft: "#F7E1DE", green: "#3E8E57", greenSoft: "#E1EFE3",
  blue: "#3B6FA0", blueSoft: "#DCE6F0",
};
const FONT_DISPLAY = "'Space Grotesk', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Inter', -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
const PALETTE = [C.teal, C.navy2, C.red, C.gold, C.inkSoft, C.green, "#7A5C9E", "#B0562A"];

const FontImport = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
    * { box-sizing: border-box; }
    ::placeholder { color: #A6ABB5; }
    input, select, textarea, button { font-family: ${FONT_BODY}; }
    @keyframes visee-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ---------------------------------- SUPABASE ---------------------------------- */
async function callEdgeFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || anonKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Une erreur est survenue.");
  return json;
}

/* ---------------------------------- MAPPING BASE DE DONNÉES ↔ APPLICATION ---------------------------------- */
function rowToUser(row) {
  return { id: row.id, pseudo: row.pseudo, role: row.role, nom: row.nom, prenom: row.prenom, numeroAgent: row.numero_agent, fonction: row.fonction || undefined, langue: row.langue || "fr", team: row.team || "", responsableTeam: row.responsable_team || "", formationStatut: row.formation_statut || undefined, carnet: row.carnet || undefined, superAdmin: row.super_admin === true, jeuStationsMeilleurScore: row.jeu_stations_meilleur_score || 0 };
}
function rowToQuestion(row) {
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
  };
}
function questionToRow(q) {
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
function rowToQuestionnaire(row) {
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
  };
}
function questionnaireToRow(qn) {
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
  };
}

/* ---------------------------------- OUTILS DIVERS ---------------------------------- */
function genId(prefix) { return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
function formatLogValue(v) {
  if (v === null || v === undefined || v === "") return "vide";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "vide";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}
// Compare deux versions d'un même élément champ par champ (parmi ceux listés
// dans fieldLabels) et retourne une phrase listant précisément ce qui a
// changé — ex: "Rôle : moniteur → admin · Team : —  → Team 3".
function describeFieldChanges(before, after, fieldLabels) {
  const changes = [];
  for (const [field, label] of Object.entries(fieldLabels)) {
    if (JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field])) {
      changes.push(`${label} : ${formatLogValue(before?.[field])} → ${formatLogValue(after?.[field])}`);
    }
  }
  return changes.join(" · ");
}
function diffEntities(oldArr, newArr, describeItem, fieldLabels) {
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
async function logActivity(entite, entries, auteur) {
  if (!entries || entries.length === 0) return;
  try {
    await supabase.from("activity_log").insert(entries.map(e => ({ auteur, entite, action: e.action, description: e.description })));
  } catch (e) { /* silencieux : le journal ne doit jamais bloquer l'action */ }
}
const USER_LOG_FIELDS = { role: "Rôle", fonction: "Fonction", nom: "Nom", prenom: "Prénom", numeroAgent: "N° agent", team: "Team", responsableTeam: "Responsable team", langue: "Langue", superAdmin: "Admin +", formationStatut: "Statut formation" };
const QUESTION_LOG_FIELDS = { type: "Type", categories: "Catégories", points: "Points", statut: "Statut", reference: "Référence", enonceFr: "Énoncé (FR)" };
const QUESTIONNAIRE_LOG_FIELDS = { statut: "Statut", scoreGlobal: "Score", supprime: "Supprimé", correcteurId: "Correcteur" };
function stripAccents(str) { return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function normalizeText(str) { return stripAccents(str || "").toLowerCase().trim().replace(/\s+/g, ""); }
function findCategoryMatch(name, categories) { return categories.find(c => normalizeText(c) === normalizeText(name)) || null; }
function qText(q, langue) {
  if (langue === "nl" && q.enonceNl && q.enonceNl.trim()) return q.enonceNl;
  return q.enonceFr || q.enonce || "";
}
function qChoix(q, langue) {
  if (langue === "nl" && q.choixNl && q.choixNl.length && q.choixNl.every(c => c && c.trim())) return q.choixNl;
  return q.choixFr || q.choix || [];
}
function itemText(item, langue) {
  if (!item) return "";
  if (langue === "nl" && item.texteNl && item.texteNl.trim()) return item.texteNl;
  return item.texteFr || item.texte || "";
}
function makePseudo(nom, prenom, users = [], excludeId = null) {
  const base = (stripAccents(nom).trim().toLowerCase().replace(/[^a-z]/g, "")) +
    (stripAccents(prenom).trim().toLowerCase().charAt(0).replace(/[^a-z]/g, ""));
  let candidate = base || "agent";
  let n = 2;
  while (users.some(u => u.id !== excludeId && u.pseudo === candidate)) { candidate = base + n; n++; }
  return candidate;
}
function catColor(categories, cat) { const i = categories.indexOf(cat); return PALETTE[i >= 0 ? i % PALETTE.length : 0]; }
// Supabase Auth exige un mot de passe d'au moins 6 caractères. Le mot de
// passe réel (numéro d'agent complété par des zéros si besoin) doit être
// identique à ce qui est affiché ici, sinon le staff communique un mot de
// passe erroné à l'opérateur.
function agentPassword(numeroAgent) {
  return numeroAgent && numeroAgent.length < 6 ? numeroAgent.padStart(6, "0") : (numeroAgent || "");
}

/* ---------------------------------- LANGUE / TRADUCTION ---------------------------------- */
const LANGS = { fr: "Français", nl: "Nederlands" };
const T = {
  fr: {
    charger_plus_btn: "Charger {n} de plus",
    jeu_stations_intro: "Associez le bon numéro de station à son nom, dans les deux sens. Choisissez un mode pour commencer.",
    jeu_stations_titre: "Jeu des stations",
    journal_activite_sub: "{n} action(s) enregistrée(s) (créations, modifications, suppressions) sur le site.",
    journal_activite_titre: "Journal d'activité",
    journal_vide_body: "Le journal se remplira au fur et à mesure des actions sur le site.",
    journal_vide_titre: "Aucune activité",
    log_action: "Action",
    log_auteur: "Auteur",
    log_creation: "Création",
    log_date: "Date",
    log_description: "Détail",
    log_entite: "Élément",
    log_modification: "Modification",
    log_suppression: "Suppression",
    meilleur_score_badge: "Record : {n}",
    mode_chrono_desc: "{n} secondes pour répondre juste le plus de fois possible.",
    mode_chrono_titre: "Mode chrono",
    mode_libre_desc: "Aucune limite de temps, entraînez-vous à votre rythme.",
    mode_libre_titre: "Mode libre",
    nouveau_record_badge: "Nouveau record !",
    question_name_to_num: "Quel est le numéro de cette station ?",
    question_num_to_name: "Quelle est cette station ?",
    record_dtm_label: "Record DTM :",
    record_personnel_label: "Record personnel :",
    rejouer_btn: "Rejouer",
    reset_btn: "Réinitialiser",
    reset_carnets_confirm_msg: "{n} carnet(s) de formation seront définitivement vidés (jours, notes, commentaires). Cette action est irréversible.",
    reset_carnets_disp_titre: "Réinitialiser les carnets Élève dispatcheur",
    reset_carnets_msg: "{n} profil(s) ont un carnet de formation actuellement rempli.",
    reset_carnets_reg_titre: "Réinitialiser les carnets Élève régulateur",
    reset_questionnaires_confirm_msg: "{n} questionnaire(s) seront définitivement supprimés (attribués, en cours et validés). Cette action est irréversible.",
    reset_questionnaires_msg: "{n} questionnaire(s) actuellement dans l'historique.",
    reset_questionnaires_titre: "Réinitialiser l'historique des questionnaires",
    resultats_titre: "Résultats",
    score_label: "Score :",
    terminer_btn: "Terminer",
    zone_dangereuse_sub: "Actions irréversibles — à utiliser en connaissance de cause.",
    zone_dangereuse_carnet_note: "La réinitialisation d'un carnet se fait maintenant directement depuis le carnet de l'élève concerné (bouton visible en haut de chaque onglet, réservé aux Admin +).",
    reset_onglet_btn: "Réinitialiser cet onglet", confirm_reset_onglet_msg: "Le carnet {fonction} de cet élève sera entièrement vidé (tous les jours, notes et commentaires). Cette action est irréversible.",
    zone_dangereuse_titre: "Zone dangereuse",
    aide_cotation_btn: "Aide cotation", aide_cotation_titre: "Comment noter ?",
    carnet_graphiques_apparaitront: "Ce graphique se remplira au fur et à mesure des journées de formation notées.",
    carnet_radar_titre: "Vue d'ensemble par compétence",
    commentaire_humain_label: "Commentaire sur l'humain", commentaire_humain_placeholder: "Attitude, motivation, comportement, relationnel...",
    commentaire_technicite_label: "Commentaire sur la technicité", commentaire_technicite_placeholder: "Maîtrise technique, incidents rencontrés...",
    exporter_btn: "Exporter", note_calculee_label: "Calculée : {v}/5", poste_label: "Poste :",
    previsualiser_titre: "Aperçu de la question",
    resume_semaine_label: "Résumé de la semaine", resume_semaine_placeholder: "Résumé de la semaine et objectifs de la semaine suivante, à partager avec le candidat...",
    incidents_rencontres_label: "Incident(s) rencontré(s)", incidents_rencontres_placeholder: "Incidents survenus durant la journée...",
    annuler_jour_btn: "Annulé", reouvrir_jour_btn: "Réouvrir jour",
    confirm_annuler_jour_msg: "Le jour {n} sera remis à zéro (date, moniteur, poste, commentaires et notes effacés). Cette action est irréversible.",
    sous_onglet_graphiques: "Graphiques d'évolution des compétences", sous_onglet_jours: "Jours",
    volet_criteres_situationnels_note: "Critères ci-dessous : à noter uniquement si une situation spécifique s'est présentée aujourd'hui.",
    volet_notes_count: "{n}/{total} noté(s)",
    login_title: "G.E.C.", login_subtitle: "Gestion des évaluations continues des opérateurs du DTM",
    login_id: "Identifiant", login_pwd: "Mot de passe", login_btn: "Se connecter",
    login_error: "Identifiant ou mot de passe incorrect.", login_demo: "Comptes de démonstration",
    logout: "Déconnexion", nav_overview: "Aperçu", nav_profiles: "Profils opérateurs", nav_carnets: "Formations", nav_questions: "Banque de questions",
    carnets_titre: "Formations", carnets_sub: "Opérateurs en formation — élèves régulateurs et élèves dispatcheurs.",
    aucun_carnet_titre: "Aucun élève en formation", aucun_carnet_body: "Aucun profil élève régulateur ou élève dispatcheur ne correspond à cette recherche.",
    formation_en_cours_titre: "Formation en cours", formation_reussies_titre: "Formations réussies", formation_ratees_titre: "Formations ratées",
    valider_reussite_title: "Valider la réussite", valider_reussite_btn: "Valider la réussite",
    valider_reussite_msg: "{nom} passera automatiquement au rôle « {fonction} ». Cette action est réversible en modifiant le profil manuellement.",
    mettre_fin_formation_title: "Mettre fin à la formation", mettre_fin_formation_btn: "Mettre fin à la formation",
    mettre_fin_formation_msg: "{nom} sera déplacé(e) dans « Formations ratées ». Son profil n'est pas supprimé.",
    debuter_formation_dp_btn: "Débuter formation DP", debuter_formation_dp_msg: "{nom} passera au rôle « Élève dispatcheur » et réapparaîtra dans « Formation en cours ».",
    carnet_duree_regulateur: "35 jours avec moniteur + 10 jours en solo", carnet_duree_dispatcheur: "35 jours avec moniteur",
    jour_label: "Jour", carnet_jour_titre: "Jour {n}",
    carnet_criteres_apercu_note: "Aperçu de la mise en page — la liste de critères réelle et son enregistrement seront ajoutés une fois le carnet papier finalisé.",
    critere_acquis: "Acquis", critere_a_revoir: "À revoir", critere_non_evalue: "Non évalué",
    commencer_jour_btn: "Commencer", fin_journee_btn: "Fin de journée", moniteur_label: "Moniteur :",
    carnet_pas_commence_note: "Cliquez sur « Commencer » pour démarrer cette journée de formation.",
    examen_35_label: "Examen 35e jour réussi",
    confirm_fin_journee_msg: "Le jour {n} sera clôturé et ne pourra plus être modifié. Le jour suivant sera débloqué.",
    carnet_personnel_sous_titre: "Carnet de formation", carnet_personnel_bientot_titre: "Bientôt disponible",
    carnet_personnel_bientot_body: "Le carnet de formation détaillé (suivi jour par jour par les moniteurs) arrive prochainement sur cette page.",
    voir_carnet_btn: "Voir carnet", carnet_onglet_modifiable: "Modifiable", carnet_onglet_lecture_seule: "Lecture seule",
    nav_questionnaires: "Questionnaires", nav_accounts: "Comptes moniteurs", nav_admin: "Administration", nav_staff: "Espace moniteur",
    nav_admin_page: "Admin", admin_page_sub: "Réglages et outils réservés.",
    admin_page_bientot_titre: "Bientôt disponible", admin_page_bientot_body: "Cette page est prête à accueillir de futurs réglages et outils réservés à l'administration.",
    admin_plus_label: "Admin + (accès à la page Admin réservée)",
    student_badge: "Élève", questionnaires_done: "Questionnaires réalisés",
    agent_number: "N° agent", no_strength_yet: "Aucun point fort marqué pour l'instant.", no_weakness_yet: "Aucun point faible marqué pour l'instant.",
    my_questionnaires_intro: "Mes questionnaires",
    strengths_weaknesses: "Points forts & points faibles", strengths: "Points forts", weaknesses: "Points faibles",
    no_results_title: "Pas encore de résultats", no_results_body: "Vos points forts et faibles s'afficheront après validation d'un premier questionnaire.",
    my_questionnaires: "Mes questionnaires", no_qn_title: "Aucun questionnaire", no_qn_body: "Votre moniteur ne vous a pas encore attribué de questionnaire.",
    start: "Commencer", status_validated: "Validé", status_pending: "À valider", status_progress: "En cours",
    continue_later: "Continuer plus tard", previous: "Précédent", next: "Suivant", submit_answers: "Envoyer mes réponses",
    points_short: "pt", question_word: "question", answered_word: "répondue", select_count: "sélectionné",
    write_answer_placeholder: "Rédigez votre réponse...", click_on: "Cliquez sur", locations: "emplacement(s)", reset: "Réinitialiser",
    cancel: "Annuler", save: "Enregistrer", close: "Fermer", add: "Ajouter", delete: "Supprimer", edit: "Modifier",
    export_pdf: "Exporter en PDF", role_eleve: "Élève", role_moniteur: "Moniteur", role_admin: "Admin",
    erreur_enregistrement: "Erreur lors de l'enregistrement.", erreur_suppression: "Erreur lors de la suppression.",
    analyse_titre: "Analyse", ma_correction_titre: "Ma correction", consultation_titre: "Consultation",
    qn_deja_valide: "Questionnaire déjà validé", qn_deja_valide_par: "Questionnaire déjà validé par {nom}", qn_en_attente_validation: "En attente de validation",
    reponse_eleve: "Réponse de l'élève : ", sans_reponse: "Sans réponse", sans_reponse_italic: "Sans réponse", attendu_parens: "(attendu)", bonne_reponse_colon: "Bonne réponse : ",
    comparaison_aide_note: "La comparaison ci-dessus n'est qu'une aide (orthographe stricte) — c'est vous qui attribuez la note.",
    points_attribues: "Points attribués", zones_vertes_cibles: "Zones vertes = cibles attendues · points rouges = clics de l'élève",
    attendu_deux_points: "(attendu : {v})", attendu_place: "(attendu à cette place : {v})", parcours_inacheve: "Parcours inachevé — 0 point.",
    ouverte_attendu: "Attendu : ", reference_colon: "Référence : ",
    modifier_note_auto: "Modifier cette note automatique", nouvelle_note: "Nouvelle note", note_auto_parens: "(note automatique : {v})",
    justification_placeholder: "Justification obligatoire de la modification...", justification_requise: "Justification requise pour pouvoir valider le questionnaire.",
    note_modifiee_manuellement: "Note modifiée manuellement ({points}/{total})",
    remarque_label: "Remarque", remarque_placeholder: "Ajouter une remarque sur cette question...",
    correction_lue: "Correction lue", fermer_sans_confirmer: "Fermer sans confirmer", pris_connaissance_correction: "J'ai pris connaissance de cette correction",
    valider_questionnaire: "Valider le questionnaire", pt_short: "pt",
    apercu_title: "Aperçu général", stat_eleves_suivis: "Élèves suivis", stat_questions_banque: "Questions en banque",
    stat_qn_attribues: "Questionnaires attribués", stat_a_valider: "À valider",
    reussite_globale_titre: "Réussite globale par catégorie", reussite_globale_sub: "Toutes catégories, tous élèves, sur l'ensemble des questionnaires validés.",
    pas_de_donnees_titre: "Pas encore de données", pas_de_donnees_body: "Ce graphique se remplira au fur et à mesure des validations de questionnaires.",
    qn_attente_titre: "Questionnaires en attente de validation", rien_a_valider_titre: "Rien à valider", rien_a_valider_body: "Tous les questionnaires terminés ont été traités.",
    ajouter_eleve: "Ajouter un opérateur", rechercher_eleve: "Rechercher un élève...",
    col_eleve: "Opérateur", col_fonction: "Fonction", col_team: "Team", col_langue: "Langue", col_identifiant: "Identifiant", col_questionnaires: "Questionnaires",
    aucun_eleve_titre: "Aucun élève trouvé", aucun_eleve_body: "Essayez une autre recherche ou ajoutez un profil.",
    supprimer_profil_titre: "Supprimer ce profil ?", supprimer_profil_msg: "Le profil de {nom} et son historique de questionnaires seront définitivement supprimés.",
    modifier_profil: "Modifier le profil", prenom_label: "Prénom", nom_label: "Nom", numero_agent_label: "Numéro d'agent",
    fonction_label: "Fonction", role_linguistique_label: "Rôle linguistique", role_linguistique_hint: "Détermine la langue d'affichage de l'application pour ce profil.",
    team_hint_admin: "L'appartenance à une team ne peut être modifiée que par un administrateur.", team_hint_readonly: "Seul un administrateur peut modifier ce champ.",
    team_aucune: "Aucune", identifiant_connexion: "Identifiant de connexion", mot_de_passe_label: "Mot de passe", genere_auto: "(généré automatiquement)",
    retour_profils: "Retour aux profils", qn_valides_label: "Questionnaires validés", en_attente_encours: "En attente / en cours",
    points_forts_faibles_global: "Points forts & points faibles (global)", graphique_apres_validation: "Ce graphique s'affichera après la validation d'un premier questionnaire.",
    evolution_categorie_titre: "Évolution par catégorie", evolution_categorie_note: "Une catégorie n'apparaît ici que si au moins une question de cette catégorie a été posée à l'élève.",
    graphiques_apparaitront: "Ces graphiques apparaîtront au fur et à mesure des questionnaires validés.",
    fiche_eleve: "Fiche élève", genere_le: "Généré le", qn_repondus_valides: "Questionnaires répondus (validés)",
    points_forts_faibles_vue_globale: "Points forts & points faibles (vue globale)", pas_encore_qn_valide: "Pas encore de questionnaire validé.",
    taux_reussite_par_categorie: "Taux de réussite par catégorie", categorie_col: "Catégorie", reussite_moyenne_col: "Réussite moyenne",
    pas_assez_donnees: "Pas encore assez de données.",
    evolution_note_pdf: "Une catégorie n'apparaît que si au moins une question de cette catégorie a été posée à l'élève. Chaque point correspond à un questionnaire validé, dans l'ordre chronologique.",
    toutes_categories: "Toutes", telecharger_modele: "Télécharger le modèle", importer_excel: "Importer depuis Excel", ajouter_question: "Ajouter une question",
    rechercher_question: "Rechercher par mot-clé ou par numéro (#)...",
    media_image: "Image", media_video: "Vidéo", media_audio: "Audio", media_jointe: "jointe",
    element_reponse_attendu: "Élément de réponse attendu : ", zones_cibles: "{n} zone(s) cible définie(s) sur l'image jointe.",
    points_legender: "{n} point(s) à légender sur l'image jointe.", paires_relier: "{n} paire(s) à relier.",
    scenario_choix: "Scénario à choix multiples ({n} fin(s) possible(s)).", actions_ordre: "{n} action(s) à remettre dans l'ordre : ",
    reference_label: "Référence : ", posed_correct_title: "Nombre de fois posée / nombre de bonnes réponses (questionnaires validés)",
    aucune_question_titre: "Aucune question", aucune_question_body: "Cette catégorie ne contient pas encore de question.",
    supprimer_question_titre: "Supprimer cette question ?", supprimer_question_msg: "Cette question sera définitivement supprimée de la banque de questions.",
    questions_selectionnees: "{n} question(s) sélectionnée(s)", transferer_btn: "Transférer", supprimer_btn: "Supprimer", annuler_selection: "Annuler la sélection",
    transferer_titre: "Transférer {n} question(s)", categorie_cible_label: "Catégorie cible", choisir_categorie: "Choisir une catégorie...",
    transferer_hint: "Les questions sélectionnées seront déplacées vers cette catégorie (elle remplacera leur(s) catégorie(s) actuelle(s)).",
    supprimer_questions_titre: "Supprimer ces questions ?", supprimer_questions_msg: "{n} question(s) seront définitivement supprimées de la banque de questions.",
    renommer_categorie: "Renommer la catégorie",
    caractere_interdit_titre: "Caractère non autorisé", caractere_interdit_msg: "Le caractère « / » n'est pas autorisé dans le nom d'une catégorie.",
    remarque_suspension_label: "Remarque (visible uniquement par le staff)", remarque_suspension_hint: "Utile pour se rappeler pourquoi cette question est en suspens.",
    remarque_suspension_placeholder: "Ex : en attente de confirmation de la bonne réponse avec le service X...",
    mettre_en_suspens_btn: "Mettre en suspens", mettre_en_suspens_title: "Enregistrer telle quelle sans validation, pour la reprendre plus tard",
    suspens_popup_intro: "Cette question sera enregistrée telle quelle, sans validation, pour être reprise plus tard.",
    categories_titre: "Catégories", col_categorie: "Catégorie", col_seuil_reussite: "Seuil de réussite", col_concerne: "Concerne",
    confirmer: "Confirmer", enregistre: "Enregistré", nouvelle_categorie_placeholder: "Nouvelle catégorie...", pct_reussite: "% réussite",
    supprimer_categorie_titre: "Supprimer cette catégorie ?", supprimer_categorie_msg: "La catégorie « {cat} » sera définitivement supprimée.",
    suppression_impossible_titre: "Suppression impossible", suppression_impossible_msg: "Impossible de supprimer « {cat} » : des questions y sont encore rattachées. Retirez-la de ces questions avant de supprimer la catégorie.",
    categorie_existante_titre: "Catégorie déjà existante", categorie_existante_msg: "Une catégorie très proche existe déjà : « {cat} ». Utilisez-la directement plutôt que d'en créer une nouvelle, pour éviter les doublons.",
    attribuer_qn: "Attribuer un questionnaire", analyser_valider: "Analyser & valider",
    eleve_concerne: "Élève concerné", titre_qn_label: "Titre du questionnaire", titre_qn_hint: "Laissé vide, il prendra la forme « Questionnaire du [date] à [heure] ».",
    titre_qn_placeholder: "ex. Contrôle mensuel", langue_qn_label: "Langue du questionnaire", langue_qn_hint: "Détermine dans quelle langue l'élève verra l'énoncé et les réponses.",
    langue_evalue: "Langue de l'évalué", langue_inverse_evalue: "Langue inverse de l'évalué", langue_5050: "50/50 (une question sur deux dans chaque langue)",
    selection_categories_label: "Sélection des catégories", categories_role_hint: "Catégories concernant le rôle « {role} » uniquement.",
    mode_aleatoire: "100% aléatoire (toutes catégories du rôle)", mode_cible: "Catégories ciblées", aucune_categorie_role: "Aucune catégorie n'est configurée pour le rôle « {role} ».",
    repetitions_label: "Répétitions", deja_attribuees_hint: "{n} question(s) déjà attribuée(s) à cet élève.", ne_pas_reattribuer: "Ne pas réattribuer des questions déjà posées à cet élève",
    nb_questions_label: "Nombre de questions ({n} disponibles)", generer_apercu: "Générer un aperçu aléatoire", attribuer_eleve: "Attribuer à l'élève",
    apercu_tirage_titre: "Aperçu du tirage", aucun_apercu_titre: "Aucun aperçu généré", aucun_apercu_body: "Cliquez sur « Générer un aperçu aléatoire » pour piocher les questions dans les catégories choisies.",
    qn_attribue_msg: "« {titre} » a bien été attribué à {nom}.",
    nav_ma_team: "Ma team", ma_team_titre: "Ma team — {team}", stat_operateurs: "Opérateurs", exporter_team: "Exporter la team",
    resultats_globaux_categorie: "Résultats globaux par catégorie", pas_encore_resultats_team: "Ce graphique s'affichera après la validation d'un premier questionnaire dans la team.",
    operateurs_team_titre: "Opérateurs de la team", aucun_operateur_titre: "Aucun opérateur", aucun_operateur_body: "Aucun profil n'est encore rattaché à cette team.",
    qn_valides_team_titre: "Questionnaires validés de la team", aucun_qn_valide_team_titre: "Aucun questionnaire validé", aucun_qn_valide_team_body: "Les questionnaires corrigés des opérateurs de cette team apparaîtront ici.",
    voir_btn: "Voir",
    exporter_selection: "Exporter la sélection ({n})", tous_les_operateurs: "Tous les opérateurs",
    a_analyser_valider: "À analyser & valider", rien_en_attente_titre: "Rien en attente", rien_en_attente_body: "Aucun questionnaire terminé n'attend de validation.",
    analyser_btn: "Analyser", historique_titre: "Historique", aucun_resultat_titre: "Aucun résultat", aucun_resultat_body: "Aucun questionnaire ne correspond à ce filtre.",
    corrige_par: " · corrigé par ", attribue_le: "attribué le", tous_les_eleves: "Tous les élèves",
    comptes_titre: "Comptes moniteurs & administrateurs", ajouter_compte: "Ajouter un compte", col_nom: "Nom", col_role: "Rôle",
    supprimer_compte_titre: "Supprimer ce compte ?", supprimer_compte_msg: "Le compte de {nom} sera définitivement supprimé.",
    modifier_compte: "Modifier le compte", administrateur_option: "Administrateur", responsable_team_label: "Responsable de team",
    responsable_team_hint: "Si renseigné, un onglet « Ma team » apparaîtra pour ce compte avec les résultats de cette team.",
    modifier_question: "Modifier la question", categories_field_label: "Catégories (une ou plusieurs)", type_question_label: "Type de question",
    enonce_question_label: "Énoncé de la question", cotation_points_label: "Cotation (points)",
    points_bonne_reponse_label: "Points par bonne réponse attendue",
    points_bonne_reponse_hint_ordre: "Chaque action correctement placée rapporte ce nombre de points.",
    points_bonne_reponse_hint_autre: "Chaque bonne réponse cochée / cible trouvée rapporte ce nombre de points, chaque erreur retire 1 point (jamais en dessous de 0).",
    total_question_prefix: "Total de la question : ", total_question_points: " points (", action_word: "action", bonne_reponse_attendue_word: "bonne réponse attendue",
    ajoutez_dabord_elements: "Ajoutez d'abord les éléments ci-dessous.",
    minuteur_label: "Minuteur (facultatif)", minuteur_hint: "Temps laissé à l'élève pour répondre à cette question précise pendant l'examen.",
    activer_minuteur: "Activer un minuteur pour cette question", min_short: "min", sec_short: "sec",
    image_obligatoire_label: "Image (obligatoire)", image_facultatif_label: "Image, audio ou vidéo (facultatif)", image_obligatoire_hint: "Une image est obligatoire pour ce type de question.",
    reponses_qcm_label: "Réponses — Français / Nederlands (sélectionner la bonne réponse)", reponses_qcm_multi_label: "Réponses — Français / Nederlands (cocher toutes les bonnes réponses)",
    ajouter_reponse: "Ajouter une réponse", element_reponse_ouverte_label: "Élément de réponse attendu (facultatif, visible par le moniteur uniquement)",
    zones_cible_label: "Zone(s) cible ({n})", zones_cible_hint: "Cliquez sur l'image pour ajouter un point à trouver. Cliquez sur un repère pour le supprimer.",
    point_word: "Point", ajoutez_image_dabord: "Ajoutez d'abord une image ci-dessus.",
    paires_relier_label: "Paires à relier ({n})", paires_relier_hint: "L'élève devra relier chaque élément de gauche à son correspondant de droite (l'ordre de droite sera mélangé pendant l'examen).",
    element_gauche_placeholder: "Élément gauche", element_droite_placeholder: "Élément droite (correspondant)", ajouter_paire: "Ajouter une paire",
    actions_ordonner_label: "Actions à ordonner — Français / Nederlands ({n})",
    actions_ordonner_hint: "Entrez les actions dans le BON ordre (celui-ci) — l'élève les recevra mélangées et devra les remettre dans cet ordre à l'aide de flèches. Ajoutez-en autant que nécessaire.",
    ajouter_action: "Ajouter une action",
    points_legender_label: "Points à légender ({n})", points_legender_hint: "Cliquez sur l'image pour placer un point numéroté, puis indiquez la réponse attendue pour chacun (utilisée comme aide lors de la correction manuelle). Cliquez sur un repère pour le supprimer.",
    reponse_attendue_point_placeholder: "Réponse attendue pour ce point",
    reference_label_field: "Référence (visible uniquement en correction et en lecture seule)", reference_placeholder: "ex. Article 4.2 du règlement interne",
    exam_intro_subtitle: "Petites explications avant de commencer, voici comment ça fonctionne. Merci de tout lire attentivement et de cocher chaque case avant de démarrer.",
    types_exercices_titre: "Types d'exercices présents", ack_types: "J'ai bien lu et compris les types de questions présents dans ce questionnaire.",
    penalty_warning: "Attention : dans les questions QCM à réponses multiples et Cliquer & pointer, chaque erreur (mauvaise case cochée ou mauvais clic) retire des points — cochez ou cliquez uniquement ce dont vous êtes sûr.",
    ack_penalty: "J'ai bien compris qu'une erreur peut me faire perdre des points sur ces questions.",
    nav_locked_text: "Vous pouvez revenir en arrière sur les questions déjà répondues, sauf celles avec un minuteur ⏱",
    nav_locked_ar: "et les questions « Action / Réaction »", nav_locked_suffix: "— une fois quittées, elles sont définitivement verrouillées",
    nav_locked_ar_suffix: "(et pour ces dernières, aucun retour en arrière n'est possible non plus sur les choix faits à l'intérieur du scénario)",
    nav_free_text: "Vous pouvez naviguer librement et revenir en arrière sur les questions déjà répondues avant d'envoyer vos réponses.",
    ack_nav: "J'ai bien compris comment je peux naviguer entre les questions.",
    numero_info_text: "Chaque question affiche son numéro (ex. Question #12). En cas de problème avec une question (énoncé peu clair, erreur suspectée, image manquante...), notez ce numéro et signalez-le à votre moniteur — ça permet de la retrouver immédiatement.",
    ack_report: "J'ai bien compris qu'il faut noter le numéro de la question en cas de problème.",
    retour_btn: "Retour", commencer_qn: "Commencer le questionnaire",
    confirm_envoi_titre: "Envoyer vos réponses ?", confirm_envoi_msg: "C'est la dernière question. Une fois envoyées, vos réponses ne pourront plus être modifiées.",
  },
  nl: {
    charger_plus_btn: "{n} meer laden",
    jeu_stations_intro: "Koppel het juiste stationsnummer aan zijn naam, in beide richtingen. Kies een modus om te beginnen.",
    jeu_stations_titre: "Stationsspel",
    journal_activite_sub: "{n} actie(s) geregistreerd (aanmaken, wijzigen, verwijderen) op de site.",
    journal_activite_titre: "Activiteitenlog",
    journal_vide_body: "Het logboek vult zich naarmate er acties op de site plaatsvinden.",
    journal_vide_titre: "Geen activiteit",
    log_action: "Actie",
    log_auteur: "Auteur",
    log_creation: "Aangemaakt",
    log_date: "Datum",
    log_description: "Detail",
    log_entite: "Element",
    log_modification: "Gewijzigd",
    log_suppression: "Verwijderd",
    meilleur_score_badge: "Record: {n}",
    mode_chrono_desc: "{n} seconden om zo vaak mogelijk juist te antwoorden.",
    mode_chrono_titre: "Chronomodus",
    mode_libre_desc: "Geen tijdslimiet, oefen op je eigen tempo.",
    mode_libre_titre: "Vrije modus",
    nouveau_record_badge: "Nieuw record!",
    question_name_to_num: "Wat is het nummer van dit station?",
    question_num_to_name: "Welk station is dit?",
    record_dtm_label: "DTM-record:",
    record_personnel_label: "Persoonlijk record:",
    rejouer_btn: "Opnieuw spelen",
    reset_btn: "Resetten",
    reset_carnets_confirm_msg: "{n} opleidingsdossier(s) worden definitief geleegd (dagen, beoordelingen, opmerkingen). Deze actie is onomkeerbaar.",
    reset_carnets_disp_titre: "Dossiers Élève dispatcheur resetten",
    reset_carnets_msg: "{n} profiel(en) hebben momenteel een ingevuld opleidingsdossier.",
    reset_carnets_reg_titre: "Dossiers Élève régulateur resetten",
    reset_questionnaires_confirm_msg: "{n} vragenlijst(en) worden definitief verwijderd (toegewezen, lopende en gevalideerde). Deze actie is onomkeerbaar.",
    reset_questionnaires_msg: "{n} vragenlijst(en) momenteel in de geschiedenis.",
    reset_questionnaires_titre: "Geschiedenis van de vragenlijsten resetten",
    resultats_titre: "Resultaten",
    score_label: "Score:",
    terminer_btn: "Beëindigen",
    zone_dangereuse_sub: "Onomkeerbare acties — gebruik met kennis van zaken.",
    zone_dangereuse_carnet_note: "Het resetten van een dossier gebeurt nu rechtstreeks vanuit het dossier van de betrokken leerling (knop bovenaan elk tabblad, voorbehouden aan Admin +).",
    reset_onglet_btn: "Dit tabblad resetten", confirm_reset_onglet_msg: "Het {fonction}-dossier van deze leerling wordt volledig geleegd (alle dagen, beoordelingen en opmerkingen). Deze actie is onomkeerbaar.",
    zone_dangereuse_titre: "Gevarenzone",
    aide_cotation_btn: "Beoordelingshulp", aide_cotation_titre: "Hoe beoordelen?",
    carnet_graphiques_apparaitront: "Deze grafiek vult zich naarmate opleidingsdagen worden beoordeeld.",
    carnet_radar_titre: "Overzicht per competentie",
    commentaire_humain_label: "Opmerking over de mens", commentaire_humain_placeholder: "Houding, motivatie, gedrag, relaties...",
    commentaire_technicite_label: "Opmerking over de techniciteit", commentaire_technicite_placeholder: "Technische beheersing, ondervonden incidenten...",
    exporter_btn: "Exporteren", note_calculee_label: "Berekend: {v}/5", poste_label: "Post:",
    previsualiser_titre: "Voorbeeld van de vraag",
    resume_semaine_label: "Weekoverzicht", resume_semaine_placeholder: "Samenvatting van de week en doelstellingen voor volgende week, te delen met de kandidaat...",
    incidents_rencontres_label: "Ondervonden incident(en)", incidents_rencontres_placeholder: "Incidenten tijdens de dag...",
    annuler_jour_btn: "Annuleren", reouvrir_jour_btn: "Dag heropenen",
    confirm_annuler_jour_msg: "Dag {n} wordt gereset (datum, monitor, post, opmerkingen en beoordelingen gewist). Deze actie is onomkeerbaar.",
    sous_onglet_graphiques: "Evolutiegrafieken van de competenties", sous_onglet_jours: "Dagen",
    volet_criteres_situationnels_note: "Onderstaande criteria: enkel beoordelen als er zich vandaag een specifieke situatie heeft voorgedaan.",
    volet_notes_count: "{n}/{total} beoordeeld",
    login_title: "G.E.C.", login_subtitle: "Beheer van de continue evaluaties van de DTM-operatoren",
    login_id: "Gebruikersnaam", login_pwd: "Wachtwoord", login_btn: "Inloggen",
    login_error: "Onjuiste gebruikersnaam of wachtwoord.", login_demo: "Demo-accounts",
    logout: "Afmelden", nav_overview: "Overzicht", nav_profiles: "Operatorprofielen", nav_carnets: "Opleidingen", nav_questions: "Vragenbank",
    carnets_titre: "Opleidingen", carnets_sub: "Operators in opleiding — regulators en dispatchers in vorming.",
    aucun_carnet_titre: "Geen leerling in opleiding", aucun_carnet_body: "Geen profiel van een regulator of dispatcher in vorming komt overeen met deze zoekopdracht.",
    formation_en_cours_titre: "Opleiding lopende", formation_reussies_titre: "Geslaagde opleidingen", formation_ratees_titre: "Mislukte opleidingen",
    valider_reussite_title: "Slagen bevestigen", valider_reussite_btn: "Slagen bevestigen",
    valider_reussite_msg: "{nom} krijgt automatisch de rol « {fonction} ». Deze actie is omkeerbaar door het profiel handmatig aan te passen.",
    mettre_fin_formation_title: "Opleiding stopzetten", mettre_fin_formation_btn: "Opleiding stopzetten",
    mettre_fin_formation_msg: "{nom} wordt verplaatst naar « Mislukte opleidingen ». Het profiel wordt niet verwijderd.",
    debuter_formation_dp_btn: "DP-opleiding starten", debuter_formation_dp_msg: "{nom} krijgt de rol « Dispatcher in vorming » en verschijnt opnieuw bij « Opleiding lopende ».",
    carnet_duree_regulateur: "35 dagen met monitor + 10 dagen alleen", carnet_duree_dispatcheur: "35 dagen met monitor",
    jour_label: "Dag", carnet_jour_titre: "Dag {n}",
    carnet_criteres_apercu_note: "Voorbeeld van de lay-out — de echte criterialijst en opslag worden toegevoegd zodra het papieren dossier is afgerond.",
    critere_acquis: "Verworven", critere_a_revoir: "Te herzien", critere_non_evalue: "Niet beoordeeld",
    commencer_jour_btn: "Starten", fin_journee_btn: "Einde van de dag", moniteur_label: "Monitor:",
    carnet_pas_commence_note: "Klik op « Starten » om deze opleidingsdag te beginnen.",
    examen_35_label: "Examen dag 35 geslaagd",
    confirm_fin_journee_msg: "Dag {n} wordt afgesloten en kan niet meer worden gewijzigd. De volgende dag wordt ontgrendeld.",
    carnet_personnel_sous_titre: "Opleidingsdossier", carnet_personnel_bientot_titre: "Binnenkort beschikbaar",
    carnet_personnel_bientot_body: "Het gedetailleerde opleidingsdossier (dagelijkse opvolging door de monitoren) komt binnenkort op deze pagina.",
    voir_carnet_btn: "Dossier bekijken", carnet_onglet_modifiable: "Bewerkbaar", carnet_onglet_lecture_seule: "Alleen lezen",
    nav_questionnaires: "Vragenlijsten", nav_accounts: "Monitoraccounts", nav_admin: "Beheer", nav_staff: "Monitorruimte",
    nav_admin_page: "Admin", admin_page_sub: "Voorbehouden instellingen en tools.",
    admin_page_bientot_titre: "Binnenkort beschikbaar", admin_page_bientot_body: "Deze pagina is klaar om toekomstige instellingen en tools voor het beheer te ontvangen.",
    admin_plus_label: "Admin + (toegang tot de voorbehouden Admin-pagina)",
    student_badge: "Leerling", questionnaires_done: "Afgeronde vragenlijsten",
    agent_number: "Personeelsnr.", no_strength_yet: "Nog geen sterke punten vastgesteld.", no_weakness_yet: "Nog geen zwakke punten vastgesteld.",
    my_questionnaires_intro: "Mijn vragenlijsten",
    strengths_weaknesses: "Sterke & zwakke punten", strengths: "Sterke punten", weaknesses: "Zwakke punten",
    no_results_title: "Nog geen resultaten", no_results_body: "Uw sterke en zwakke punten verschijnen na validatie van een eerste vragenlijst.",
    my_questionnaires: "Mijn vragenlijsten", no_qn_title: "Geen vragenlijst", no_qn_body: "Uw instructeur heeft u nog geen vragenlijst toegewezen.",
    start: "Starten", status_validated: "Gevalideerd", status_pending: "Te valideren", status_progress: "Bezig",
    continue_later: "Later verdergaan", previous: "Vorige", next: "Volgende", submit_answers: "Antwoorden versturen",
    points_short: "pt", question_word: "vraag", answered_word: "beantwoord", select_count: "geselecteerd",
    write_answer_placeholder: "Schrijf uw antwoord...", click_on: "Klik op", locations: "locatie(s)", reset: "Resetten",
    cancel: "Annuleren", save: "Opslaan", close: "Sluiten", add: "Toevoegen", delete: "Verwijderen", edit: "Bewerken",
    export_pdf: "Exporteren als PDF", role_eleve: "Leerling", role_moniteur: "Monitor", role_admin: "Beheerder",
    erreur_enregistrement: "Fout bij het opslaan.", erreur_suppression: "Fout bij het verwijderen.",
    analyse_titre: "Analyse", ma_correction_titre: "Mijn correctie", consultation_titre: "Bekijken",
    qn_deja_valide: "Vragenlijst al gevalideerd", qn_deja_valide_par: "Vragenlijst al gevalideerd door {nom}", qn_en_attente_validation: "Wacht op validatie",
    reponse_eleve: "Antwoord van de leerling: ", sans_reponse: "Geen antwoord", sans_reponse_italic: "Geen antwoord", attendu_parens: "(verwacht)", bonne_reponse_colon: "Juist antwoord: ",
    comparaison_aide_note: "De vergelijking hierboven is slechts een hulpmiddel (strikte spelling) — u kent de punten toe.",
    points_attribues: "Toegekende punten", zones_vertes_cibles: "Groene zones = verwachte doelen · rode punten = klikken van de leerling",
    attendu_deux_points: "(verwacht: {v})", attendu_place: "(verwacht op deze plaats: {v})", parcours_inacheve: "Onvoltooid traject — 0 punten.",
    ouverte_attendu: "Verwacht: ", reference_colon: "Referentie: ",
    modifier_note_auto: "Deze automatische score wijzigen", nouvelle_note: "Nieuwe score", note_auto_parens: "(automatische score: {v})",
    justification_placeholder: "Verplichte motivering van de wijziging...", justification_requise: "Motivering vereist om de vragenlijst te kunnen valideren.",
    note_modifiee_manuellement: "Score handmatig gewijzigd ({points}/{total})",
    remarque_label: "Opmerking", remarque_placeholder: "Voeg een opmerking toe over deze vraag...",
    correction_lue: "Correctie gelezen", fermer_sans_confirmer: "Sluiten zonder te bevestigen", pris_connaissance_correction: "Ik heb kennis genomen van deze correctie",
    valider_questionnaire: "Vragenlijst valideren", pt_short: "pt",
    apercu_title: "Algemeen overzicht", stat_eleves_suivis: "Gevolgde leerlingen", stat_questions_banque: "Vragen in de bank",
    stat_qn_attribues: "Toegewezen vragenlijsten", stat_a_valider: "Te valideren",
    reussite_globale_titre: "Algemeen slagingspercentage per categorie", reussite_globale_sub: "Alle categorieën, alle leerlingen, over alle gevalideerde vragenlijsten.",
    pas_de_donnees_titre: "Nog geen gegevens", pas_de_donnees_body: "Deze grafiek vult zich naarmate vragenlijsten worden gevalideerd.",
    qn_attente_titre: "Vragenlijsten in afwachting van validatie", rien_a_valider_titre: "Niets te valideren", rien_a_valider_body: "Alle voltooide vragenlijsten zijn verwerkt.",
    ajouter_eleve: "Operator toevoegen", rechercher_eleve: "Zoek een leerling...",
    col_eleve: "Operator", col_fonction: "Functie", col_team: "Team", col_langue: "Taal", col_identifiant: "Gebruikersnaam", col_questionnaires: "Vragenlijsten",
    aucun_eleve_titre: "Geen leerling gevonden", aucun_eleve_body: "Probeer een andere zoekopdracht of voeg een profiel toe.",
    supprimer_profil_titre: "Dit profiel verwijderen?", supprimer_profil_msg: "Het profiel van {nom} en de geschiedenis van vragenlijsten worden definitief verwijderd.",
    modifier_profil: "Profiel bewerken", prenom_label: "Voornaam", nom_label: "Naam", numero_agent_label: "Personeelsnummer",
    fonction_label: "Functie", role_linguistique_label: "Taalrol", role_linguistique_hint: "Bepaalt de weergavetaal van de applicatie voor dit profiel.",
    team_hint_admin: "Het lidmaatschap van een team kan alleen door een beheerder worden gewijzigd.", team_hint_readonly: "Alleen een beheerder kan dit veld wijzigen.",
    team_aucune: "Geen", identifiant_connexion: "Gebruikersnaam", mot_de_passe_label: "Wachtwoord", genere_auto: "(automatisch gegenereerd)",
    retour_profils: "Terug naar profielen", qn_valides_label: "Gevalideerde vragenlijsten", en_attente_encours: "In afwachting / bezig",
    points_forts_faibles_global: "Sterke & zwakke punten (algemeen)", graphique_apres_validation: "Deze grafiek verschijnt na validatie van een eerste vragenlijst.",
    evolution_categorie_titre: "Evolutie per categorie", evolution_categorie_note: "Een categorie verschijnt hier alleen als er minstens één vraag uit die categorie aan de leerling is gesteld.",
    graphiques_apparaitront: "Deze grafieken verschijnen naarmate vragenlijsten worden gevalideerd.",
    fiche_eleve: "Leerlingfiche", genere_le: "Gegenereerd op", qn_repondus_valides: "Beantwoorde vragenlijsten (gevalideerd)",
    points_forts_faibles_vue_globale: "Sterke & zwakke punten (algemeen overzicht)", pas_encore_qn_valide: "Nog geen gevalideerde vragenlijst.",
    taux_reussite_par_categorie: "Slagingspercentage per categorie", categorie_col: "Categorie", reussite_moyenne_col: "Gemiddeld slagingspercentage",
    pas_assez_donnees: "Nog niet genoeg gegevens.",
    evolution_note_pdf: "Een categorie verschijnt alleen als er minstens één vraag uit die categorie aan de leerling is gesteld. Elk punt komt overeen met een gevalideerde vragenlijst, in chronologische volgorde.",
    toutes_categories: "Alle", telecharger_modele: "Model downloaden", importer_excel: "Importeren vanuit Excel", ajouter_question: "Vraag toevoegen",
    rechercher_question: "Zoek op trefwoord of nummer (#)...",
    media_image: "Afbeelding", media_video: "Video", media_audio: "Audio", media_jointe: "bijgevoegd",
    element_reponse_attendu: "Verwacht antwoordelement: ", zones_cibles: "{n} doelzone(s) gedefinieerd op de bijgevoegde afbeelding.",
    points_legender: "{n} punt(en) te benoemen op de bijgevoegde afbeelding.", paires_relier: "{n} paar/paren te verbinden.",
    scenario_choix: "Scenario met meerdere keuzes ({n} mogelijke uitkomst(en)).", actions_ordre: "{n} actie(s) in de juiste volgorde te zetten: ",
    reference_label: "Referentie: ", posed_correct_title: "Aantal keer gesteld / aantal juiste antwoorden (gevalideerde vragenlijsten)",
    aucune_question_titre: "Geen vraag", aucune_question_body: "Deze categorie bevat nog geen vraag.",
    supprimer_question_titre: "Deze vraag verwijderen?", supprimer_question_msg: "Deze vraag wordt definitief verwijderd uit de vragenbank.",
    questions_selectionnees: "{n} vra(a)g(en) geselecteerd", transferer_btn: "Verplaatsen", supprimer_btn: "Verwijderen", annuler_selection: "Selectie annuleren",
    transferer_titre: "{n} vra(a)g(en) verplaatsen", categorie_cible_label: "Doelcategorie", choisir_categorie: "Kies een categorie...",
    transferer_hint: "De geselecteerde vragen worden verplaatst naar deze categorie (deze vervangt hun huidige categorie(ën)).",
    supprimer_questions_titre: "Deze vragen verwijderen?", supprimer_questions_msg: "{n} vra(a)g(en) worden definitief verwijderd uit de vragenbank.",
    renommer_categorie: "Categorie hernoemen",
    caractere_interdit_titre: "Niet-toegestaan teken", caractere_interdit_msg: "Het teken « / » is niet toegestaan in de naam van een categorie.",
    remarque_suspension_label: "Opmerking (enkel zichtbaar voor het personeel)", remarque_suspension_hint: "Handig om te onthouden waarom deze vraag in de wacht staat.",
    remarque_suspension_placeholder: "Bv.: in afwachting van bevestiging van het juiste antwoord door dienst X...",
    mettre_en_suspens_btn: "In de wacht zetten", mettre_en_suspens_title: "Zo opslaan zonder validatie, om later verder te doen",
    suspens_popup_intro: "Deze vraag wordt zo opgeslagen, zonder validatie, om later verder te doen.",
    categories_titre: "Categorieën", col_categorie: "Categorie", col_seuil_reussite: "Slagingsdrempel", col_concerne: "Betreft",
    confirmer: "Bevestigen", enregistre: "Opgeslagen", nouvelle_categorie_placeholder: "Nieuwe categorie...", pct_reussite: "% slagen",
    supprimer_categorie_titre: "Deze categorie verwijderen?", supprimer_categorie_msg: "De categorie « {cat} » wordt definitief verwijderd.",
    suppression_impossible_titre: "Verwijderen niet mogelijk", suppression_impossible_msg: "Kan « {cat} » niet verwijderen: er zijn nog vragen aan gekoppeld. Verwijder de categorie eerst van deze vragen.",
    categorie_existante_titre: "Categorie bestaat al", categorie_existante_msg: "Er bestaat al een zeer gelijkaardige categorie: « {cat} ». Gebruik deze rechtstreeks in plaats van een nieuwe aan te maken, om dubbels te vermijden.",
    attribuer_qn: "Vragenlijst toewijzen", analyser_valider: "Analyseren & valideren",
    eleve_concerne: "Betrokken leerling", titre_qn_label: "Titel van de vragenlijst", titre_qn_hint: "Indien leeg gelaten: « Vragenlijst van [datum] om [uur] ».",
    titre_qn_placeholder: "bv. Maandelijkse controle", langue_qn_label: "Taal van de vragenlijst", langue_qn_hint: "Bepaalt in welke taal de leerling de vraag en antwoorden ziet.",
    langue_evalue: "Taal van de beoordeelde", langue_inverse_evalue: "Omgekeerde taal van de beoordeelde", langue_5050: "50/50 (om beurten een vraag in elke taal)",
    selection_categories_label: "Selectie van categorieën", categories_role_hint: "Enkel categorieën die betrekking hebben op de functie « {role} ».",
    mode_aleatoire: "100% willekeurig (alle categorieën van de functie)", mode_cible: "Gerichte categorieën", aucune_categorie_role: "Er is geen categorie ingesteld voor de functie « {role} ».",
    repetitions_label: "Herhalingen", deja_attribuees_hint: "{n} vraag/vragen al toegewezen aan deze leerling.", ne_pas_reattribuer: "Reeds gestelde vragen niet opnieuw toewijzen aan deze leerling",
    nb_questions_label: "Aantal vragen ({n} beschikbaar)", generer_apercu: "Willekeurige voorvertoning genereren", attribuer_eleve: "Toewijzen aan de leerling",
    apercu_tirage_titre: "Voorvertoning van de selectie", aucun_apercu_titre: "Geen voorvertoning gegenereerd", aucun_apercu_body: "Klik op « Willekeurige voorvertoning genereren » om vragen te trekken uit de gekozen categorieën.",
    qn_attribue_msg: "« {titre} » werd toegewezen aan {nom}.",
    nav_ma_team: "Mijn team", ma_team_titre: "Mijn team — {team}", stat_operateurs: "Operators", exporter_team: "Team exporteren",
    resultats_globaux_categorie: "Globale resultaten per categorie", pas_encore_resultats_team: "Deze grafiek verschijnt na validatie van een eerste vragenlijst in het team.",
    operateurs_team_titre: "Operators van het team", aucun_operateur_titre: "Geen operator", aucun_operateur_body: "Er is nog geen profiel aan dit team gekoppeld.",
    qn_valides_team_titre: "Gevalideerde vragenlijsten van het team", aucun_qn_valide_team_titre: "Geen gevalideerde vragenlijst", aucun_qn_valide_team_body: "Gecorrigeerde vragenlijsten van de operators van dit team verschijnen hier.",
    voir_btn: "Bekijken",
    exporter_selection: "Selectie exporteren ({n})", tous_les_operateurs: "Alle operators",
    a_analyser_valider: "Te analyseren & valideren", rien_en_attente_titre: "Niets in afwachting", rien_en_attente_body: "Geen enkele afgeronde vragenlijst wacht op validatie.",
    analyser_btn: "Analyseren", historique_titre: "Geschiedenis", aucun_resultat_titre: "Geen resultaat", aucun_resultat_body: "Geen vragenlijst komt overeen met dit filter.",
    corrige_par: " · gecorrigeerd door ", attribue_le: "toegewezen op", tous_les_eleves: "Alle leerlingen",
    comptes_titre: "Monitor- & beheerdersaccounts", ajouter_compte: "Account toevoegen", col_nom: "Naam", col_role: "Rol",
    supprimer_compte_titre: "Dit account verwijderen?", supprimer_compte_msg: "Het account van {nom} wordt definitief verwijderd.",
    modifier_compte: "Account bewerken", administrateur_option: "Beheerder", responsable_team_label: "Teamverantwoordelijke",
    responsable_team_hint: "Indien ingevuld, verschijnt er een tabblad « Mijn team » voor dit account met de resultaten van dat team.",
    modifier_question: "Vraag bewerken", categories_field_label: "Categorieën (één of meerdere)", type_question_label: "Vraagtype",
    enonce_question_label: "Vraagstelling", cotation_points_label: "Score (punten)",
    points_bonne_reponse_label: "Punten per verwacht juist antwoord",
    points_bonne_reponse_hint_ordre: "Elke correct geplaatste actie levert dit aantal punten op.",
    points_bonne_reponse_hint_autre: "Elk aangevinkt juist antwoord / gevonden doelzone levert dit aantal punten op, elke fout trekt 1 punt af (nooit onder 0).",
    total_question_prefix: "Totaal van de vraag: ", total_question_points: " punten (", action_word: "actie", bonne_reponse_attendue_word: "verwacht juist antwoord",
    ajoutez_dabord_elements: "Voeg eerst de onderstaande elementen toe.",
    minuteur_label: "Timer (optioneel)", minuteur_hint: "Tijd die de leerling krijgt om deze specifieke vraag te beantwoorden tijdens het examen.",
    activer_minuteur: "Een timer activeren voor deze vraag", min_short: "min", sec_short: "sec",
    image_obligatoire_label: "Afbeelding (verplicht)", image_facultatif_label: "Afbeelding, audio of video (optioneel)", image_obligatoire_hint: "Een afbeelding is verplicht voor dit type vraag.",
    reponses_qcm_label: "Antwoorden — Français / Nederlands (het juiste antwoord selecteren)", reponses_qcm_multi_label: "Antwoorden — Français / Nederlands (alle juiste antwoorden aanvinken)",
    ajouter_reponse: "Antwoord toevoegen", element_reponse_ouverte_label: "Verwacht antwoordelement (optioneel, enkel zichtbaar voor de monitor)",
    zones_cible_label: "Doelzone(s) ({n})", zones_cible_hint: "Klik op de afbeelding om een te vinden punt toe te voegen. Klik op een markering om ze te verwijderen.",
    point_word: "Punt", ajoutez_image_dabord: "Voeg eerst hierboven een afbeelding toe.",
    paires_relier_label: "Te verbinden paren ({n})", paires_relier_hint: "De leerling moet elk linkerelement met het overeenkomstige rechterelement verbinden (de volgorde rechts wordt gemengd tijdens het examen).",
    element_gauche_placeholder: "Linkerelement", element_droite_placeholder: "Rechterelement (overeenkomstig)", ajouter_paire: "Paar toevoegen",
    actions_ordonner_label: "Te ordenen acties — Français / Nederlands ({n})",
    actions_ordonner_hint: "Voer de acties in de JUISTE volgorde in (deze volgorde) — de leerling krijgt ze door elkaar en moet ze met pijltjes in deze volgorde terugzetten. Voeg er zoveel toe als nodig.",
    ajouter_action: "Actie toevoegen",
    points_legender_label: "Te labelen punten ({n})", points_legender_hint: "Klik op de afbeelding om een genummerd punt te plaatsen en geef vervolgens het verwachte antwoord op voor elk punt (gebruikt als hulp bij manuele correctie). Klik op een markering om ze te verwijderen.",
    reponse_attendue_point_placeholder: "Verwacht antwoord voor dit punt",
    reference_label_field: "Referentie (enkel zichtbaar bij correctie en in alleen-lezen modus)", reference_placeholder: "bv. Artikel 4.2 van het interne reglement",
    exam_intro_subtitle: "Wat uitleg vooraleer te beginnen, zo werkt het. Lees alles aandachtig en vink elk vakje aan voor u start.",
    types_exercices_titre: "Aanwezige soorten oefeningen", ack_types: "Ik heb de soorten vragen in deze vragenlijst goed gelezen en begrepen.",
    penalty_warning: "Let op: bij meerkeuzevragen met meerdere antwoorden en klikken & aanwijzen trekt elke fout (verkeerd vakje aangevinkt of verkeerde klik) punten af — vink of klik enkel wat u zeker weet.",
    ack_penalty: "Ik heb begrepen dat een fout mij punten kan doen verliezen bij deze vragen.",
    nav_locked_text: "U kunt terugkeren naar reeds beantwoorde vragen, behalve die met een timer ⏱",
    nav_locked_ar: "en de vragen « Action / Réaction »", nav_locked_suffix: "— eenmaal verlaten, zijn ze definitief vergrendeld",
    nav_locked_ar_suffix: "(en voor deze laatste is ook geen enkele terugkeer mogelijk op de gemaakte keuzes binnen het scenario)",
    nav_free_text: "U kunt vrij navigeren en terugkeren naar reeds beantwoorde vragen voor u uw antwoorden verstuurt.",
    ack_nav: "Ik heb begrepen hoe ik tussen de vragen kan navigeren.",
    numero_info_text: "Elke vraag toont haar nummer (bv. Vraag #12). Bij een probleem met een vraag (onduidelijke vraagstelling, vermoedelijke fout, ontbrekende afbeelding...), noteer dit nummer en meld het aan uw monitor — zo kan de vraag onmiddellijk teruggevonden worden.",
    ack_report: "Ik heb begrepen dat ik het nummer van de vraag moet noteren bij een probleem.",
    retour_btn: "Terug", commencer_qn: "De vragenlijst starten",
    confirm_envoi_titre: "Uw antwoorden versturen?", confirm_envoi_msg: "Dit is de laatste vraag. Eenmaal verstuurd, kunnen uw antwoorden niet meer gewijzigd worden.",
  },
};
const LangContext = createContext({ lang: "fr", t: (k) => T.fr[k] || k });
function useLang() { return useContext(LangContext); }
function tFor(lang, k, vars) {
  let s = (T[lang] && T[lang][k]) || T.fr[k] || k;
  if (vars) Object.entries(vars).forEach(([key, val]) => { s = s.split(`{${key}}`).join(val); });
  return s;
}
function LangProvider({ lang, children }) {
  const t = (k, vars) => tFor(lang, k, vars);
  return <LangContext.Provider value={{ lang, t }}>{children}</LangContext.Provider>;
}

/* ---------------------------------- IMPRESSION ---------------------------------- */
const PrintStyles = () => (
  <style>{`
    @media print {
      body * { visibility: hidden !important; }
      #visee-print-area, #visee-print-area * { visibility: visible !important; }
      #visee-print-area { position: fixed; left: 0; top: 0; width: 100%; margin: 0; padding: 24px; }
      .no-print { display: none !important; }
    }
  `}</style>
);


const TYPE_META = {
  qcm: { label: "QCM", labelNl: "Meerkeuzevraag", icon: ListChecks },
  qcm_multi: { label: "QCM (réponses multiples)", labelNl: "Meerkeuzevraag (meerdere antwoorden)", icon: CheckSquare },
  vrai_faux: { label: "Vrai / Faux", labelNl: "Waar / Onwaar", icon: ToggleLeft },
  ouverte: { label: "Question ouverte", labelNl: "Open vraag", icon: AlignLeft },
  point: { label: "Cliquer & pointer", labelNl: "Klikken & aanwijzen", icon: MapPin },
  relier: { label: "Relier", labelNl: "Verbinden", icon: Link2 },
  legende: { label: "Légender une image", labelNl: "Een afbeelding labelen", icon: ListOrdered },
  action_reaction: { label: "Action / Réaction", labelNl: "Action / Réaction", icon: GitBranch },
  ordre: { label: "Mettre dans l'ordre", labelNl: "In de juiste volgorde zetten", icon: ArrowUpDown },
};
function typeLabel(type, lang) { return (lang === "nl" ? TYPE_META[type]?.labelNl : TYPE_META[type]?.label) || TYPE_META[type]?.label || type; }

const FONCTIONS = ["Élève régulateur", "Régulateur", "Élève dispatcheur", "Dispatcheur"];
const TEAMS = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6"];
const FONCTION_LABELS = {
  "Élève régulateur": { fr: "Élève régulateur", nl: "Regulator in vorming" },
  "Régulateur": { fr: "Régulateur", nl: "Regulator" },
  "Élève dispatcheur": { fr: "Élève dispatcheur", nl: "Dispatcher in vorming" },
  "Dispatcheur": { fr: "Dispatcheur", nl: "Dispatcher" },
};
function fonctionLabel(fonction, langue) { return FONCTION_LABELS[fonction]?.[langue === "nl" ? "nl" : "fr"] || fonction; }
function fonctionColor(fonction) {
  if (fonction === "Régulateur") return { color: C.green, bg: C.greenSoft };
  if (fonction === "Dispatcheur") return { color: C.blue, bg: C.blueSoft };
  return { color: C.gold, bg: C.goldSoft };
}

/* ---------------------------------- HELPERS ---------------------------------- */
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function initials(prenom, nom) { return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase(); }
function getResultReached(root, path) {
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
function walkTrail(root, path) {
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
function countTreeResults(node) {
  if (!node) return 0;
  if (node.type === "resultat") return 1;
  return (node.enfants || []).reduce((s, c) => s + countTreeResults(c), 0);
}
function validateActionTree(node) {
  if (!node || !node.texte || !node.texte.trim()) return false;
  if (node.type === "resultat") return typeof node.pourcentage === "number" && node.pourcentage >= 0 && node.pourcentage <= 100;
  if (node.type === "evenement") return (node.enfants || []).length > 0 && node.enfants.every(validateActionTree);
  if (node.type === "action") return (node.enfants || []).length === 1 && validateActionTree(node.enfants[0]);
  return false;
}
function pointsPerAnswerOf(q) {
  if (typeof q.pointsParBonneReponse === "number") return q.pointsParBonneReponse;
  const n = q.type === "qcm_multi" ? (q.bonnesReponses || []).length : (q.cibles || []).length;
  return n > 0 ? q.points / n : 0;
}
function scoreQcmMulti(q, raw) {
  const sel = Array.isArray(raw) ? raw : [];
  const good = q.bonnesReponses || [];
  const correctCount = sel.filter(i => good.includes(i)).length;
  const incorrectCount = sel.filter(i => !good.includes(i)).length;
  return Math.max(0, correctCount * pointsPerAnswerOf(q) - incorrectCount);
}
function correctPlacementsOrdre(q, raw) {
  const items = q.items || [];
  const order = Array.isArray(raw) ? raw : [];
  return items.filter((it, i) => order[i] === it.id).length;
}
function scoreOrdre(q, raw) {
  return correctPlacementsOrdre(q, raw) * pointsPerAnswerOf(q);
}
function matchedCiblesCount(q, clicks) {
  const used = new Set(); let m = 0;
  (q.cibles || []).forEach(cible => {
    let idx2 = -1;
    clicks.forEach((c, i2) => { if (used.has(i2) || idx2 !== -1) return; if (Math.hypot(c.x - cible.x, c.y - cible.y) <= cible.rayon) idx2 = i2; });
    if (idx2 >= 0) { used.add(idx2); m++; }
  });
  return m;
}
function scorePoint(q, raw) {
  const clicks = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const matched = matchedCiblesCount(q, clicks);
  const incorrectCount = clicks.length - matched;
  return Math.max(0, matched * pointsPerAnswerOf(q) - incorrectCount);
}
function isFullyCorrect(q, raw, manualPoints, overridePoints) {
  if (overridePoints != null) return overridePoints === q.points;
  if (q.type === "qcm" || q.type === "vrai_faux") return raw === q.bonneReponse;
  if (q.type === "qcm_multi") return scoreQcmMulti(q, raw) === q.points;
  if (q.type === "point") return scorePoint(q, raw) === q.points;
  if (q.type === "legende") return manualPoints != null && manualPoints === q.points;
  if (q.type === "action_reaction") { const result = getResultReached(q.arbre, raw); return !!result && result.pourcentage === 100; }
  if (q.type === "relier") { const total = (q.paires || []).length; const n = (q.paires || []).filter((p, li) => raw && raw[li] === p.id).length; return total > 0 && n === total; }
  if (q.type === "ordre") { const total = (q.items || []).length; return total > 0 && correctPlacementsOrdre(q, raw) === total; }
  if (q.type === "ouverte") return !!(raw && typeof raw.points === "number" && raw.points === q.points);
  return false;
}
function computeCategoryStats(validatedQuestionnaires, categories) {
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
function computeCategoryEvolution(validatedQuestionnaires, categories) {
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

/* ---------------------------------- ATOMS ---------------------------------- */
function Btn({ children, onClick, variant = "ghost", icon: Icon, style, disabled }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent", transition: "all .15s", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary: { background: C.navy, color: "#fff" }, gold: { background: C.gold, color: C.navy },
    ghost: { background: "transparent", color: C.navy, border: `1px solid ${C.line}` },
    danger: { background: C.redSoft, color: C.red }, subtle: { background: C.bg, color: C.inkSoft },
    success: { background: C.greenSoft, color: C.green },
  };
  return <button type="button" onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{Icon && <Icon size={15} />}{children}</button>;
}
function Field({ label, children, hint }) {
  return (
    <div style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.inkSoft, marginBottom: 6, letterSpacing: ".02em", textTransform: "uppercase" }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11.5, color: C.inkSoft, marginTop: 5 }}>{hint}</span>}
    </div>
  );
}
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 14, color: C.ink, background: "#fff", outline: "none" };
function Badge({ children, color, bg }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: ".03em", padding: "3px 9px", borderRadius: 5, color, background: bg }}>{children}</span>; }
function StatusBadge({ statut }) {
  const { t } = useLang();
  const map = { "validé": { color: C.green, bg: C.greenSoft, label: t("status_validated") }, "en attente de validation": { color: C.gold, bg: C.goldSoft, label: t("status_pending") }, "en cours": { color: C.inkSoft, bg: C.bg, label: t("status_progress") } };
  const s = map[statut] || map["en cours"];
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}
function CategoryBadges({ allCategories, cats }) {
  return <>{(cats || []).map(c => <Badge key={c} color={catColor(allCategories, c)} bg={C.bg}>{c}</Badge>)}</>;
}
function TypeBadge({ type }) {
  const { lang } = useLang();
  const meta = TYPE_META[type]; if (!meta) return null; const Icon = meta.icon;
  return <Badge color={C.inkSoft} bg={C.bg}><Icon size={11} />{typeLabel(type, lang)}</Badge>;
}
function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 14, width, maxWidth: "100%", maxHeight: "85%", overflowY: "auto", boxShadow: "0 20px 60px rgba(22,35,63,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: C.navy }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, body }) {
  return <div style={{ textAlign: "center", padding: "48px 20px", color: C.inkSoft }}><Icon size={26} style={{ marginBottom: 10, opacity: 0.5 }} /><p style={{ margin: 0, fontWeight: 600, color: C.ink, fontSize: 14 }}>{title}</p><p style={{ margin: "4px 0 0", fontSize: 13 }}>{body}</p></div>;
}
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Supprimer", tone = "danger" }) {
  const toneColor = tone === "success" ? C.green : C.red;
  const toneBg = tone === "success" ? C.greenSoft : C.redSoft;
  const ToneIcon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 360, boxShadow: "0 20px 60px rgba(22,35,63,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: toneBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ToneIcon size={16} color={toneColor} /></div>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: C.navy }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
          <Btn variant={tone === "success" ? "success" : "danger"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}
function InfoDialog({ title, message, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 380, boxShadow: "0 20px 60px rgba(22,35,63,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AlertTriangle size={16} color={C.gold} /></div>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: C.navy }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" onClick={onClose}>Compris</Btn>
        </div>
      </div>
    </div>
  );
}
function SectionTitle({ children }) { return <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 15.5, fontWeight: 600, color: C.navy }}>{children}</h3>; }
function Header({ user, onLogout }) {
  const { t } = useLang();
  return (
    <div style={{ background: C.navy, color: "#fff", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1.4px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold }} /></div>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: ".04em" }}>G.E.C.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#C7CEE0" }}>{user.prenom} {user.nom}</span>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, padding: "7px 12px", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><LogOut size={13} /> {t("logout")}</button>
      </div>
    </div>
  );
}
function LoadingScreen({ label }) {
  return <div style={{ minHeight: 640, background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 16 }}><Loader2 size={24} color={C.gold} style={{ animation: "visee-spin 1s linear infinite" }} /><div style={{ color: "#C7CEE0", fontSize: 13, marginTop: 12, fontFamily: FONT_BODY }}>{label}</div></div>;
}
function SaveErrorBanner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, marginBottom: 14 }}>
      <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>Échec de l'enregistrement. <span style={{ fontWeight: 400, fontFamily: FONT_MONO, fontSize: 11.5 }}>({visible})</span></span>
    </div>
  );
}
function MediaField({ media, onChange, imageOnly = false }) {
  const [error, setError] = useState("");
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) { setError("Fichier trop volumineux (max 8 Mo)."); e.target.value = ""; return; }
    const kind = file.type.startsWith("audio") ? "audio" : file.type.startsWith("video") ? "video" : "image";
    const reader = new FileReader();
    reader.onload = () => onChange({ type: kind, url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };
  if (media) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {media.type === "image"
          ? <img src={media.url} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.line}` }} />
          : <div style={{ width: 52, height: 52, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{media.type === "audio" ? <Music size={18} color={C.inkSoft} /> : <Video size={18} color={C.inkSoft} />}</div>}
        <span style={{ fontSize: 12.5, color: C.inkSoft, flex: 1 }}>{media.name}</span>
        <Btn variant="danger" icon={Trash2} onClick={() => onChange(null)} style={{ padding: "6px 10px" }} />
      </div>
    );
  }
  return (
    <div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px dashed ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.inkSoft }}>
        <Upload size={15} /> {imageOnly ? "Ajouter une image" : "Ajouter une image, un audio ou une vidéo"}
        <input type="file" accept={imageOnly ? "image/*" : "image/*,audio/*,video/*"} style={{ display: "none" }} onChange={handleFile} />
      </label>
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

/* ---------------------------------- LOGIN ---------------------------------- */
function LoginPage({ onLogin }) {
  const { t } = useLang();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const attemptLogin = async () => {
    if (!pseudo.trim() || !password || busy) return;
    setBusy(true); setError("");
    const result = await onLogin(pseudo, password);
    setBusy(false);
    if (result?.error) setError(result.error);
  };
  const onKeyDown = (e) => { if (e.key === "Enter") attemptLogin(); };

  return (
    <div style={{ minHeight: 640, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", borderRadius: 16, fontFamily: FONT_BODY }}>
      <svg width="520" height="520" viewBox="0 0 520 520" style={{ position: "absolute", right: -140, top: -80, opacity: 0.18 }}>
        {[240, 190, 140, 90, 40].map((r, i) => <circle key={r} cx="260" cy="260" r={r} fill="none" stroke={i % 2 === 0 ? C.gold : "#4C5C82"} strokeWidth="1.4" />)}
        <circle cx="260" cy="260" r="6" fill={C.gold} />
      </svg>
      <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: "absolute", left: -110, bottom: -110, opacity: 0.12 }}>
        {[160, 120, 80, 40].map((r) => <circle key={r} cx="180" cy="180" r={r} fill="none" stroke="#4C5C82" strokeWidth="1.2" />)}
      </svg>
      <div style={{ position: "relative", width: 380, maxWidth: "90%" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} /></div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: ".04em" }}>G.E.C.</div>
          <div style={{ fontSize: 12.5, color: "#9AA6C0", marginTop: 4, letterSpacing: ".03em" }}>{t("login_subtitle")}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <Field label={t("login_id")}>
            <div style={{ position: "relative" }}><UserCircle2 size={16} style={{ position: "absolute", left: 12, top: 12, color: C.inkSoft }} /><input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="ex. rousseauc" value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={onKeyDown} /></div>
          </Field>
          <Field label={t("login_pwd")}>
            <div style={{ position: "relative" }}><Lock size={16} style={{ position: "absolute", left: 12, top: 12, color: C.inkSoft }} /><input type="password" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} /></div>
          </Field>
          {error && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 12, fontWeight: 600 }}>{error}</div>}
          <Btn variant="primary" onClick={attemptLogin} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 16px" }}>{busy ? "Connexion..." : t("login_btn")}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- MODE EXAMEN (ÉLÈVE) ---------------------------------- */
function formatTime(s) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }

function ActionReactionPlayer({ q, value, onChange }) {
  const path = Array.isArray(value) ? value : [];
  const trail = walkTrail(q.arbre, path);
  const last = trail[trail.length - 1];
  const awaitingChoice = last && last.type === "evenement";
  const finished = last && last.type === "resultat";
  const choose = (actionId) => { if (!awaitingChoice) return; onChange([...path, actionId]); };

  const NodeBox = ({ node, clickable, onClick }) => (
    <div onClick={clickable ? onClick : undefined} style={{
      background: "#fff", border: `2px solid ${AR_COLOR[node.type]}`, borderRadius: 10, padding: "12px 14px", width: 220, flexShrink: 0,
      cursor: clickable ? "pointer" : "default", boxShadow: clickable ? "0 2px 6px rgba(22,35,63,0.08)" : "none",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: AR_COLOR[node.type], textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 5 }}>
        {AR_LABEL[node.type]}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{node.texte}</div>
      {clickable && <div style={{ marginTop: 8, fontSize: 11.5, color: C.navy, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>Choisir <ChevronRight size={12} /></div>}
    </div>
  );
  const Connector = () => <div style={{ width: 2, height: 18, background: C.line, flexShrink: 0 }} />;

  return (
    <div style={{ overflowX: "auto", padding: "6px 4px 10px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "fit-content", margin: "0 auto" }}>
        {trail.map((node, i) => (
          <React.Fragment key={node.id}>
            <NodeBox node={node} />
            {i < trail.length - 1 && <Connector />}
          </React.Fragment>
        ))}
        {awaitingChoice && (
          <>
            <Connector />
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Que faites-vous ?</div>
            <div style={{ display: "flex", gap: 16 }}>
              {(last.enfants || []).map(action => <NodeBox key={action.id} node={action} clickable onClick={() => choose(action.id)} />)}
            </div>
          </>
        )}
        {finished && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: C.green, fontSize: 13, fontWeight: 600 }}><CheckCircle2 size={16} /> Fin du scénario — vos choix sont définitifs.</div>
        )}
      </div>
    </div>
  );
}

function RelierQuestion({ q, value, onChange }) {
  const shuffledRight = useMemo(() => shuffle(q.paires), [q.id]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const answer = value && value.length === q.paires.length ? value : Array(q.paires.length).fill(null);
  const colorFor = (i) => PALETTE[i % PALETTE.length];

  const clickLeft = (i) => {
    if (answer[i]) { const next = [...answer]; next[i] = null; onChange(next); setSelectedLeft(null); return; }
    setSelectedLeft(selectedLeft === i ? null : i);
  };
  const clickRight = (pairId) => {
    const usedAt = answer.findIndex(a => a === pairId);
    if (selectedLeft === null) { if (usedAt !== -1) { const next = [...answer]; next[usedAt] = null; onChange(next); } return; }
    const next = [...answer];
    if (usedAt !== -1) next[usedAt] = null;
    next[selectedLeft] = pairId;
    onChange(next);
    setSelectedLeft(null);
  };

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>Cliquez un élément à gauche, puis son correspondant à droite pour les relier.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.paires.map((p, i) => {
            const linked = answer[i];
            return (
              <button key={p.id} onClick={() => clickLeft(i)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${selectedLeft === i ? C.navy : linked ? colorFor(i) : C.line}`, background: selectedLeft === i ? C.bg : "#fff", cursor: "pointer", fontSize: 13.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: linked ? colorFor(i) : C.bg, color: linked ? "#fff" : C.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                {p.gauche}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shuffledRight.map((p) => {
            const leftIdx = answer.findIndex(a => a === p.id);
            const linked = leftIdx !== -1;
            return (
              <button key={p.id} onClick={() => clickRight(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${linked ? colorFor(leftIdx) : C.line}`, background: "#fff", cursor: "pointer", fontSize: 13.5 }}>
                {linked && <span style={{ width: 20, height: 20, borderRadius: "50%", background: colorFor(leftIdx), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{leftIdx + 1}</span>}
                {p.droite}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExamMode({ questionnaire, questions, categories, questionLangues, onExit, onSubmit }) {
  const { t } = useLang();
  const qs = useMemo(() => questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean), [questionnaire, questions]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(() => qs.map(q => (q.type === "ouverte" ? { text: "" } : q.type === "legende" ? Array((q.marqueurs || []).length).fill("") : q.type === "action_reaction" ? [] : q.type === "ordre" ? shuffle((q.items || []).map(it => it.id)) : null)));
  const [qSecondsLeft, setQSecondsLeft] = useState(qs[0]?.dureeSecondes || null);
  const [locked, setLocked] = useState(() => qs.map(() => false));
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const prevIdxRef = useRef(idx);
  const q = qs[idx];
  const langFor = (i) => (questionLangues && questionLangues[i]) || "fr";

  // Avertit avant de fermer/rafraîchir l'onglet : les réponses ne sont
  // envoyées qu'au clic final sur "Envoyer mes réponses", donc fermer la
  // page en plein examen ferait perdre tout ce qui a déjà été répondu.
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const prev = prevIdxRef.current;
    if (prev !== idx && (qs[prev]?.dureeSecondes || qs[prev]?.type === "action_reaction")) {
      setLocked(l => { const n = [...l]; n[prev] = true; return n; });
    }
    prevIdxRef.current = idx;
    setQSecondsLeft(qs[idx]?.dureeSecondes || null);
    // eslint-disable-next-line
  }, [idx]);

  useEffect(() => {
    if (qSecondsLeft === null) return;
    if (qSecondsLeft <= 0) {
      if (idx < qs.length - 1) setIdx(i => i + 1); else onSubmit(answers);
      return;
    }
    const timerId = setTimeout(() => setQSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line
  }, [qSecondsLeft]);

  if (!q) {
    return (
      <div style={{ padding: "24px 28px" }}>
        <div style={{ background: C.redSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: "flex", gap: 12 }}>
          <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>Impossible d'afficher ce questionnaire</div>
            <div style={{ fontSize: 13, color: C.ink }}>Aucune question n'a pu être chargée. Contactez un moniteur ou un administrateur si le problème persiste.</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={onExit} style={{ marginTop: 16 }}>{t("previous")}</Btn>
      </div>
    );
  }

  const setAnswer = (val) => { const a = [...answers]; a[idx] = val; setAnswers(a); };
  const isAnswered = (i) => {
    const a = answers[i]; const type = qs[i].type;
    if (type === "ouverte") return !!(a && a.text && a.text.trim().length > 0);
    if (type === "point") return Array.isArray(a) && a.length === (qs[i].cibles || []).length;
    if (type === "relier") return Array.isArray(a) && a.length === (qs[i].paires || []).length && a.every(v => v !== null && v !== undefined);
    if (type === "qcm_multi") return Array.isArray(a) && a.length > 0;
    if (type === "legende") return Array.isArray(a) && a.length === (qs[i].marqueurs || []).length && a.every(v => typeof v === "string" && v.trim().length > 0);
    if (type === "action_reaction") return !!getResultReached(qs[i].arbre, Array.isArray(a) ? a : []);
    if (type === "ordre") return Array.isArray(a) && a.length === (qs[i].items || []).length;
    return a !== null && a !== undefined;
  };
  const answeredCount = answers.filter((_, i) => isAnswered(i)).length;
  const isResolved = (i) => isAnswered(i) || locked[i];
  const allAnswered = qs.every((_, i) => isResolved(i));
  const goTo = (i) => { if (locked[i]) return; if (q.type === "action_reaction" && !isAnswered(idx) && i !== idx) return; setIdx(i); };

  const handleImageClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    const current = answers[idx] || [];
    if (current.length >= (q.cibles || []).length) return;
    setAnswer([...current, { x, y }]);
  };
  const resetPoints = () => setAnswer([]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{questionnaire.titre}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{answeredCount} / {qs.length} {t("question_word")}{qs.length > 1 ? "s" : ""} {t("answered_word")}{answeredCount > 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn variant="ghost" onClick={onExit}>{t("continue_later")}</Btn>
        </div>
      </div>
      <div style={{ height: 6, background: "#fff", borderRadius: 4, overflow: "hidden", marginBottom: 16, border: `1px solid ${C.line}` }}>
        <div style={{ width: `${(answeredCount / qs.length) * 100}%`, height: "100%", background: C.gold, transition: "width .2s" }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {qs.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} disabled={locked[i]} title={locked[i] ? "Question chronométrée : retour impossible une fois quittée" : undefined} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${locked[i] ? C.line : i === idx ? C.navy : isAnswered(i) ? C.gold : C.line}`, background: locked[i] ? C.bg : i === idx ? C.navy : isAnswered(i) ? C.goldSoft : "#fff", color: locked[i] ? C.inkSoft : i === idx ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: locked[i] ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: locked[i] ? 0.6 : 1 }}>
            {locked[i] ? <Lock size={12} /> : i + 1}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, minHeight: 320 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "5px 12px" }}>Question #{q.numero}</span>}
            <CategoryBadges allCategories={categories} cats={q.categories} />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{q.points} pt{q.points > 1 ? "s" : ""}</span>
        </div>
        {qSecondsLeft !== null && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 20px", borderRadius: 14, background: qSecondsLeft <= 10 ? C.redSoft : C.goldSoft, color: qSecondsLeft <= 10 ? C.red : C.navy, marginBottom: 22 }}>
            <Timer size={26} />
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, letterSpacing: ".02em" }}>{formatTime(qSecondsLeft)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>temps restant pour cette question</span>
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 600, color: C.navy, lineHeight: 1.4, marginBottom: 22 }}>{qText(q, langFor(idx))}</div>

        {q.media?.type === "audio" && <audio controls src={q.media.url} style={{ width: "100%", marginBottom: 22 }} />}
        {q.media?.type === "video" && q.type !== "point" && <video controls src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 22, border: `1px solid ${C.line}` }} />}
        {q.media?.type === "image" && q.type !== "point" && q.type !== "legende" && <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 22, border: `1px solid ${C.line}` }} />}

        {(q.type === "qcm" || q.type === "vrai_faux") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qChoix(q, langFor(idx)).map((c, ci) => (
              <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${answers[idx] === ci ? C.navy : C.line}`, background: answers[idx] === ci ? C.bg : "#fff", cursor: "pointer" }}>
                <input type="radio" name={`q-${q.id}`} checked={answers[idx] === ci} onChange={() => setAnswer(ci)} />{c}
              </label>
            ))}
          </div>
        )}
        {q.type === "qcm_multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Plusieurs réponses sont possibles.</div>
            {qChoix(q, langFor(idx)).map((c, ci) => {
              const selected = Array.isArray(answers[idx]) && answers[idx].includes(ci);
              return (
                <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${selected ? C.navy : C.line}`, background: selected ? C.bg : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected} onChange={() => { const cur = Array.isArray(answers[idx]) ? answers[idx] : []; setAnswer(cur.includes(ci) ? cur.filter(x => x !== ci) : [...cur, ci]); }} />{c}
                </label>
              );
            })}
          </div>
        )}
        {q.type === "ouverte" && <textarea style={{ ...inputStyle, minHeight: 150, resize: "vertical", fontSize: 14 }} placeholder={t("write_answer_placeholder")} value={(answers[idx] && answers[idx].text) || ""} onChange={e => setAnswer({ text: e.target.value })} />}
        {q.type === "point" && q.media?.url && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("click_on")} {(q.cibles || []).length} {t("locations")} — {(answers[idx] || []).length}/{(q.cibles || []).length} {t("select_count")}{(answers[idx] || []).length > 1 ? "s" : ""}</span>
              {(answers[idx] || []).length > 0 && <Btn variant="ghost" icon={Undo2} onClick={resetPoints} style={{ padding: "5px 10px", fontSize: 12 }}>{t("reset")}</Btn>}
            </div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
              <img src={q.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
              {(answers[idx] || []).map((pt, pi) => (
                <div key={pi} style={{ position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`, width: 22, height: 22, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{pi + 1}</div>
              ))}
            </div>
          </div>
        )}
        {q.type === "legende" && q.media?.url && (
          <div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", marginBottom: 16 }}>
              <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, display: "block" }} />
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 26, height: 26, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{mi + 1}</div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.goldSoft, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{mi + 1}</span>
                  <input style={inputStyle} placeholder={`À quoi correspond le point ${mi + 1} ?`} value={(answers[idx] && answers[idx][mi]) || ""} onChange={e => { const cur = Array.isArray(answers[idx]) ? [...answers[idx]] : Array((q.marqueurs || []).length).fill(""); cur[mi] = e.target.value; setAnswer(cur); }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {q.type === "relier" && <RelierQuestion q={q} value={answers[idx]} onChange={setAnswer} />}
        {q.type === "action_reaction" && <ActionReactionPlayer q={q} value={answers[idx]} onChange={setAnswer} />}
        {q.type === "ordre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Utilisez les flèches pour remettre ces actions dans le bon ordre.</div>
            {(answers[idx] || []).map((itemId, i) => {
              const item = (q.items || []).find(it => it.id === itemId);
              const order = answers[idx];
              const moveOrder = (dir) => {
                const j = i + dir;
                if (j < 0 || j >= order.length) return;
                const next = [...order];
                [next[i], next[j]] = [next[j], next[i]];
                setAnswer(next);
              };
              return (
                <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.bg, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, flex: 1 }}>{itemText(item, langFor(idx))}</span>
                  <Btn variant="ghost" icon={ChevronUp} onClick={() => moveOrder(-1)} style={{ padding: "6px 8px" }} disabled={i === 0} />
                  <Btn variant="ghost" icon={ChevronDown} onClick={() => moveOrder(1)} style={{ padding: "6px 8px" }} disabled={i === order.length - 1} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <Btn variant="ghost" onClick={() => goTo(Math.max(0, idx - 1))} disabled={idx === 0 || locked[idx - 1] || (q.type === "action_reaction" && !isAnswered(idx))}>{t("previous")}</Btn>
        {idx < qs.length - 1
          ? <Btn variant="primary" onClick={() => setIdx(Math.min(qs.length - 1, idx + 1))} disabled={q.type === "action_reaction" && !isAnswered(idx)}>{t("next")}</Btn>
          : <Btn variant="primary" icon={BadgeCheck} disabled={!allAnswered} onClick={() => setConfirmSubmit(true)}>{t("submit_answers")}</Btn>}
      </div>
      {confirmSubmit && (
        <ConfirmDialog title={t("confirm_envoi_titre") || "Envoyer vos réponses ?"} message={t("confirm_envoi_msg") || "Une fois envoyées, vos réponses ne pourront plus être modifiées."} confirmLabel={t("submit_answers")}
          onConfirm={() => { setConfirmSubmit(false); onSubmit(answers); }} onCancel={() => setConfirmSubmit(false)} />
      )}
    </div>
  );
}

/* ---------------------------------- ÉLÈVE VIEW ---------------------------------- */
const TYPE_DESC = {
  qcm: { fr: "Choisissez une seule réponse parmi les propositions.", nl: "Kies één antwoord uit de voorstellen." },
  qcm_multi: { fr: "Cochez toutes les réponses correctes — plusieurs sont possibles.", nl: "Vink alle juiste antwoorden aan — er zijn er meerdere mogelijk." },
  vrai_faux: { fr: "Indiquez si l'affirmation est vraie ou fausse.", nl: "Geef aan of de bewering waar of onwaar is." },
  ouverte: { fr: "Rédigez une réponse libre en texte.", nl: "Schrijf een vrij antwoord in tekst." },
  point: { fr: "Cliquez directement sur l'image aux endroits demandés.", nl: "Klik rechtstreeks op de gevraagde plaatsen op de afbeelding." },
  legende: { fr: "Associez un texte à chaque point numéroté sur l'image.", nl: "Koppel een tekst aan elk genummerd punt op de afbeelding." },
  relier: { fr: "Reliez chaque élément de gauche à son correspondant de droite.", nl: "Verbind elk element links met het overeenkomstige element rechts." },
  action_reaction: { fr: "Faites des choix successifs jusqu'à atteindre un résultat final (aucun retour en arrière possible).", nl: "Faites des choix successifs jusqu'à atteindre un résultat final (aucun retour en arrière possible)." },
  ordre: { fr: "Remettez les actions dans le bon ordre à l'aide des flèches.", nl: "Zet de acties met de pijltjes in de juiste volgorde." },
};
function typeDesc(type, lang) { return (lang === "nl" ? TYPE_DESC[type]?.nl : TYPE_DESC[type]?.fr) || TYPE_DESC[type]?.fr || ""; }
const AR_COLOR = { evenement: C.teal, action: C.navy2, resultat: C.green };
const AR_LABEL = { evenement: "Événement", action: "Action", resultat: "Résultat" };
function ExamIntro({ questionnaire, questions, onStart, onExit }) {
  const { t, lang } = useLang();
  const qs = questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
  const typesPresent = [...new Set(qs.map(q => q.type))];
  const hasTimer = qs.some(q => q.dureeSecondes);
  const hasActionReaction = qs.some(q => q.type === "action_reaction");
  const hasLockedTypes = hasTimer || hasActionReaction;
  const hasPenaltyTypes = qs.some(q => q.type === "qcm_multi" || q.type === "point");
  const [ackTypes, setAckTypes] = useState(false);
  const [ackPenalty, setAckPenalty] = useState(false);
  const [ackNav, setAckNav] = useState(false);
  const [ackReport, setAckReport] = useState(false);
  const canStart = ackTypes && (!hasPenaltyTypes || ackPenalty) && ackNav && ackReport;
  const ackLabelStyle = { display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12.5, fontWeight: 600, color: C.navy, cursor: "pointer" };
  return (
    <div style={{ padding: "24px 28px", maxWidth: 640 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{questionnaire.titre}</div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 24 }}>{t("exam_intro_subtitle")}</div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <SectionTitle>{t("types_exercices_titre")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {typesPresent.map(type => {
            const meta = TYPE_META[type]; if (!meta) return null; const Icon = meta.icon;
            return (
              <div key={type} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} color={C.navy} /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy }}>{typeLabel(type, lang)}</div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft }}>{typeDesc(type, lang)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackTypes} onChange={e => setAckTypes(e.target.checked)} />
          {t("ack_types")}
        </label>
      </div>

      {hasPenaltyTypes && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: C.ink }}>{t("penalty_warning")}</div>
          </div>
          <label style={ackLabelStyle}>
            <input type="checkbox" checked={ackPenalty} onChange={e => setAckPenalty(e.target.checked)} />
            {t("ack_penalty")}
          </label>
        </div>
      )}

      <div style={{ background: hasLockedTypes ? C.goldSoft : C.tealSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {hasLockedTypes ? <Timer size={20} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} /> : <Undo2 size={20} color={C.teal} style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ fontSize: 13, color: C.ink }}>
            {hasLockedTypes ? (
              <>
                {t("nav_locked_text")} {hasActionReaction && <>{t("nav_locked_ar")} </>}{t("nav_locked_suffix")}{hasActionReaction && <> {t("nav_locked_ar_suffix")}</>}.
              </>
            ) : t("nav_free_text")}
          </div>
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackNav} onChange={e => setAckNav(e.target.checked)} />
          {t("ack_nav")}
        </label>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <MessageSquare size={20} color={C.navy} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: C.ink }}>{t("numero_info_text")}</div>
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackReport} onChange={e => setAckReport(e.target.checked)} />
          {t("ack_report")}
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <Btn variant="primary" icon={PlayCircle} onClick={onStart} disabled={!canStart}>{t("commencer_qn")}</Btn>
      </div>
    </div>
  );
}

function stationName(station, langue) { return langue === "nl" ? station.nl : station.fr; }
function pickDistractors(correctStation, count) {
  const pool = STATIONS.filter(s => s.numero !== correctStation.numero);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
function generateStationQuestion() {
  const correct = STATIONS[Math.floor(Math.random() * STATIONS.length)];
  const direction = Math.random() < 0.5 ? "numToName" : "nameToNum";
  const displayLang = Math.random() < 0.5 ? "fr" : "nl";
  const optionStations = [correct, ...pickDistractors(correct, 3)].sort(() => Math.random() - 0.5);
  return { direction, displayLang, correct, options: optionStations, correctIndex: optionStations.findIndex(s => s.numero === correct.numero) };
}
const CHRONO_DUREE = 60;
function StationGame({ user, users, setUsers, dtmRecord, onExit }) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState(null); // null | "libre" | "chrono"
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, selectedIndex } | null
  const [timeLeft, setTimeLeft] = useState(CHRONO_DUREE);
  const [finished, setFinished] = useState(false);
  const meilleurScore = user.jeuStationsMeilleurScore || 0;
  const dtmBest = dtmRecord ? dtmRecord.score : 0;
  const RecordBanner = () => (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18, fontSize: 12.5 }}>
      <span style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{meilleurScore}</strong></span>
      <span style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBest}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</span>
    </div>
  );

  const startMode = (m) => { setMode(m); setScore(0); setTotal(0); setFinished(false); setFeedback(null); setTimeLeft(CHRONO_DUREE); setQuestion(generateStationQuestion()); };

  useEffect(() => {
    if (mode !== "chrono" || finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      if (score > meilleurScore) supabase.rpc("update_my_station_score", { new_score: score }).then(({ error }) => { if (!error) setUsers(); });
      return;
    }
    const id = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [mode, timeLeft, finished]);

  const answer = (i) => {
    if (feedback) return;
    const correct = i === question.correctIndex;
    setFeedback({ correct, selectedIndex: i });
    setTotal(t => t + 1);
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (mode === "chrono" && timeLeft <= 1) return; // le minuteur gère la fin
      setQuestion(generateStationQuestion());
    }, 550);
  };

  const stopLibre = () => setFinished(true);

  if (!mode) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{t("jeu_stations_titre")}</div>
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12, maxWidth: 480 }}>{t("jeu_stations_intro")}</div>
        <RecordBanner />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}>
          <button onClick={() => startMode("libre")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_libre_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_libre_desc")}</div>
          </button>
          <button onClick={() => startMode("chrono")} style={{ background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_desc", { n: CHRONO_DUREE })}</div>
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const isNewBest = mode === "chrono" && score > meilleurScore;
    return (
      <div style={{ maxWidth: 480 }}>
        <RecordBanner />
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("resultats_titre")}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: C.gold, margin: "14px 0" }}>{score}/{total}</div>
          {isNewBest && <Badge color={C.gold} bg={C.goldSoft}>{t("nouveau_record_badge")}</Badge>}
          {mode === "chrono" && !isNewBest && meilleurScore > 0 && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>{t("meilleur_score_badge", { n: meilleurScore })}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
            <Btn variant="ghost" onClick={() => setMode(null)}>{t("retour_btn")}</Btn>
            <Btn variant="gold" icon={PlayCircle} onClick={() => startMode(mode)}>{t("rejouer_btn")}</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.inkSoft }}>{t("score_label")} <strong style={{ color: C.navy }}>{score}/{total}</strong></span>
          {mode === "chrono" && <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: timeLeft <= 10 ? C.red : C.navy }}>{timeLeft}s</span>}
          {mode === "libre" && <Btn variant="subtle" onClick={stopLibre} style={{ padding: "5px 10px", fontSize: 12 }}>{t("terminer_btn")}</Btn>}
        </div>
      </div>
      <RecordBanner />
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10, textAlign: "center" }}>
          {question.direction === "numToName" ? t("question_num_to_name") : t("question_name_to_num")}
        </div>
        <div style={{ fontSize: question.direction === "numToName" ? 40 : 22, fontWeight: 700, color: C.navy, textAlign: "center", marginBottom: 24, fontFamily: question.direction === "numToName" ? FONT_MONO : FONT_DISPLAY }}>
          {question.direction === "numToName" ? question.correct.numero : stationName(question.correct, question.displayLang)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            const isSelected = feedback?.selectedIndex === i;
            let bg = "#fff", border = C.line, color = C.ink;
            if (feedback) {
              if (isCorrect) { bg = C.greenSoft; border = C.green; color = C.green; }
              else if (isSelected) { bg = C.redSoft; border = C.red; color = C.red; }
            }
            return (
              <button key={i} disabled={!!feedback} onClick={() => answer(i)}
                style={{ background: bg, border: `2px solid ${border}`, color, borderRadius: 12, padding: "14px 10px", fontSize: question.direction === "numToName" ? 14 : 18, fontWeight: 700, fontFamily: question.direction === "numToName" ? FONT_BODY : FONT_MONO, cursor: feedback ? "default" : "pointer", textAlign: "center" }}>
                {question.direction === "numToName" ? stationName(opt, question.displayLang) : opt.numero}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EleveView({ user, users, setUsers, questionnaires, categories, onLogout, submitReponses, confirmRead, saveError }) {
  const { t } = useLang();
  const [playing, setPlaying] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [dtmRecord, setDtmRecord] = useState(null);
  useEffect(() => {
    supabase.rpc("get_station_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecord(data[0]); });
  }, []);
  const dtmBest = dtmRecord ? dtmRecord.score : 0;
  const mine = questionnaires.filter(q => q.eleveId === user.id && !q.supprime);
  const graded = mine.filter(q => q.statut === "validé");
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const scoreEntries = categories.map(cat => [cat, catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : null]);
  const strengths = scoreEntries.filter(([, v]) => v != null && v >= 75).sort((a, b) => b[1] - a[1]);
  const weaknesses = scoreEntries.filter(([, v]) => v != null && v < 60).sort((a, b) => a[1] - b[1]);

  // Va chercher les questions au bon moment : version sans les réponses pour
  // passer l'examen, version complète (autorisée par la base de données)
  // pour revoir une correction déjà validée.
  useEffect(() => {
    if (!playing && !viewing) { setActiveQuestions(null); return; }
    (async () => {
      setActiveQuestions(null); setFetchError("");
      try {
        if (playing) {
          const { questions: qs } = await callEdgeFunction("get-exam-questionnaire", { questionnaireId: playing.id });
          setActiveQuestions(qs.map(rowToQuestion));
        } else if (viewing) {
          const { questions: qs } = await callEdgeFunction("get-exam-questionnaire", { questionnaireId: viewing.id });
          const ordered = viewing.questionIds.map(id => qs.find(q => q.id === id)).filter(Boolean);
          setActiveQuestions(ordered.map(rowToQuestion));
        }
      } catch (e) { setFetchError(e.message || "Impossible de charger les questions."); }
    })();
  }, [playing?.id, viewing?.id]);

  if (playing && !examStarted) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        {!activeQuestions ? <LoadingScreen label={fetchError || "Préparation du questionnaire..."} /> : <ExamIntro questionnaire={playing} questions={activeQuestions} onStart={() => setExamStarted(true)} onExit={() => setPlaying(null)} />}
      </div>
    );
  }
  if (playing && examStarted) {
    const qFull = questionnaires.find(q => q.id === playing.id) || playing;
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        {!activeQuestions ? <LoadingScreen label="Chargement..." /> : <ExamMode questionnaire={qFull} questions={activeQuestions} categories={categories} questionLangues={qFull.questionLangues || qFull.questionIds.map(() => user.langue || "fr")} onExit={() => { setPlaying(null); setExamStarted(false); }} onSubmit={(reponses) => { submitReponses(qFull.id, reponses); setPlaying(null); setExamStarted(false); }} />}
      </div>
    );
  }
  if (viewing) {
    const qFull = questionnaires.find(q => q.id === viewing.id) || viewing;
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          {!activeQuestions ? <LoadingScreen label={fetchError || "Chargement de la correction..."} /> : (
            <AnalysisView questionnaire={qFull} eleve={user} questions={activeQuestions} categories={categories} onClose={() => setViewing(null)} readOnly showConfirmRead readConfirmed={!!qFull.luConfirme} onConfirmRead={() => confirmRead(qFull.id)} onValidate={() => {}} />
          )}
        </div>
      </div>
    );
  }
  if (showGame) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          <StationGame user={user} users={users} setUsers={setUsers} dtmRecord={dtmRecord} onExit={() => setShowGame(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ padding: "24px 28px" }}>
        <SaveErrorBanner visible={saveError} />
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22, height: "fit-content" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{initials(user.prenom, user.nom)}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.navy }}>{user.prenom} {user.nom}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{t("agent_number")} : {user.numeroAgent}</div>
            <div style={{ marginTop: 14 }}><Badge {...fonctionColor(user.fonction)}>{user.fonction || t("student_badge")}</Badge></div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4 }}>{t("questionnaires_done")}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: C.navy }}>{graded.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <button onClick={() => setShowGame(true)} style={{ background: C.navy, borderRadius: 14, border: "none", padding: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Gamepad2 size={20} color={C.gold} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: "#fff" }}>{t("jeu_stations_titre")}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScore || 0}</strong></span>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBest}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</span>
                </div>
              </div>
            </button>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22 }}>
              <SectionTitle>{t("strengths_weaknesses")}</SectionTitle>
              {graded.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke={C.line} />
                        <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 10.5, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                        <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.green, fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}><TrendingUp size={14} /> {t("strengths")}</div>
                      {strengths.length ? strengths.map(([cat, v]) => <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}><span>{cat}</span><span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{v}%</span></div>) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("no_strength_yet")}</div>}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.red, fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}><TrendingDown size={14} /> {t("weaknesses")}</div>
                      {weaknesses.length ? weaknesses.map(([cat, v]) => <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}><span>{cat}</span><span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{v}%</span></div>) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("no_weakness_yet")}</div>}
                    </div>
                  </div>
                </div>
              ) : <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("no_results_body")} />}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22 }}>
              <SectionTitle>{t("my_questionnaires")}</SectionTitle>
              {mine.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_qn_title")} body={t("no_qn_body")} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {mine.slice().reverse().map(q => (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: C.navy }}>{q.titre}</div>
                        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{q.dateAttribution} · {q.categories.join(", ")} · {q.nbQuestions} questions</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {q.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 14, color: C.navy }}>{q.scoreGlobal}%</span>}
                        {q.statut === "en cours" ? <Btn variant="gold" icon={PlayCircle} onClick={() => setPlaying(q)}>{t("start")}</Btn>
                          : q.statut === "validé" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {!q.luConfirme && <Badge color={C.gold} bg={C.goldSoft}>À lire</Badge>}
                              <Btn variant="subtle" icon={Eye} onClick={() => setViewing(q)}>Voir ma correction</Btn>
                            </div>
                          ) : <StatusBadge statut={q.statut} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- STAFF (MONITEUR / ADMIN) ---------------------------------- */
function StaffView({ user, users, setUsers, questions, setQuestions, questionnaires, setQuestionnaires, categories, setCategories, categoryConfig, setCategoryConfig, onLogout, saveError, requestPrint, onImportQuestions, onRenameCategory, refreshQuestionnaires }) {
  const { t } = useLang();
  const [tab, setTab] = useState("apercu");
  const isAdmin = user.role === "admin";
  const isSuperAdmin = user.superAdmin === true;
  const tabs = [
    { key: "apercu", label: t("nav_overview"), icon: Home },
    { key: "profils", label: t("nav_profiles"), icon: Users },
    { key: "carnets", label: t("nav_carnets"), icon: BookCheck },
    { key: "questions", label: t("nav_questions"), icon: HelpCircle },
    { key: "questionnaires", label: t("nav_questionnaires"), icon: ClipboardList },
    ...(isAdmin ? [{ key: "comptes", label: t("nav_accounts"), icon: ShieldCheck }] : []),
    ...(user.responsableTeam ? [{ key: "maTeam", label: t("nav_ma_team"), icon: ShieldCheck }] : []),
    ...(isSuperAdmin ? [{ key: "admin", label: t("nav_admin_page"), icon: Lock }] : []),
  ];
  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
        <div style={{ background: "#fff", borderRight: `1px solid ${C.line}`, padding: "20px 12px", minHeight: 580 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".05em", padding: "0 10px 10px" }}>{isAdmin ? t("nav_admin") : t("nav_staff")}</div>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 3, background: tab === tb.key ? C.navy : "transparent", color: tab === tb.key ? "#fff" : C.ink, fontSize: 13.5, fontWeight: 600 }}><tb.icon size={16} /> {tb.label}</button>
          ))}
        </div>
        <div style={{ padding: "24px 28px", minWidth: 0 }}>
          <SaveErrorBanner visible={saveError} />
          {tab === "apercu" && <Apercu users={users} questions={questions} questionnaires={questionnaires} categories={categories} />}
          {tab === "profils" && <GestionProfils users={users} setUsers={setUsers} questionnaires={questionnaires} questions={questions} categories={categories} isAdmin={isAdmin} currentUser={user} onPrint={(eleve) => requestPrint({ type: "profile", eleve, questionnaires, categories })} />}
          {tab === "carnets" && <CarnetsEleves users={users} setUsers={setUsers} questionnaires={questionnaires} categories={categories} isAdmin={isAdmin} currentUser={user} />}
          {tab === "questions" && <GestionQuestions questions={questions} setQuestions={setQuestions} categories={categories} setCategories={setCategories} categoryConfig={categoryConfig} setCategoryConfig={setCategoryConfig} isAdmin={isAdmin} onImportQuestions={onImportQuestions} onRenameCategory={onRenameCategory} questionnaires={questionnaires} />}
          {tab === "questionnaires" && <GestionQuestionnaires users={users} questions={questions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} categoryConfig={categoryConfig} requestPrint={requestPrint} currentUser={user} />}
          {tab === "comptes" && isAdmin && <GestionComptes users={users} setUsers={setUsers} currentUser={user} />}
          {tab === "admin" && isSuperAdmin && <AdminPage refreshQuestionnaires={refreshQuestionnaires} />}
          {tab === "maTeam" && user.responsableTeam && <MaTeamView currentUser={user} users={users} setUsers={setUsers} questionnaires={questionnaires} questions={questions} categories={categories} requestPrint={requestPrint} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) { return <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}><div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{label}</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: accent || C.navy, marginTop: 6 }}>{value}</div></div>; }
function Apercu({ users, questions, questionnaires, categories }) {
  const { t } = useLang();
  const eleves = users.filter(u => u.role === "eleve");
  const aValider = questionnaires.filter(q => q.statut === "en attente de validation");
  const gradedAll = questionnaires.filter(q => q.statut === "validé" && !q.supprime);
  const catStats = computeCategoryStats(gradedAll, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  return (
    <div>
      <SectionTitle>{t("apercu_title")}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 16, marginBottom: 24 }}>
        <StatCard label={t("stat_eleves_suivis")} value={eleves.length} />
        <StatCard label={t("stat_questions_banque")} value={questions.length} />
        <StatCard label={t("stat_qn_attribues")} value={questionnaires.length} />
        <StatCard label={t("stat_a_valider")} value={aValider.length} accent={aValider.length ? C.gold : C.navy} />
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <SectionTitle>{t("reussite_globale_titre")}</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 8 }}>{t("reussite_globale_sub")}</div>
        {gradedAll.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("pas_de_donnees_body")} /> : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                <Radar dataKey="score" stroke={C.navy} fill={C.navy} fillOpacity={0.3} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("qn_attente_titre")}</SectionTitle>
        {aValider.length === 0 ? <EmptyState icon={ClipboardCheck} title={t("rien_a_valider_titre")} body={t("rien_a_valider_body")} /> : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {aValider.map(q => { const e = users.find(u => u.id === q.eleveId); return <div key={q.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5 }}><span><strong>{q.titre}</strong> — {e?.prenom} {e?.nom}</span><StatusBadge statut={q.statut} /></div>; })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- GESTION PROFILS ------------------------- */
function GestionProfils({ users, setUsers, questionnaires, questions, categories, isAdmin, currentUser, onPrint }) {
  const { t, lang } = useLang();
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState("");
  const [viewingEleve, setViewingEleve] = useState(null);
  const [error, setError] = useState("");
  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const eleves = users.filter(u => u.role === "eleve" && `${u.prenom} ${u.nom} ${u.numeroAgent}`.toLowerCase().includes(search.toLowerCase()));
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    const before = data.id ? users.find(u => u.id === data.id) : null;
    try {
      if (data.id) {
        await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, fonction: data.fonction, langue: data.langue || "fr", team: data.team, responsableTeam: data.responsableTeam });
        logActivity("Profil", diffEntities([before], [{ ...before, ...data, pseudo }], u => `${u.prenom} ${u.nom}`, USER_LOG_FIELDS), auteurLog);
      } else {
        await callEdgeFunction("manage-user", { action: "create", pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, role: "eleve", fonction: data.fonction, langue: data.langue || "fr", team: data.team, responsableTeam: data.responsableTeam });
        logActivity("Profil", [{ action: "creation", description: `${data.prenom} ${data.nom}` }], auteurLog);
      }
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    setError("");
    const target = users.find(u => u.id === id);
    try {
      await callEdgeFunction("manage-user", { action: "delete", userId: id });
      logActivity("Profil", [{ action: "suppression", description: target ? `${target.prenom} ${target.nom}` : id }], auteurLog);
      await setUsers();
    }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = eleves.find(e => e.id === confirmId);

  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }

  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{t("nav_profiles")}</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setModal({})}>{t("ajouter_eleve")}</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: C.inkSoft }} />
        <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder={t("rechercher_eleve")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_eleve"), t("col_fonction"), t("col_team"), t("col_langue"), t("agent_number"), t("col_identifiant"), t("col_questionnaires"), ""].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {eleves.map(e => (
              <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => setViewingEleve(e)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: C.navy, textAlign: "left" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(e.prenom, e.nom)}</div>
                    <span style={{ textDecoration: "underline", textDecorationColor: C.line }}>{e.prenom} {e.nom}</span>
                  </button>
                </td>
                <td style={{ padding: "12px 16px" }}><Badge {...fonctionColor(e.fonction)}>{fonctionLabel(e.fonction, lang) || t("role_eleve")}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: e.team ? C.ink : C.inkSoft }}>{e.team || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: C.inkSoft }}>{LANGS[e.langue || "fr"]}</td>
                <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{e.numeroAgent}</td>
                <td style={{ padding: "12px 16px", color: C.inkSoft, fontFamily: FONT_MONO, fontSize: 12.5 }}>{e.pseudo}</td>
                <td style={{ padding: "12px 16px" }}>{questionnaires.filter(q => q.eleveId === e.id).length}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  <Btn variant="subtle" icon={FileDown} onClick={() => onPrint(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  <Btn variant="subtle" icon={Edit2} onClick={() => setModal(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  {isAdmin && <Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(e.id)} style={{ padding: "6px 10px" }} />}
                </td>
              </tr>
            ))}
            {eleves.length === 0 && <tr><td colSpan={8}><EmptyState icon={Users} title={t("aucun_eleve_titre")} body={t("aucun_eleve_body")} /></td></tr>}
          </tbody>
        </table>
      </div>
      {modal !== null && <ProfilModal initial={modal} users={users} isAdmin={isAdmin} onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_profil_titre")} message={t("supprimer_profil_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })}
          onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}

/* ------------------------- MA TEAM ------------------------- */
function MaTeamView({ currentUser, users, setUsers, questionnaires, questions, categories, requestPrint }) {
  const { t, lang } = useLang();
  const [viewingEleve, setViewingEleve] = useState(null);
  const [viewingQn, setViewingQn] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const team = currentUser.responsableTeam;
  const operators = users.filter(u => u.role === "eleve" && u.team === team);
  const operatorIds = new Set(operators.map(o => o.id));
  const teamQuestionnaires = questionnaires.filter(qn => operatorIds.has(qn.eleveId));
  const [histFilter, setHistFilter] = useState("");
  const [selected, setSelected] = useState(new Set());
  const graded = teamQuestionnaires.filter(qn => qn.statut === "validé" && !qn.supprime).sort((a, b) => (b.dateValidation || "").localeCompare(a.dateValidation || ""));
  const gradedFiltered = graded.filter(qn => !histFilter || qn.eleveId === histFilter);
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exportSelection = () => {
    const items = gradedFiltered.filter(qn => selected.has(qn.id)).map(qn => ({ questionnaire: qn, eleve: users.find(u => u.id === qn.eleveId) }));
    if (items.length) requestPrint({ type: "questionnaires", items, questions, categories });
  };
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const [error, setError] = useState("");
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    try {
      await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, fonction: data.fonction, langue: data.langue || "fr", team: data.team });
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    setError("");
    try { await callEdgeFunction("manage-user", { action: "delete", userId: id }); await setUsers(); }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = operators.find(o => o.id === confirmId);

  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }
  if (viewingQn) {
    return <AnalysisView questionnaire={viewingQn} eleve={users.find(u => u.id === viewingQn.eleveId)} questions={questions} categories={categories} onClose={() => setViewingQn(null)} readOnly onValidate={() => {}} />;
  }

  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{t("ma_team_titre", { team })}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{operators.length} {t("stat_operateurs").toLowerCase()}</div>
        </div>
        <Btn variant="gold" icon={FileDown} onClick={() => requestPrint({ type: "team", team, operators, questionnaires, questions, categories })} disabled={operators.length === 0}>{t("exporter_team")}</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("stat_operateurs")} value={operators.length} />
        <StatCard label={t("qn_valides_label")} value={graded.length} />
        <StatCard label={t("en_attente_encours")} value={teamQuestionnaires.length - graded.length} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("resultats_globaux_categorie")}</SectionTitle>
        {graded.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("pas_encore_resultats_team")} /> : (
          <div style={{ height: 300, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("operateurs_team_titre")}</SectionTitle>
        {operators.length === 0 ? <EmptyState icon={Users} title={t("aucun_operateur_titre")} body={t("aucun_operateur_body")} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {operators.map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                <button onClick={() => setViewingEleve(o)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", flex: 1, textAlign: "left" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(o.prenom, o.nom)}</div>
                  <span style={{ fontSize: 13.5, color: C.navy, fontWeight: 600, textDecoration: "underline", textDecorationColor: C.line }}>{o.prenom} {o.nom}</span>
                  <Badge {...fonctionColor(o.fonction)}>{fonctionLabel(o.fonction, lang) || t("role_eleve")}</Badge>
                </button>
                <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(o)} style={{ padding: "6px 10px" }} />
                <Btn variant="subtle" icon={FileDown} onClick={() => requestPrint({ type: "profile", eleve: o, questionnaires, categories })} style={{ padding: "6px 10px" }} />
                <Btn variant="subtle" icon={Edit2} onClick={() => setModal(o)} style={{ padding: "6px 10px" }} />
                <Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(o.id)} style={{ padding: "6px 10px" }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>{t("qn_valides_team_titre")}</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selected.size > 0 && <Btn variant="gold" icon={FileDown} onClick={exportSelection}>{t("exporter_selection", { n: selected.size })}</Btn>}
            <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={histFilter} onChange={e => setHistFilter(e.target.value)}>
              <option value="">{t("tous_les_operateurs")}</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>)}
            </select>
          </div>
        </div>
        {gradedFiltered.length === 0 ? <EmptyState icon={ClipboardList} title={t("aucun_qn_valide_team_titre")} body={t("aucun_qn_valide_team_body")} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {gradedFiltered.map(qn => { const e = users.find(u => u.id === qn.eleveId); return (
              <div key={qn.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${selected.has(qn.id) ? C.gold : C.line}`, borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => toggleSelect(qn.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(qn.id) ? C.gold : C.inkSoft, display: "flex" }}>{selected.has(qn.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button>
                  <span style={{ fontSize: 13 }}>{qn.titre} — {e?.prenom} {e?.nom} <span style={{ color: C.inkSoft }}>· {qn.dateAttribution}</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {qn.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600 }}>{qn.scoreGlobal}%</span>}
                  <Btn variant="subtle" icon={ExternalLink} onClick={() => setViewingQn(qn)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("voir_btn")}</Btn>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>
      {modal !== null && <ProfilModal initial={modal} users={users} isAdmin onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_profil_titre")} message={t("supprimer_profil_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })}
          onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
const POSTES = ["P11", "P12", "P21", "P22", "P23"];
const STATIONS = [
  { numero: 1, fr: "De Brouckère", nl: "De Brouckère" },
  { numero: 2, fr: "Gare centrale", nl: "Centraal Station" },
  { numero: 3, fr: "Parc", nl: "Park" },
  { numero: 4, fr: "Arts-loi (1-5)", nl: "Kunst-Wet (1-5)" },
  { numero: 5, fr: "Maelbeek", nl: "Maalbeek" },
  { numero: 6, fr: "Shuman", nl: "Shuman" },
  { numero: 7, fr: "Merode", nl: "Merode" },
  { numero: 8, fr: "Montgomery", nl: "Montgomery" },
  { numero: 9, fr: "Joséphine-Charlotte", nl: "Joséphine-Charlotte" },
  { numero: 10, fr: "Gribaumont", nl: "Gribaumont" },
  { numero: 11, fr: "Tomberg", nl: "Tomberg" },
  { numero: 12, fr: "Roodebeek", nl: "Roodebeek" },
  { numero: 13, fr: "Vandervelde", nl: "Vandervelde" },
  { numero: 14, fr: "Alma", nl: "Alma" },
  { numero: 15, fr: "Crainhem", nl: "Kraainem" },
  { numero: 16, fr: "Stockel", nl: "Stokkel" },
  { numero: 20, fr: "Thieffry", nl: "Thieffry" },
  { numero: 21, fr: "Pétillon", nl: "Pétillon" },
  { numero: 22, fr: "Hankar", nl: "Hankar" },
  { numero: 23, fr: "Delta", nl: "Delta" },
  { numero: 24, fr: "Beaulieu", nl: "Beaulieu" },
  { numero: 25, fr: "Demey", nl: "Demey" },
  { numero: 26, fr: "Herrmann-Debroux", nl: "Herrmann-Debroux" },
  { numero: 27, fr: "Sainte-Catherine", nl: "Sint-Katelijne" },
  { numero: 28, fr: "Conte de Flandre", nl: "Graaf van Vlaanderen" },
  { numero: 29, fr: "Etangs noirs", nl: "Zwarte Vijvers" },
  { numero: 30, fr: "Trône", nl: "Troon" },
  { numero: 31, fr: "Porte de Namur", nl: "Naamsepoort" },
  { numero: 32, fr: "Louise", nl: "Louiza" },
  { numero: 33, fr: "Hôtel des Monnaies", nl: "Munthof" },
  { numero: 34, fr: "Porte de Hal", nl: "Hallepoort" },
  { numero: 35, fr: "Gare du Midi", nl: "Zuidstation" },
  { numero: 36, fr: "Clemenceau", nl: "Clemenceau" },
  { numero: 37, fr: "Delacroix", nl: "Delacroix" },
  { numero: 38, fr: "Gare de l'Ouest (2-6)", nl: "Weststation (2-6)" },
  { numero: 40, fr: "Arts-loi (2-6)", nl: "Kunst-Wet (2-6)" },
  { numero: 41, fr: "Madou", nl: "Madou" },
  { numero: 42, fr: "Botanique", nl: "Kruidtuin" },
  { numero: 43, fr: "Rogier", nl: "Rogier" },
  { numero: 44, fr: "Yser", nl: "Ijzer" },
  { numero: 46, fr: "Ribaucourt", nl: "Ribaucourt" },
  { numero: 47, fr: "Elisabeth", nl: "Elisabeth" },
  { numero: 783, fr: "Roi Baudouin", nl: "Koning Boudewijn" },
  { numero: 782, fr: "Heysel", nl: "Heizel" },
  { numero: 781, fr: "Houba-Brugmann", nl: "Houba-Brugmann" },
  { numero: 780, fr: "Stuyvenbergh", nl: "Stuyvenbergh" },
  { numero: 779, fr: "Bockstael", nl: "Bockstael" },
  { numero: 778, fr: "Pannenhuis", nl: "Pannenhuis" },
  { numero: 777, fr: "Belgica", nl: "Belgica" },
  { numero: 776, fr: "Simonis", nl: "Simonis" },
  { numero: 775, fr: "Osseghem", nl: "Ossegem" },
  { numero: 774, fr: "Beekkant", nl: "Beekkant" },
  { numero: 773, fr: "Gare de l'Ouest (1-5)", nl: "Weststation (1-5)" },
  { numero: 772, fr: "Jacques Brel", nl: "Jacques Brel" },
  { numero: 771, fr: "Aumale", nl: "Aumale" },
  { numero: 770, fr: "Saint-Guidon", nl: "Sint-Guido" },
  { numero: 769, fr: "Veeweyde", nl: "Veeweide" },
  { numero: 768, fr: "Bizet", nl: "Bizet" },
  { numero: 767, fr: "La Roue", nl: "Het Rad" },
  { numero: 766, fr: "CERIA", nl: "Coovi" },
  { numero: 765, fr: "Eddy Merckx", nl: "Eddy Merckx" },
  { numero: 764, fr: "Erasme", nl: "Erasmus" },
];

const COTATION_SCALE = [
  { value: 1, label: "1", desc: "Très faible", descComplete: "Très faible, néant, médiocre, catastrophique", color: C.red, bg: C.redSoft },
  { value: 2, label: "2", desc: "Faible", descComplete: "Faible, insuffisant, bof", color: C.gold, bg: C.goldSoft },
  { value: 3, label: "3", desc: "Satisfaisant", descComplete: "Satisfaisant, requis pour permettre de maintenir l'élève sur une courbe d'apprentissage lui permettant en fin de formation d'arriver à l'autonomie — relatif et non absolu", color: C.teal, bg: C.tealSoft },
  { value: 4, label: "4", desc: "Bien", descComplete: "Bien, peu de remarque, au-dessus de la moyenne", color: C.green, bg: C.greenSoft },
  { value: 5, label: "5", desc: "Excellent", descComplete: "Excellent, exceptionnel, très bien", color: C.blue, bg: C.blueSoft },
];
const CRITERES_REGULATEUR = [
  { categorie: "Regulation", type: "Connaissances", label: "Les concepts de régulation" },
  { categorie: "Regulation", type: "Savoir-faire", label: "Repérer les trains en retard (trou, vecteurs)" },
  { categorie: "Regulation", type: "Savoir-faire", label: "TP (via flèche ET fenêtre TP)" },
  { categorie: "Regulation", type: "Savoir-faire", label: "MRR (station priviliégiée, tempo, les retirer à temps)" },
  { categorie: "Regulation", type: "Savoir-faire", label: "Régulation proactive (MRR, décalage train, demi tour, TAG, acceleration de manœuvre, injection T)" },
  { categorie: "Safety", type: "Connaissances", label: "Safety ferroviaires et connaissances des base (conduite)" },
  { categorie: "Safety", type: "Connaissances", label: "Comprendre la détection des trains" },
  { categorie: "Safety", type: "Savoir-faire", label: "Identifier, comprendre et anticiper les situations accidentogènes (infra, éléments extérieurs, incidents, etc)" },
  { categorie: "Safety", type: "", label: "Mettre une zone en sécurité (MRS, couper le courant, entrée prudente, 25Km/h, etc)" },
  { categorie: "Multi Tasking", type: "", label: "retenir les informations des conversations radio/appels et reçues et prendre les actions nécessaires" },
  { categorie: "Multi Tasking", type: "", label: "Identifier les anomalies de la GCTR/Crew Management et respecter les concepts de régulation tout en gérant ses appels" },
  { categorie: "Multi Tasking", type: "", label: "Garder de la bande passante" },
  { categorie: "Multi Tasking", type: "", label: "Remplir le cahier en temps réel" },
  { categorie: "SYREM", type: "Connaissances", label: "CAI (rôle, definition,quand l’enlever,…)" },
  { categorie: "SYREM", type: "Savoir-faire", label: "TAG" },
  { categorie: "SYREM", type: "Savoir-faire", label: "TP (via flèche ET fenêtre TP)" },
  { categorie: "SYREM", type: "Savoir-faire", label: "Coupure 900v en urgence" },
  { categorie: "SYREM", type: "Savoir-faire", label: "OS Marché sur l’écran (disptacher) PO" },
  { categorie: "SYREM", type: "Connaissances", label: "Magenta impact" },
  { categorie: "SYREM", type: "Connaissances", label: "Architecture et ecran Noir / Magenta" },
  { categorie: "SYREM", type: "Connaissances", label: "information disponibles (nbre de train, fenêtre TP)" },
  { categorie: "PEX", type: "Connaissances", label: "Connaitre la signification des couleurs et logo’s" },
  { categorie: "PEX", type: "", label: "Savoire lire et réguler via le PEX" },
  { categorie: "PEX", type: "Connaissances", label: "Connaissance des différents segment d’une course de depart/arrivée" },
  { categorie: "PEX", type: "Connaissances", label: "Pouvoir comprendre les bugs (train non-associé, course en blanc, creation impossible d’une course)" },
  { categorie: "PEX", type: "Savoir-faire", label: "Glisser les courses" },
  { categorie: "PEX", type: "Savoir-faire", label: "TAG & Dépassement terminus" },
  { categorie: "PEX", type: "Savoir-faire", label: "Remise à horaire" },
  { categorie: "PEX", type: "Savoir-faire", label: "Associer course/train" },
  { categorie: "PEX", type: "Savoir-faire", label: "Décharger/recharger PEX" },
  { categorie: "PEX", type: "Savoir-faire", label: "Gérer / Effectuer les entrées/sorties dépôts" },
  { categorie: "PEX", type: "Savoir-faire", label: "Gérer les APR" },
  { categorie: "PEX", type: "Savoir-faire", label: "Supprimer courses avec/sans compensation" },
  { categorie: "PEX", type: "Savoir-faire", label: "Train tourné / Création de courses" },
  { categorie: "PEX", type: "Savoir-faire", label: "Créer un train renfort / Train d'essai" },
  { categorie: "PEX", type: "Savoir-faire", label: "Gérer les conséquence d'un TP sans fleche" },
  { categorie: "PEX", type: "Savoir-faire", label: "Gérer le retard dans le PEX" },
  { categorie: "PEX", type: "Savoir-faire", label: "Garage / Dégarage sur ligne" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Position T à Simonis" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Position G à Schuman S33" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Position R3/R6 Gare de l'ouest" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Positionnement des écrans" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "introduction itinéraires de sorties et rentrées dépôt" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Basculer de calculateur" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Tracer iti voies de garage" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Tracer iti contre-sens" },
  { categorie: "Factory Link", type: "Connaissances", label: "Connaitre logique des iti (enregistrement, cycle, one shoot,...)" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Mettre une MRS" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "Mettre une limitation 25km/h" },
  { categorie: "Factory Link", type: "Savoir-faire", label: "TAG Herman debroux / Fleche info voyageur" },
  { categorie: "Factory Link", type: "", label: "NTR" },
  { categorie: "Factory Link", type: "Connaissances", label: "Alarmes" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Création de services" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Associer les conducteurs sur les services" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Permutation de service" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Utilisation des filtres (trouver une dispo,…)" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Rechercher un service ou matricule" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Gérer demandes de récupération d’heure" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Gestion des alarmes" },
  { categorie: "GCTR", type: "Connaissances", label: "Compréhension alarmes (géographique, double segment, break)" },
  { categorie: "GCTR", type: "Savoir-faire", label: "Gérer les absences" },
  { categorie: "Généralités", type: "Connaissances", label: "Interconnexion réseau (quai centraux, SNCB, correspondances, etc)" },
  { categorie: "Généralités", type: "Connaissances", label: "Rôles des différents acteurs dans la salle et niveau Traffic" },
  { categorie: "Généralités", type: "Connaissances", label: "Connaitre les numéros de téléphones" },
  { categorie: "Généralités", type: "Connaissances", label: "Connaitre le plan du réseau (stations+numéros+aiguillages)" },
  { categorie: "Généralités", type: "Connaissances", label: "Quel matériel sur quelle ligne / restriction matériel" },
  { categorie: "Généralités", type: "Savoir-faire", label: "Pouvoir utiliser le SVOI" },
  { categorie: "Généralités", type: "Savoir-faire", label: "Lecture et participation à un scenario BABEL" },
  { categorie: "Généralités", type: "Savoir-faire", label: "Utilisation de Skywalker" },
  { categorie: "Généralités", type: "Connaissances", label: "Dépôts & sorties dépôt" },
  { categorie: "Généralités", type: "Connaissances", label: "Configuration des terminus et arrières-stations" },
  { categorie: "Généralités", type: "Connaissances", label: "Voies de garage" },
  { categorie: "Généralités", type: "Connaissances", label: "Zone grises des stations (difference portillon fin de quai et 900v)" },
  { categorie: "Généralités", type: "Savoir-faire", label: "taxi stop" },
  { categorie: "Généralités", type: "Connaissances", label: "Locaux de gestions, de détente, de metzo des différents lieu de remplacement" },
  { categorie: "Administratif", type: "", label: "Savoir remplir correctement le cahier" },
  { categorie: "Administratif", type: "Savoir-faire", label: "Traiter la feuille d’anomalie / APR" },
  { categorie: "Administratif", type: "", label: "Passage d'info shift suivant" },
  { categorie: "Administratif", type: "", label: "Aller chercher proactivement la bouffe avec le sourire" },
  { categorie: "Respect des règles", type: "Connaissances", label: "Reglement d'exploitation RIM/REM" },
  { categorie: "Respect des règles", type: "Connaissances", label: "Rapport conducteur" },
  { categorie: "Respect des règles", type: "Connaissances", label: "Règles Move & lieux de remplacement" },
  { categorie: "IRIS/Qualité", type: "Connaissances", label: "La notion de qualité au sein du Dispatching" },
  { categorie: "IRIS/Qualité", type: "Connaissances", label: "Connaitre la base de l’utilisation de l’IRIS (compo, info, lieu, actions, prévenu, Descritpion / Action / Conséquence, ... )" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Création et encodage complet de l'IRIS" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Encoder les km perdus" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Création IRIS pour APR" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Assistance vicitme (dispatcher)" },
  { categorie: "Communication", type: "Savoir-être", label: "Garde un ton de voix assertif et adapté aux situations" },
  { categorie: "Communication", type: "Connaissances", label: "Utilisation de la radio (parler, terminer, messages généraux,…)" },
  { categorie: "Communication", type: "Connaissances", label: "Utilisation des téléphones (Pax et CISCO et centrale d'urgence)" },
  { categorie: "Communication", type: "Connaissances", label: "Utilisation du Stento" },
  { categorie: "Communication", type: "Savoir-être", label: "Communiquer avec son binôme et l'autre paire de lignes" },
  { categorie: "Communication", type: "Savoir-faire", label: "Faire un AWT" },
  { categorie: "client et info-voyageur", type: "Connaissances", label: "L'offre & horaires" },
  { categorie: "client et info-voyageur", type: "Connaissances", label: "Les impacts des incidents sur les clients (BABEL, perturbations, trajets alternatifs et connexions…)" },
  { categorie: "client et info-voyageur", type: "Connaissances", label: "Connaître les durées estimées d'incidents" },
  { categorie: "client et info-voyageur", type: "Savoir-être", label: "Adapter ses actions dans l'intérêt du client" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Pose des questions si quelques chose n'est pas clair / apprentissage actif" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "cherche à comprendre les logiques" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "s'interesse aux cas particulier/ incidents / Théorie Vs Pratique" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "demande du feedback sur ses prestations" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Essaye d'apprendre métier de Dispatcher" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Montre une volonté de gagner en autonomie" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Reste maître de ses émotions" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "est capable de détecter / anticiper les problématiques" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "ne génère/communique pas de stress aux autres collaborateurs" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Est capable de recevoir un feedback/une critique" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Garde la maitrise (pas d'hésitation)" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "n'oublie pas de communiquer les informations essentielles" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "est capable de détecter et communiquer ses limites" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Fait preuve de vigilance" },
];
const CRITERES_DISPATCHEUR = [
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Gérer les priorités en incident (Disp)" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Placement des mises au rouge de sécurité en incident" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Tester / Basculer vers le fall back" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Prendre les commandes à partir du fallback" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Prendre les commandes à partir du DRS" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Choix du BABEL" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Activation d'un Babel" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Gestion de l'arrivée des secours" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Gestion des évacuations en tunnel" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Surnombre de voyageurs" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Accessibilité aux stations" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Envoi d’agents en renfort" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Trafic suspendu ou ralenti" },
  { categorie: "Gestion d'incident", type: "Savoir-faire", label: "Plan d’urgence" },
  { categorie: "Gestion d'incident", type: "Connaissances", label: "Scénarios par type d'incident (suicide, tiers bloqué dans les portes, incendies, etc)" },
  { categorie: "Safety", type: "Connaissances", label: "Safety ferroviaire" },
  { categorie: "Safety", type: "Connaissances", label: "Comprendre la logique et les limtes des (systèmes de) signalisation et de la sécurité ferroviaire" },
  { categorie: "Safety", type: "Connaissances", label: "Expérience et habitude vs safety ferroviaire (rester vigilant)" },
  { categorie: "Safety", type: "Connaissances", label: "Utilité des Movement Authority" },
  { categorie: "Safety", type: "Connaissances", label: "Comprendre les principes des zones à protéger (signalisation, 900V, …)" },
  { categorie: "Safety", type: "Connaissances", label: "Comprendre la détection des trains" },
  { categorie: "Safety", type: "Connaissances", label: "Risques de prises des itinéraires en local (BCL)" },
  { categorie: "Safety", type: "Connaissances", label: "Identifier, comprendre et anticiper les situations accidentogènes (infra, éléments extérieurs, incidents, etc)" },
  { categorie: "Safety", type: "Connaissances", label: "Système de protection embarqué sur les trains" },
  { categorie: "Safety", type: "Connaissances", label: "Dégrader la sécurité" },
  { categorie: "Safety", type: "Savoir-faire", label: "Donner procédure Niveau 1" },
  { categorie: "Safety", type: "Savoir-faire", label: "Donner procédure Niveau 2" },
  { categorie: "Safety", type: "Savoir-faire", label: "Donner procédure Niveau 3" },
  { categorie: "Safety", type: "Savoir-faire", label: "Demander la remise 900V" },
  { categorie: "Safety", type: "Connaissances", label: "Conformité des rames et véhicules spéciaux : sécurité et légalité (règlement de police)" },
  { categorie: "Safety", type: "Savoir-faire", label: "Donner les accès à la voie" },
  { categorie: "Safety", type: "Savoir-faire", label: "Retirer les MRS" },
  { categorie: "Safety", type: "Savoir-faire", label: "Vérification de l'aiguillage en procédure" },
  { categorie: "Safety", type: "Savoir-faire", label: "Prise de décision en \"déviant de la note\" tout en restant brain base safety" },
  { categorie: "Safety", type: "Savoir-faire", label: "Récupération d'objets" },
  { categorie: "Safety", type: "Savoir-faire", label: "Test itinéraires/feu bleu" },
  { categorie: "Safety", type: "Savoir-faire", label: "Test aiguillages" },
  { categorie: "Safety", type: "Savoir-faire", label: "Test 0*" },
  { categorie: "Safety", type: "Savoir-faire", label: "Test contre-sens" },
  { categorie: "Safety", type: "Savoir-faire", label: "Gestion des sécurités portes (aut. basculement des portes trains et/ou portes locales)" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "VT : coordination des initéraires et compo des convois" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Vérifier les compos des convois et les attestation de conformité" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Appeler energie pour coupure 900V (zone de travaux)" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Sécurisation les zones test" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Sécurisation chantier" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Accès à la voie" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Diriger les locos" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Tracer les itinéraires" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Prise en local de l'aiguillage / donner la main sur l'aiguillage" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Véhicules spéciaux \"non détecté\" ou \"sans attestation\"" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Installer une zone de sécurisation pour des test (ex: Hitachi (zone complète))" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Libération de la zone de sécurisation (remise en ordre) / zone CBTC" },
  { categorie: "Travaux / Travaux de nuit", type: "Savoir-faire", label: "Enregistrement des feuilles de nuits" },
  { categorie: "Multi Tasking", type: "Savoir-être", label: "Veille active sur la régulation (Disp)" },
  { categorie: "Multi Tasking", type: "Savoir-être", label: "retenir les informations des conversations radio reçues et prendre les actions nécessaires" },
  { categorie: "Multi Tasking", type: "Savoir-être", label: "Garder de la bande passante" },
  { categorie: "Multi Tasking", type: "Savoir-être", label: "Faire l'IRIS en temps réel" },
  { categorie: "SYREM", type: "Savoir-faire", label: "MRS" },
  { categorie: "SYREM", type: "Connaissances", label: "Implication sur la sécurité des magentas et ecrans noirs" },
  { categorie: "PEX", type: "", label: "compter les kilomètres après un incident (regulateur)" },
  { categorie: "Administratif", type: "Savoir-faire", label: "Adaptation du cahier SIG" },
  { categorie: "Respect des règles", type: "Connaissances", label: "Reglement d'exploitation RIM/REM" },
  { categorie: "Respect des règles", type: "Connaissances", label: "Reglementation des véhicules spéciaux" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Création et encodage complet de l'IRIS" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Encoder les km perdus" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Création IRIS pour APR" },
  { categorie: "IRIS/Qualité", type: "Savoir-faire", label: "Assistance vicitme" },
  { categorie: "Communication", type: "Savoir-faire", label: "Appeler les services de secours" },
  { categorie: "Communication", type: "Savoir-faire", label: "Travailler avec le grader de garde" },
  { categorie: "client et info-voyageur", type: "", label: "Orienté client dans le choix/validation du BABEL" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Pose des questions si quelques chose n'est pas clair / apprentissage actif" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "cherche à comprendre les logiques" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "s'interesse aux cas particuler/ incidents / Théorie Vs Pratique" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "demande du feedback sur ses prestations" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Essaye d'apprendre métier de Dispatcher" },
  { categorie: "Envie d'apprendre", type: "Savoir-être", label: "Montre une volonté de gagner en autonomie" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Reste maître de ses émotions" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "est capable de détecter / anticiper les problématiques" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "ne génère/communique pas de stress aux autres collaborateurs" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Est capable de recevoir un feedback/une critique" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Garde la maitrise (pas d'hésiation)" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "n'oublie pas de communiquer les informations essentielles" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "est capable de détecter et communiquer ses limites" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Fait preuve de vigilance" },
  { categorie: "Gestion stress & Comportement", type: "Savoir-être", label: "Est orienté brain based safety" },
];
function groupVolets(criteresFlat) {
  const volets = [];
  for (const c of criteresFlat) {
    let v = volets.find(v => v.titre === c.categorie);
    if (!v) { v = { titre: c.categorie, criteres: [] }; volets.push(v); }
    v.criteres.push({ type: c.type, label: c.label });
  }
  return volets;
}
const VOLETS_REGULATEUR = groupVolets(CRITERES_REGULATEUR);
const VOLETS_DISPATCHEUR = groupVolets(CRITERES_DISPATCHEUR);

function makeJours(n, startAt = 1) {
  return Array.from({ length: n }, (_, i) => ({
    numero: startAt + i, statut: i === 0 ? "disponible" : "verrouille",
    date: null, moniteurNom: null, moniteurComplet: null, poste: null,
    commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "", competencesGlobales: {}, criteres: {},
  }));
}
function formatDateJour(d) { const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); return `${dd}/${mm}/${d.getFullYear()}`; }

function CarnetJourDetail({ jourData, editable, currentUser, volets, onUpdateList, onBack }) {
  const { t } = useLang();
  const [confirmFin, setConfirmFin] = useState(false);
  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [openVolet, setOpenVolet] = useState(null);
  const [showAideCotation, setShowAideCotation] = useState(false);
  const started = jourData.statut === "en_cours" || jourData.statut === "termine";
  const finished = jourData.statut === "termine";
  const canFill = editable && started && !finished;

  const commencer = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? {
      ...j, statut: "en_cours", date: formatDateJour(new Date()),
      moniteurNom: currentUser?.nom || "", moniteurComplet: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
    } : j));
  };
  const finDeJournee = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, statut: "termine" } : j));
    setConfirmFin(false);
    onBack();
  };
  const annulerJour = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? {
      ...j, statut: "verrouille", date: null, moniteurNom: null, moniteurComplet: null, poste: null,
      commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "",
      competencesGlobales: {}, criteres: {},
    } : j));
    setConfirmAnnuler(false);
    onBack();
  };
  const reouvrirJour = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, statut: "en_cours" } : j));
  };
  const setChampTexte = (champ, texte) => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, [champ]: texte } : j));
  };
  const setStatutCritere = (key, v) => {
    if (!canFill) return;
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, criteres: { ...j.criteres, [key]: j.criteres?.[key] === v ? undefined : v } } : j));
  };
  const setCompetenceGlobale = (vi, v) => {
    if (!canFill) return;
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, competencesGlobales: { ...j.competencesGlobales, [vi]: j.competencesGlobales?.[vi] === v ? undefined : v } } : j));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Btn variant="ghost" onClick={onBack}>{t("retour_btn")}</Btn>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.navy }}>{t("carnet_jour_titre", { n: jourData.numero })}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
        <Btn variant="gold" onClick={commencer} disabled={!editable || started}>{t("commencer_jour_btn")}</Btn>
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.inkSoft }}>{jourData.date || ".../.../..."}</span>
        <span style={{ fontSize: 13, color: C.inkSoft }}>{t("moniteur_label")} <strong style={{ color: C.ink }}>{jourData.moniteurComplet || "—"}</strong></span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.inkSoft }}>
          {t("poste_label")}
          <select disabled={!canFill} value={jourData.poste || ""} onChange={e => setChampTexte("poste", e.target.value || null)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 13 }}>
            <option value="">—</option>
            {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </span>
        <Btn variant="primary" onClick={() => setConfirmFin(true)} disabled={!editable || !started || finished} style={{ marginLeft: "auto" }}>{t("fin_journee_btn")}</Btn>
        {started && !finished && <Btn variant="danger" icon={Ban} onClick={() => setConfirmAnnuler(true)} disabled={!editable}>{t("annuler_jour_btn")}</Btn>}
        {finished && <Btn variant="ghost" icon={Undo2} onClick={reouvrirJour} disabled={!editable}>{t("reouvrir_jour_btn")}</Btn>}
      </div>

      {!started && <div style={{ background: C.bg, color: C.inkSoft, fontSize: 12.5, padding: "10px 14px", borderRadius: 8, marginBottom: 18 }}>{t("carnet_pas_commence_note")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("commentaire_humain_label")}</div>
            <textarea disabled={!canFill} value={jourData.commentaireHumain || ""} onChange={e => setChampTexte("commentaireHumain", e.target.value)}
              placeholder={t("commentaire_humain_placeholder")}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("incidents_rencontres_label")}</div>
            <textarea disabled={!canFill} value={jourData.incidentsRencontres || ""} onChange={e => setChampTexte("incidentsRencontres", e.target.value)}
              placeholder={t("incidents_rencontres_placeholder")}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("commentaire_technicite_label")}</div>
          <textarea disabled={!canFill} value={jourData.commentaireTechnique || ""} onChange={e => setChampTexte("commentaireTechnique", e.target.value)}
            placeholder={t("commentaire_technicite_placeholder")}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
        </div>
      </div>

      {jourData.numero % 5 === 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("resume_semaine_label")}</div>
          <textarea disabled={!canFill} value={jourData.resumeSemaine || ""} onChange={e => setChampTexte("resumeSemaine", e.target.value)}
            placeholder={t("resume_semaine_placeholder")}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6, borderColor: C.gold }} />
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="ghost" icon={HelpCircle} onClick={() => setShowAideCotation(true)}>{t("aide_cotation_btn")}</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {volets.map((volet, vi) => {
          const isOpen = openVolet === vi;
          const notes = volet.criteres.map((_, ci) => jourData.criteres?.[`${vi}-${ci}`]).filter(v => v != null);
          const globalVal = jourData.competencesGlobales?.[vi];
          return (
            <div key={vi} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", opacity: started ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setOpenVolet(isOpen ? null : vi)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, minWidth: 160, textAlign: "left" }}>
                  {isOpen ? <ChevronUp size={15} color={C.inkSoft} /> : <ChevronDown size={15} color={C.inkSoft} />}
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.navy }}>{volet.titre}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: notes.length > 0 ? C.green : C.inkSoft }}>{t("volet_notes_count", { n: notes.length, total: volet.criteres.length })}</span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {COTATION_SCALE.map(opt => (
                      <button key={opt.value} disabled={!canFill} onClick={() => setCompetenceGlobale(vi, opt.value)} title={opt.desc}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${globalVal === opt.value ? opt.color : C.line}`, background: globalVal === opt.value ? opt.bg : "#fff", color: globalVal === opt.value ? opt.color : C.inkSoft, fontSize: 13, fontWeight: 700, cursor: canFill ? "pointer" : "not-allowed" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.line}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 11, color: C.inkSoft, fontStyle: "italic" }}>{t("volet_criteres_situationnels_note", { n: notes.length, total: volet.criteres.length })}</div>
                  {volet.criteres.map((crit, ci) => {
                    const key = `${vi}-${ci}`;
                    const val = jourData.criteres?.[key];
                    return (
                      <div key={ci}>
                        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6, display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                          {crit.type && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.inkSoft, background: C.bg, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>{crit.type}</span>}
                          <span>{crit.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          {COTATION_SCALE.map(opt => (
                            <button key={opt.value} disabled={!canFill} onClick={() => setStatutCritere(key, opt.value)} title={opt.desc}
                              style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${val === opt.value ? opt.color : C.line}`, background: val === opt.value ? opt.bg : "#fff", color: val === opt.value ? opt.color : C.inkSoft, fontSize: 12, fontWeight: 700, cursor: canFill ? "pointer" : "not-allowed" }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {confirmFin && (
        <ConfirmDialog tone="success" title={t("fin_journee_btn")} message={t("confirm_fin_journee_msg", { n: jourData.numero })}
          confirmLabel={t("fin_journee_btn")} onConfirm={finDeJournee} onCancel={() => setConfirmFin(false)} />
      )}
      {confirmAnnuler && (
        <ConfirmDialog title={t("annuler_jour_btn")} message={t("confirm_annuler_jour_msg", { n: jourData.numero })}
          confirmLabel={t("annuler_jour_btn")} onConfirm={annulerJour} onCancel={() => setConfirmAnnuler(false)} />
      )}
      {showAideCotation && (
        <Modal title={t("aide_cotation_titre")} onClose={() => setShowAideCotation(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COTATION_SCALE.map(opt => (
              <div key={opt.value} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: opt.bg }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", color: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{opt.descComplete}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Btn variant="ghost" onClick={() => setShowAideCotation(false)}>{t("close")}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
function CarnetPersonnel({ eleve, users, setUsers, currentUser, onBack }) {
  const { t, lang } = useLang();
  const isSuperAdmin = currentUser?.superAdmin === true;
  const [confirmResetTab, setConfirmResetTab] = useState(false);
  const tab2Visible = eleve.fonction === "Élève dispatcheur" || eleve.fonction === "Dispatcheur";
  const tab1Editable = eleve.fonction === "Élève régulateur";
  const tab2Editable = eleve.fonction === "Élève dispatcheur";
  const defaultTab = (eleve.fonction === "Élève dispatcheur" || eleve.fonction === "Dispatcheur") ? "dispatcheur" : "regulateur";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeSubTab, setActiveSubTab] = useState("jours");
  const [viewingJour, setViewingJour] = useState(null); // { section: "reg"|"regSolo"|"disp", numero }
  const showingTab2 = activeTab === "dispatcheur" && tab2Visible;
  const editable = showingTab2 ? tab2Editable : tab1Editable;

  const carnet = eleve.carnet || {};
  const joursReg = carnet.reg || makeJours(35, 1);
  const joursRegSolo = carnet.regSolo || makeJours(10, 1);
  const joursDisp = carnet.disp || makeJours(35, 1);
  const examen35Reussi = !!carnet.examen35;

  // Toute modification passe par ici : ça met à jour le profil de l'élève
  // dans la liste globale (setUsers), donc ça survit à une sortie du carnet.
  const [carnetError, setCarnetError] = useState("");
  const updateCarnet = async (patch) => {
    setCarnetError("");
    const newCarnet = { ...(eleve.carnet || {}), ...patch };
    try {
      const { error: err } = await supabase.from("profiles").update({ carnet: newCarnet }).eq("id", eleve.id);
      if (err) throw err;
      await setUsers();
    } catch (e) { setCarnetError(e?.message || "Erreur inconnue."); }
  };
  const listSetters = {
    reg: (updater) => updateCarnet({ reg: typeof updater === "function" ? updater(joursReg) : updater }),
    regSolo: (updater) => updateCarnet({ regSolo: typeof updater === "function" ? updater(joursRegSolo) : updater }),
    disp: (updater) => updateCarnet({ disp: typeof updater === "function" ? updater(joursDisp) : updater }),
  };
  const sections = { reg: [joursReg, listSetters.reg], regSolo: [joursRegSolo, listSetters.regSolo], disp: [joursDisp, listSetters.disp] };

  if (viewingJour) {
    const [list, setList] = sections[viewingJour.section];
    const jourData = list.find(j => j.numero === viewingJour.numero);
    const volets = viewingJour.section === "disp" ? VOLETS_DISPATCHEUR : VOLETS_REGULATEUR;
    return <CarnetJourDetail jourData={jourData} editable={editable} currentUser={currentUser} volets={volets} onUpdateList={setList} onBack={() => setViewingJour(null)} />;
  }

  const renderGrid = (section) => {
    const [list, setList] = sections[section];
    const addJour = () => setList([...list, { numero: list[list.length - 1].numero + 1, statut: "verrouille", date: null, moniteurNom: null, moniteurComplet: null, poste: null, commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "", competencesGlobales: {}, criteres: {} }]);
    const removeJour = () => {
      if (list.length <= 1) return;
      const last = list[list.length - 1];
      if (last.statut === "en_cours" || last.statut === "termine") return;
      setList(list.slice(0, -1));
    };
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10, marginBottom: 10 }}>
          {list.map(j => {
            const clickable = true;
            const bg = j.statut === "en_cours" ? C.goldSoft : j.statut === "termine" ? C.greenSoft : "#fff";
            const border = j.statut === "en_cours" ? C.gold : j.statut === "termine" ? C.green : C.line;
            const numColor = j.statut === "verrouille" ? C.inkSoft : C.navy;
            const isSemaine = j.numero % 5 === 0;
            return (
              <button key={j.numero} disabled={!clickable} onClick={() => setViewingJour({ section, numero: j.numero })}
                title={isSemaine ? `${t("resume_semaine_label")} : ${j.resumeSemaine || "—"}` : undefined}
                style={{ background: bg, border: `${isSemaine ? 2 : 1}px solid ${isSemaine ? C.gold : border}`, borderRadius: 10, padding: "12px 8px", cursor: clickable ? "pointer" : "not-allowed", textAlign: "center", fontFamily: FONT_MONO, opacity: clickable ? 1 : 0.7, position: "relative" }}>
                <div style={{ fontSize: 10, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 3 }}>{t("jour_label")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: numColor }}>{j.numero}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3, minHeight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.moniteurNom || "\u00A0"}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, minHeight: 11 }}>{j.date || "\u00A0"}</div>
              </button>
            );
          })}
        </div>
        {editable && (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" icon={Plus} onClick={addJour} style={{ padding: "5px 10px", fontSize: 12 }} />
            <Btn variant="ghost" icon={X} onClick={removeJour} style={{ padding: "5px 10px", fontSize: 12 }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" onClick={onBack}>{t("retour_btn")}</Btn>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{initials(eleve.prenom, eleve.nom)}</div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.navy }}>{eleve.prenom} {eleve.nom}</div>
          <div style={{ fontSize: 12, color: C.inkSoft }}>{t("carnet_personnel_sous_titre")}</div>
        </div>
        <Btn variant="ghost" icon={FileDown} onClick={() => {}} style={{ marginLeft: "auto" }}>{t("exporter_btn")}</Btn>
      </div>

      {carnetError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{carnetError}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={() => setActiveTab("regulateur")} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 4px", marginRight: 20, fontSize: 13.5, fontWeight: 600, color: activeTab === "regulateur" ? C.navy : C.inkSoft, borderBottom: `2px solid ${activeTab === "regulateur" ? C.navy : "transparent"}` }}>
          {fonctionLabel("Élève régulateur", lang)}
        </button>
        {tab2Visible && (
          <button onClick={() => setActiveTab("dispatcheur")} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 4px", fontSize: 13.5, fontWeight: 600, color: activeTab === "dispatcheur" ? C.navy : C.inkSoft, borderBottom: `2px solid ${activeTab === "dispatcheur" ? C.navy : "transparent"}` }}>
            {fonctionLabel("Élève dispatcheur", lang)}
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {editable
          ? <Badge color={C.green} bg={C.greenSoft}>{t("carnet_onglet_modifiable")}</Badge>
          : <Badge color={C.inkSoft} bg={C.bg}>{t("carnet_onglet_lecture_seule")}</Badge>}
        <span style={{ fontSize: 12, color: C.inkSoft }}>{activeTab === "regulateur" ? t("carnet_duree_regulateur") : t("carnet_duree_dispatcheur")}</span>
        {isSuperAdmin && (
          <Btn variant="danger" icon={Trash2} onClick={() => setConfirmResetTab(true)} style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}>{t("reset_onglet_btn")}</Btn>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button onClick={() => setActiveSubTab("jours")} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeSubTab === "jours" ? C.navy : C.line}`, background: activeSubTab === "jours" ? C.navy : "#fff", color: activeSubTab === "jours" ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{t("sous_onglet_jours")}</button>
        <button onClick={() => setActiveSubTab("graphiques")} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeSubTab === "graphiques" ? C.navy : C.line}`, background: activeSubTab === "graphiques" ? C.navy : "#fff", color: activeSubTab === "graphiques" ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{t("sous_onglet_graphiques")}</button>
      </div>

      {activeSubTab === "jours" ? (
        activeTab === "regulateur" ? (
          <>
            {renderGrid("reg")}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, cursor: editable ? "pointer" : "default" }}>
              <input type="checkbox" checked={examen35Reussi} disabled={!editable} onChange={e => updateCarnet({ examen35: e.target.checked })} />
              {t("examen_35_label")}
            </label>
            {examen35Reussi && renderGrid("regSolo")}
          </>
        ) : renderGrid("disp")
      ) : (() => {
        const jours = activeTab === "regulateur" ? [...joursReg, ...joursRegSolo] : joursDisp;
        const volets = activeTab === "regulateur" ? VOLETS_REGULATEUR : VOLETS_DISPATCHEUR;
        const radarData = computeRadarCarnet(jours, volets);
        const aDesDonnees = radarData.some(d => d.value > 0);
        return (
          <>
            <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <SectionTitle>{t("carnet_radar_titre")}</SectionTitle>
              {!aDesDonnees ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("carnet_graphiques_apparaitront")} /> : (
                <div style={{ height: 300, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke={C.line} />
                      <PolarAngleAxis dataKey="axe" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                      <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              {EVOLUTION_GRAPHS.map((g, gi) => {
                const categories = gi === 0 && activeTab === "dispatcheur" ? ["Gestion d'incident", "Safety", "Multi Tasking"] : g.categories;
                const data = activeTab === "regulateur"
                  ? [...computeEvolutionCarnet(joursReg, volets, categories), ...computeEvolutionCarnet(joursRegSolo, volets, categories, 35)]
                  : computeEvolutionCarnet(joursDisp, volets, categories);
                return (
                  <div key={g.titre} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{g.titre}</div>
                    {data.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("carnet_graphiques_apparaitront")} /> : (
                      <div style={{ height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                            <XAxis dataKey="jour" type="number" domain={["dataMin", "dataMax"]} allowDecimals={false} tick={{ fontSize: 9, fill: C.inkSoft }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} labelFormatter={(v) => `${t("jour_label")} ${v}`} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {categories.map((cat, ci) => (
                              <Line key={cat} type="monotone" dataKey={cat} stroke={EVOLUTION_COLORS[ci % EVOLUTION_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
      {confirmResetTab && (
        <ConfirmDialog title={t("reset_onglet_btn")} message={t("confirm_reset_onglet_msg", { fonction: fonctionLabel(activeTab === "regulateur" ? "Élève régulateur" : "Élève dispatcheur", lang) })}
          confirmLabel={t("reset_btn")} onConfirm={async () => { await updateCarnet(activeTab === "regulateur" ? { reg: undefined, regSolo: undefined, examen35: undefined } : { disp: undefined }); setConfirmResetTab(false); }} onCancel={() => setConfirmResetTab(false)} />
      )}
    </div>
  );
}
// Regroupements du radar "Interfaces" (2 étages, comme dans la feuille Excel
// "Radar" : moyenne des jours notés par catégorie, puis moyenne des
// catégories du groupe). Les catégories citées mais absentes des volets
// actuels (Hermès, CBTC, IVL, Crew Management) n'ont simplement pas de
// données pour l'instant — l'axe reste à 0, comme dans le fichier d'origine.
const RADAR_GROUPS = [
  { axe: "Régulation", categories: ["Regulation"] },
  { axe: "Interface Syrem", categories: ["SYREM", "PEX", "Factory Link", "GCTR"] },
  { axe: "Interface Hermes", categories: ["Hermès", "Crew Management (Hermès)", "IVL"] },
  { axe: "Safety", categories: ["Safety", "CBTC"] },
  { axe: "Multi Tasking", categories: ["Multi Tasking"] },
  { axe: "Admin/Qualité", categories: ["Généralités", "Administratif", "Respect des règles", "IRIS/Qualité"] },
  { axe: "Communication", categories: ["Communication"] },
  { axe: "Attitude", categories: ["client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
];
const EVOLUTION_GRAPHS = [
  { titre: "Régulation-Safety-Multitasking", categories: ["Regulation", "Safety", "Multi Tasking"] },
  { titre: "Interfaces SYREM", categories: ["SYREM", "PEX", "Factory Link", "GCTR"] },
  { titre: "Admin", categories: ["Généralités", "Respect des règles", "Administratif", "IRIS/Qualité"] },
  { titre: "Comportement-Client", categories: ["Communication", "client et info-voyageur", "Envie d'apprendre", "Gestion stress & Comportement"] },
];
const EVOLUTION_COLORS = [C.navy, C.gold, C.teal, C.red];

// Valeur d'une compétence pour un jour donné : uniquement la note directe
// posée par le moniteur sur le volet. Les sous-compétences (situationnelles)
// restent notables individuellement mais n'influencent plus cette valeur.
function competenceEffectiveValue(jourData, volet, vi) {
  return jourData.competencesGlobales?.[vi] ?? null;
}
function moyenneCategorieCarnet(jours, volets, categorieTitre) {
  const vi = volets.findIndex(v => v.titre === categorieTitre);
  if (vi === -1) return null;
  const volet = volets[vi];
  const valeurs = jours.map(j => competenceEffectiveValue(j, volet, vi)).filter(v => v != null);
  if (valeurs.length === 0) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}
function computeRadarCarnet(jours, volets) {
  return RADAR_GROUPS.map(g => {
    const moyennes = g.categories.map(c => moyenneCategorieCarnet(jours, volets, c)).filter(v => v != null);
    const value = moyennes.length ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length : 0;
    return { axe: g.axe, value: Math.round(value * 10) / 10 };
  });
}
function computeEvolutionCarnet(jours, volets, categories, offsetJour = 0) {
  return jours.map(j => {
    const point = { jour: offsetJour + j.numero };
    for (const cat of categories) {
      const vi = volets.findIndex(v => v.titre === cat);
      point[cat] = vi === -1 ? null : competenceEffectiveValue(j, volets[vi], vi);
    }
    return point;
  });
}
const GRADUATION_MAP = { "Élève régulateur": "Régulateur", "Élève dispatcheur": "Dispatcheur" };
function CarnetsEleves({ users, setUsers, questionnaires, questions, categories, isAdmin, currentUser }) {
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [viewingEleve, setViewingEleve] = useState(null);
  const [viewingCarnet, setViewingCarnet] = useState(null);
  const [confirmSuccess, setConfirmSuccess] = useState(null);
  const [confirmFail, setConfirmFail] = useState(null);
  const [confirmStartDP, setConfirmStartDP] = useState(null);
  const [error, setError] = useState("");
  const matches = (u) => `${u.prenom} ${u.nom} ${u.numeroAgent}`.toLowerCase().includes(search.toLowerCase());

  const enCours = users.filter(u => u.role === "eleve" && (u.fonction === "Élève régulateur" || u.fonction === "Élève dispatcheur") && u.formationStatut !== "echouee" && matches(u));
  const reussies = users.filter(u => u.role === "eleve" && (u.fonction === "Régulateur" || u.fonction === "Dispatcheur") && matches(u));
  const ratees = users.filter(u => u.role === "eleve" && (u.fonction === "Élève régulateur" || u.fonction === "Élève dispatcheur") && u.formationStatut === "echouee" && matches(u));

  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const markSuccess = async (eleve) => {
    const nouvelleFonction = GRADUATION_MAP[eleve.fonction];
    if (!nouvelleFonction) return;
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ fonction: nouvelleFonction, formation_statut: null }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Fonction : ${eleve.fonction} → ${nouvelleFonction}` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmSuccess(null);
  };
  const markFail = async (eleve) => {
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ formation_statut: "echouee" }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Statut formation : vide → echouee` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmFail(null);
  };
  const startDPTraining = async (eleve) => {
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ fonction: "Élève dispatcheur", formation_statut: null }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Fonction : ${eleve.fonction} → Élève dispatcheur` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmStartDP(null);
  };

  if (viewingCarnet) {
    const fresh = users.find(u => u.id === viewingCarnet.id) || viewingCarnet;
    return <CarnetPersonnel eleve={fresh} users={users} setUsers={setUsers} currentUser={currentUser} onBack={() => setViewingCarnet(null)} />;
  }
  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }

  const renderTable = (list, opts = {}) => (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "15%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
          <col style={{ width: "7%" }} /><col style={{ width: "9%" }} /><col style={{ width: "8%" }} />
          <col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "9%" }} />
        </colgroup>
        <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_eleve"), "", t("col_fonction"), t("col_team"), t("col_langue"), t("agent_number"), "", "", ""].map((h, i) => <th key={i} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>
          {list.map(e => (
            <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <td style={{ padding: "12px 16px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(e.prenom, e.nom)}</div>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.prenom} {e.nom}</span>
                </div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <Btn variant="subtle" icon={BookCheck} onClick={() => setViewingCarnet(e)} style={{ padding: "4px 9px", fontSize: 12, whiteSpace: "nowrap" }}>{t("voir_carnet_btn")}</Btn>
              </td>
              <td style={{ padding: "12px 16px", overflow: "hidden" }}><Badge {...fonctionColor(e.fonction)}>{fonctionLabel(e.fonction, lang)}</Badge></td>
              <td style={{ padding: "12px 16px", fontSize: 12.5, color: e.team ? C.ink : C.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.team || "—"}</td>
              <td style={{ padding: "12px 8px", fontSize: 12.5, color: C.inkSoft }}>{LANGS[e.langue || "fr"]}</td>
              <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5, overflow: "hidden" }}>{e.numeroAgent}</td>
              <td style={{ padding: "12px 6px" }}>
                {opts.actions && isAdmin && <Btn variant="success" icon={CheckCircle2} onClick={() => setConfirmSuccess(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("valider_reussite_btn")}</Btn>}
                {opts.dpAction && isAdmin && e.fonction === "Régulateur" && (
                  <Btn variant="success" icon={ArrowUpDown} onClick={() => setConfirmStartDP(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("debuter_formation_dp_btn")}</Btn>
                )}
              </td>
              <td style={{ padding: "12px 6px" }}>
                {opts.actions && isAdmin && <Btn variant="danger" icon={XCircle} onClick={() => setConfirmFail(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("mettre_fin_formation_btn")}</Btn>}
              </td>
              <td style={{ padding: "12px 8px", textAlign: "left" }}>
                <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(e)} style={{ padding: "6px 8px" }} />
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={9}><EmptyState icon={BookCheck} title={t("aucun_carnet_titre")} body={t("aucun_carnet_body")} /></td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <SectionTitle>{t("carnets_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("carnets_sub")}</div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: C.inkSoft }} />
        <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder={t("rechercher_eleve")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <SectionTitle>{t("formation_en_cours_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(enCours, { actions: true })}

      <SectionTitle>{t("formation_reussies_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(reussies, { dpAction: true })}

      <SectionTitle>{t("formation_ratees_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(ratees)}

      {confirmSuccess && (
        <ConfirmDialog tone="success" title={t("valider_reussite_title")} message={t("valider_reussite_msg", { nom: `${confirmSuccess.prenom} ${confirmSuccess.nom}`, fonction: fonctionLabel(GRADUATION_MAP[confirmSuccess.fonction], lang) })}
          confirmLabel={t("valider_reussite_btn")} onConfirm={() => markSuccess(confirmSuccess)} onCancel={() => setConfirmSuccess(null)} />
      )}
      {confirmFail && (
        <ConfirmDialog tone="danger" title={t("mettre_fin_formation_title")} message={t("mettre_fin_formation_msg", { nom: `${confirmFail.prenom} ${confirmFail.nom}` })}
          confirmLabel={t("mettre_fin_formation_btn")} onConfirm={() => markFail(confirmFail)} onCancel={() => setConfirmFail(null)} />
      )}
      {confirmStartDP && (
        <ConfirmDialog tone="success" title={t("debuter_formation_dp_btn")} message={t("debuter_formation_dp_msg", { nom: `${confirmStartDP.prenom} ${confirmStartDP.nom}` })}
          confirmLabel={t("debuter_formation_dp_btn")} onConfirm={() => startDPTraining(confirmStartDP)} onCancel={() => setConfirmStartDP(null)} />
      )}
    </div>
  );
}
function QuestionPreviewModal({ question: q, categories, onClose }) {
  const { t } = useLang();
  const [lang, setLang] = useState("fr");
  const [answer, setAnswer] = useState(null);

  const handleImageClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    const current = answer || [];
    if (current.length >= (q.cibles || []).length) return;
    setAnswer([...current, { x, y }]);
  };
  const resetPoints = () => setAnswer([]);

  return (
    <Modal title={t("previsualiser_titre")} onClose={onClose} width={640}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 8, padding: 3 }}>
          {["fr", "nl"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: lang === l ? "#fff" : "transparent", color: lang === l ? C.navy : C.inkSoft, fontWeight: 700, fontSize: 12.5, cursor: "pointer", boxShadow: lang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "4px 10px" }}>Question #{q.numero}</span>}
            <CategoryBadges allCategories={categories} cats={q.categories} />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{q.points} pt{q.points > 1 ? "s" : ""}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.navy, lineHeight: 1.4, marginBottom: 20 }}>{qText(q, lang)}</div>

        {q.media?.type === "audio" && <audio controls src={q.media.url} style={{ width: "100%", marginBottom: 20 }} />}
        {q.media?.type === "video" && q.type !== "point" && <video controls src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 20, border: `1px solid ${C.line}` }} />}
        {q.media?.type === "image" && q.type !== "point" && q.type !== "legende" && <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 20, border: `1px solid ${C.line}` }} />}

        {(q.type === "qcm" || q.type === "vrai_faux") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qChoix(q, lang).map((c, ci) => (
              <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${answer === ci ? C.navy : C.line}`, background: answer === ci ? C.bg : "#fff", cursor: "pointer" }}>
                <input type="radio" name={`preview-${q.id}`} checked={answer === ci} onChange={() => setAnswer(ci)} />{c}
              </label>
            ))}
          </div>
        )}
        {q.type === "qcm_multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Plusieurs réponses sont possibles.</div>
            {qChoix(q, lang).map((c, ci) => {
              const selected = Array.isArray(answer) && answer.includes(ci);
              return (
                <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${selected ? C.navy : C.line}`, background: selected ? C.bg : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected} onChange={() => { const cur = Array.isArray(answer) ? answer : []; setAnswer(cur.includes(ci) ? cur.filter(x => x !== ci) : [...cur, ci]); }} />{c}
                </label>
              );
            })}
          </div>
        )}
        {q.type === "ouverte" && <textarea style={{ ...inputStyle, minHeight: 150, resize: "vertical", fontSize: 14 }} placeholder={t("write_answer_placeholder")} value={(answer && answer.text) || ""} onChange={e => setAnswer({ text: e.target.value })} />}
        {q.type === "point" && q.media?.url && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("click_on")} {(q.cibles || []).length} {t("locations")} — {(answer || []).length}/{(q.cibles || []).length} {t("select_count")}{(answer || []).length > 1 ? "s" : ""}</span>
              {(answer || []).length > 0 && <Btn variant="ghost" icon={Undo2} onClick={resetPoints} style={{ padding: "5px 10px", fontSize: 12 }}>{t("reset")}</Btn>}
            </div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
              <img src={q.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
              {(answer || []).map((pt, pi) => (
                <div key={pi} style={{ position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`, width: 22, height: 22, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{pi + 1}</div>
              ))}
            </div>
          </div>
        )}
        {q.type === "legende" && q.media?.url && (
          <div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", marginBottom: 16 }}>
              <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, display: "block" }} />
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 26, height: 26, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{mi + 1}</div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.goldSoft, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{mi + 1}</span>
                  <input style={inputStyle} placeholder={`À quoi correspond le point ${mi + 1} ?`} value={(answer && answer[mi]) || ""} onChange={e => { const cur = Array.isArray(answer) ? [...answer] : Array((q.marqueurs || []).length).fill(""); cur[mi] = e.target.value; setAnswer(cur); }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {q.type === "relier" && <RelierQuestion q={q} value={answer} onChange={setAnswer} />}
        {q.type === "action_reaction" && <ActionReactionPlayer q={q} value={answer} onChange={setAnswer} />}
        {q.type === "ordre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Utilisez les flèches pour remettre ces actions dans le bon ordre.</div>
            {(answer || (q.items || []).map(it => it.id)).map((itemId, i) => {
              const currentOrder = answer || (q.items || []).map(it => it.id);
              const item = (q.items || []).find(it => it.id === itemId);
              const moveOrder = (dir) => {
                const j = i + dir;
                if (j < 0 || j >= currentOrder.length) return;
                const next = [...currentOrder];
                [next[i], next[j]] = [next[j], next[i]];
                setAnswer(next);
              };
              return (
                <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff" }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: C.inkSoft, width: 20 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{item ? itemText(item, lang) : ""}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveOrder(-1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, display: "flex" }}><ChevronUp size={16} /></button>
                    <button onClick={() => moveOrder(1)} disabled={i === currentOrder.length - 1} style={{ background: "none", border: "none", cursor: i === currentOrder.length - 1 ? "default" : "pointer", opacity: i === currentOrder.length - 1 ? 0.3 : 1, display: "flex" }}><ChevronDown size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
function EleveDetailView({ eleve, questionnaires, categories, onBack }) {
  const { t, lang } = useLang();
  const mine = questionnaires.filter(q => q.eleveId === eleve.id && !q.supprime);
  const graded = mine.filter(q => q.statut === "validé");
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const evolution = computeCategoryEvolution(graded, categories);
  const evolutionCats = Object.keys(evolution);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>{initials(eleve.prenom, eleve.nom)}</div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{eleve.prenom} {eleve.nom}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2, fontFamily: FONT_MONO }}>{t("agent_number")} : {eleve.numeroAgent} · {fonctionLabel(eleve.fonction, lang) || t("role_eleve")}</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={onBack}>{t("retour_profils")}</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("stat_qn_attribues")} value={mine.length} />
        <StatCard label={t("qn_valides_label")} value={graded.length} />
        <StatCard label={t("en_attente_encours")} value={mine.length - graded.length} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("points_forts_faibles_global")}</SectionTitle>
        {graded.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("graphique_apres_validation")} /> : (
          <div style={{ height: 280, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("evolution_categorie_titre")}</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 10 }}>{t("evolution_categorie_note")}</div>
        {evolutionCats.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("graphiques_apparaitront")} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {evolutionCats.map(cat => (
              <div key={cat} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColor(categories, cat) }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{cat}</span>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolution[cat]} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.inkSoft }} interval={0} angle={-15} textAnchor="end" height={40} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke={catColor(categories, cat)} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function ProfilModal({ initial, users, isAdmin, onClose, onSave }) {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ nom: initial.nom || "", prenom: initial.prenom || "", numeroAgent: initial.numeroAgent || "", fonction: initial.fonction || "Élève régulateur", langue: initial.langue || "fr", team: initial.team || "", id: initial.id });
  const pseudoPreview = makePseudo(form.nom, form.prenom, users, initial.id) || "—";
  return (
    <Modal title={initial.id ? t("modifier_profil") : t("ajouter_eleve")} onClose={onClose}>
      <Field label={t("prenom_label")}><input style={inputStyle} value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></Field>
      <Field label={t("nom_label")}><input style={inputStyle} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
      <Field label={t("numero_agent_label")}><input style={inputStyle} value={form.numeroAgent} onChange={e => setForm({ ...form, numeroAgent: e.target.value })} /></Field>
      <Field label={t("fonction_label")}><select style={inputStyle} value={form.fonction} onChange={e => setForm({ ...form, fonction: e.target.value })}>{FONCTIONS.map(f => <option key={f} value={f}>{fonctionLabel(f, lang)}</option>)}</select></Field>
      <Field label={t("role_linguistique_label")} hint={t("role_linguistique_hint")}>
        <select style={inputStyle} value={form.langue} onChange={e => setForm({ ...form, langue: e.target.value })}>
          {Object.entries(LANGS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </Field>
      <Field label="Team">
        <select style={inputStyle} value={form.team} onChange={e => setForm({ ...form, team: e.target.value })}>
          <option value="">{t("team_aucune")}</option>
          {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
        </select>
      </Field>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: C.inkSoft, marginBottom: 8 }}>
        {t("identifiant_connexion")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{pseudoPreview}</strong><br />
        {t("mot_de_passe_label")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{form.numeroAgent ? agentPassword(form.numeroAgent) : "—"}</strong> <span>{t("genere_auto")}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="primary" onClick={() => onSave(form)} disabled={!form.nom || !form.prenom || !form.numeroAgent}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}

/* ------------------------- GESTION DES CATÉGORIES ------------------------- */
function CategoryManager({ categories, setCategories, categoryConfig, setCategoryConfig, questions, setQuestions, isAdmin, onRenameCategory }) {
  const { t, lang } = useLang();
  const [newCat, setNewCat] = useState("");
  const [newSeuil, setNewSeuil] = useState(60);
  const [confirmCat, setConfirmCat] = useState(null);
  const [blockedCat, setBlockedCat] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [pendingSeuils, setPendingSeuils] = useState({});
  const [savedFlash, setSavedFlash] = useState({});
  const [pendingFonctions, setPendingFonctions] = useState({});
  const [savedFlashF, setSavedFlashF] = useState({});
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameDuplicate, setRenameDuplicate] = useState(null);
  const [slashError, setSlashError] = useState(false);

  const startRename = (cat) => { setRenamingCat(cat); setRenameValue(cat); };
  const cancelRename = () => { setRenamingCat(null); setRenameValue(""); };
  const confirmRename = () => {
    const v = renameValue.trim();
    if (!v || v === renamingCat) { cancelRename(); return; }
    if (v.includes("/")) { setSlashError(true); return; }
    const match = findCategoryMatch(v, categories.filter(c => c !== renamingCat));
    if (match) { setRenameDuplicate(match); return; }
    const oldName = renamingCat;
    if (onRenameCategory) {
      onRenameCategory(oldName, v);
    } else {
      setCategories(categories.map(c => c === oldName ? v : c));
      const newConfig = { ...categoryConfig };
      newConfig[v] = newConfig[oldName] || { seuil: 60, fonctions: [...FONCTIONS] };
      delete newConfig[oldName];
      setCategoryConfig(newConfig);
      setQuestions(questions.map(q => (q.categories || []).includes(oldName) ? { ...q, categories: q.categories.map(c => c === oldName ? v : c) } : q));
    }
    cancelRename();
  };

  const add = () => {
    const v = newCat.trim();
    if (!v) return;
    if (v.includes("/")) { setSlashError(true); return; }
    const match = findCategoryMatch(v, categories);
    if (match) { setDuplicateMatch(match); return; }
    setCategories([...categories, v]);
    setCategoryConfig({ ...categoryConfig, [v]: { seuil: Number(newSeuil) || 60, fonctions: [...FONCTIONS] } });
    setNewCat(""); setNewSeuil(60);
  };
  const updateConfig = (cat, patch) => setCategoryConfig({ ...categoryConfig, [cat]: { ...(categoryConfig[cat] || { seuil: 60, fonctions: [...FONCTIONS] }), ...patch } });
  const fonctionsValue = (cat) => pendingFonctions[cat] !== undefined ? pendingFonctions[cat] : (categoryConfig[cat]?.fonctions || [...FONCTIONS]);
  const fonctionsDirty = (cat) => {
    if (pendingFonctions[cat] === undefined) return false;
    const saved = categoryConfig[cat]?.fonctions || [...FONCTIONS];
    const p = pendingFonctions[cat];
    return p.length !== saved.length || !p.every(f => saved.includes(f));
  };
  const toggleFonctionPending = (cat, fonction) => {
    const current = fonctionsValue(cat);
    const next = current.includes(fonction) ? current.filter(f => f !== fonction) : [...current, fonction];
    setPendingFonctions(p => ({ ...p, [cat]: next }));
  };
  const confirmFonctions = (cat) => {
    updateConfig(cat, { fonctions: pendingFonctions[cat] });
    setPendingFonctions(p => { const n = { ...p }; delete n[cat]; return n; });
    setSavedFlashF(f => ({ ...f, [cat]: true }));
    setTimeout(() => setSavedFlashF(f => { const n = { ...f }; delete n[cat]; return n; }), 2200);
  };
  const seuilValue = (cat) => pendingSeuils[cat] !== undefined ? pendingSeuils[cat] : (categoryConfig[cat]?.seuil ?? 60);
  const seuilDirty = (cat) => pendingSeuils[cat] !== undefined && pendingSeuils[cat] !== (categoryConfig[cat]?.seuil ?? 60);
  const confirmSeuil = (cat) => {
    updateConfig(cat, { seuil: pendingSeuils[cat] });
    setPendingSeuils(p => { const n = { ...p }; delete n[cat]; return n; });
    setSavedFlash(f => ({ ...f, [cat]: true }));
    setTimeout(() => setSavedFlash(f => { const n = { ...f }; delete n[cat]; return n; }), 2200);
  };
  const requestRemove = (cat) => {
    if (questions.some(q => (q.categories || []).includes(cat))) { setBlockedCat(cat); return; }
    setConfirmCat(cat);
  };
  const doRemove = () => { setCategories(categories.filter(c => c !== confirmCat)); setConfirmCat(null); };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Tag size={15} color={C.inkSoft} /><SectionTitle>{t("categories_titre")}</SectionTitle></div>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_categorie")}</th>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_seuil_reussite")}</th>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_concerne")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map(c => {
            const cfg = categoryConfig[c] || { seuil: 60, fonctions: [...FONCTIONS] };
            return (
              <tr key={c} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  {renamingCat === c ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input autoFocus style={{ ...inputStyle, width: 140, padding: "4px 6px", fontSize: 12.5 }} value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") cancelRename(); }} />
                      <button onClick={confirmRename} title={t("confirmer")} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, display: "flex" }}><CheckCircle2 size={16} /></button>
                      <button onClick={cancelRename} title={t("cancel")} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "flex" }}><X size={16} /></button>
                    </div>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColor(categories, c) }} />
                      {c}
                      {isAdmin && <button onClick={() => startRename(c)} title={t("renommer_categorie")} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "inline-flex", padding: 2 }}><Edit2 size={12} /></button>}
                    </span>
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
                    <input type="number" min={0} max={100} value={seuilValue(c)} onChange={e => setPendingSeuils(p => ({ ...p, [c]: Number(e.target.value) }))} onKeyDown={e => e.key === "Enter" && seuilDirty(c) && confirmSeuil(c)} style={{ ...inputStyle, width: 62, padding: "5px 8px" }} disabled={!isAdmin} /> <span style={{ color: C.inkSoft }}>%</span>
                    {!isAdmin && <Lock size={11} color={C.inkSoft} style={{ marginLeft: 2 }} />}
                    {isAdmin && seuilDirty(c) && <Btn variant="gold" icon={CheckCircle2} onClick={() => confirmSeuil(c)} style={{ padding: "4px 8px", fontSize: 11.5 }}>{t("confirmer")}</Btn>}
                    {isAdmin && !seuilDirty(c) && savedFlash[c] && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.green, fontWeight: 600 }}><CheckCircle2 size={13} /> {t("enregistre")}</span>}
                  </div>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {FONCTIONS.map(f => (
                        <label key={f} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.inkSoft, cursor: isAdmin ? "pointer" : "default" }}>
                          <input type="checkbox" checked={fonctionsValue(c).includes(f)} disabled={!isAdmin} onChange={() => toggleFonctionPending(c, f)} /> {fonctionLabel(f, lang)}
                        </label>
                      ))}
                      {!isAdmin && <Lock size={11} color={C.inkSoft} />}
                    </div>
                    {isAdmin && fonctionsDirty(c) && <Btn variant="gold" icon={CheckCircle2} onClick={() => confirmFonctions(c)} style={{ padding: "4px 8px", fontSize: 11.5, alignSelf: "flex-start" }}>{t("confirmer")}</Btn>}
                    {isAdmin && !fonctionsDirty(c) && savedFlashF[c] && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.green, fontWeight: 600 }}><CheckCircle2 size={13} /> {t("enregistre")}</span>}
                  </div>
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  {isAdmin && <button onClick={() => requestRemove(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "inline-flex", padding: 3 }}><X size={13} /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: 180 }} placeholder={t("nouvelle_categorie_placeholder")} value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="number" min={0} max={100} style={{ ...inputStyle, width: 62, padding: "8px" }} value={newSeuil} onChange={e => setNewSeuil(e.target.value)} /><span style={{ fontSize: 12, color: C.inkSoft }}>{t("pct_reussite")}</span></div>
        <Btn variant="ghost" icon={Plus} onClick={add}>{t("add")}</Btn>
      </div>
      {confirmCat && (
        <ConfirmDialog title={t("supprimer_categorie_titre")} message={t("supprimer_categorie_msg", { cat: confirmCat })} onConfirm={doRemove} onCancel={() => setConfirmCat(null)} />
      )}
      {blockedCat && (
        <InfoDialog title={t("suppression_impossible_titre")} message={t("suppression_impossible_msg", { cat: blockedCat })} onClose={() => setBlockedCat(null)} />
      )}
      {duplicateMatch && (
        <InfoDialog title={t("categorie_existante_titre")} message={t("categorie_existante_msg", { cat: duplicateMatch })} onClose={() => setDuplicateMatch(null)} />
      )}
      {renameDuplicate && (
        <InfoDialog title={t("categorie_existante_titre")} message={t("categorie_existante_msg", { cat: renameDuplicate })} onClose={() => setRenameDuplicate(null)} />
      )}
      {slashError && (
        <InfoDialog title={t("caractere_interdit_titre")} message={t("caractere_interdit_msg")} onClose={() => setSlashError(false)} />
      )}
    </div>
  );
}

/* ------------------------- GESTION QUESTIONS ------------------------- */
const IMPORT_LETTER_TO_IDX = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
function importTokenToIdx(token) {
  const t = (token || "").trim().toUpperCase();
  if (/^[A-F]$/.test(t)) return IMPORT_LETTER_TO_IDX[t];
  if (/^[1-6]$/.test(t)) return Number(t) - 1;
  return undefined;
}
function splitImportTokens(raw) {
  return (raw || "").split(/[;,/\s]+/).map(s => s.trim()).filter(Boolean);
}
function detectImportType(typeRaw) {
  const norm = stripAccents(typeRaw || "").toLowerCase().replace(/\s+/g, "").trim();
  if (norm.includes("multi") || norm.includes("plusieursreponses") || norm.includes("choixmultiple")) return "qcm_multi";
  if (norm.includes("qcm") || norm.includes("choix")) return "qcm";
  if (norm.includes("vrai") || norm.includes("faux") || norm === "vf") return "vrai_faux";
  if (norm.includes("ouvert") || norm.includes("libre") || norm.includes("texte")) return "ouverte";
  if (norm.includes("ordre") || norm.includes("sequence") || norm.includes("classement") || norm.includes("classer")) return "ordre";
  return null;
}

function resolveOoxmlPath(basePath, target) {
  if (target.startsWith("/")) return target.slice(1);
  const baseDir = basePath.substring(0, basePath.lastIndexOf("/"));
  const parts = (baseDir + "/" + target).split("/");
  const resolved = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part === "." || part === "") continue;
    else resolved.push(part);
  }
  return resolved.join("/");
}
async function unzipXlsx(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return null;
  const centralDirCount = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const entries = {};
  let offset = centralDirOffset;
  for (let i = 0; i < centralDirCount; i++) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x02014b50) break;
    const compMethod = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLen));
    entries[name] = { compMethod, compSize, localHeaderOffset };
    offset += 46 + nameLen + extraLen + commentLen;
  }
  async function readEntry(name) {
    const info = entries[name];
    if (!info) return null;
    const lh = info.localHeaderOffset;
    const lhNameLen = view.getUint16(lh + 26, true);
    const lhExtraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + lhNameLen + lhExtraLen;
    const compressedData = bytes.slice(dataStart, dataStart + info.compSize);
    if (info.compMethod === 0) return compressedData;
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([compressedData]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }
  async function readEntryText(name) { const b = await readEntry(name); return b ? new TextDecoder().decode(b) : null; }
  return { entries, readEntry, readEntryText };
}
function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(binary);
}
const OOXML_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
async function resolveSheetPath(zip, sheetName, parser) {
  const workbookXml = await zip.readEntryText("xl/workbook.xml");
  const workbookRelsXml = await zip.readEntryText("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !workbookRelsXml) return null;
  const wbDoc = parser.parseFromString(workbookXml, "application/xml");
  const relsDoc = parser.parseFromString(workbookRelsXml, "application/xml");
  const sheetEls = Array.from(wbDoc.getElementsByTagNameNS("*", "sheet"));
  const sheetEl = sheetEls.find(s => s.getAttribute("name") === sheetName) || sheetEls[0];
  if (!sheetEl) return null;
  const rId = sheetEl.getAttributeNS(OOXML_REL_NS, "id") || sheetEl.getAttribute("r:id");
  const sheetRel = Array.from(relsDoc.getElementsByTagNameNS("*", "Relationship")).find(r => r.getAttribute("Id") === rId);
  if (!sheetRel) return null;
  return resolveOoxmlPath("xl/workbook.xml", sheetRel.getAttribute("Target"));
}

// Méthode 1 : images "flottantes" classiques (insérées et ancrées sur une cellule)
async function extractDrawingImages(zip, sheetPath, parser) {
  const result = {};
  try {
    const sheetDir = sheetPath.substring(0, sheetPath.lastIndexOf("/"));
    const sheetFile = sheetPath.substring(sheetPath.lastIndexOf("/") + 1);
    const sheetRelsXml = await zip.readEntryText(`${sheetDir}/_rels/${sheetFile}.rels`);
    if (!sheetRelsXml) return result;
    const sheetRelsDoc = parser.parseFromString(sheetRelsXml, "application/xml");
    const drawingRel = Array.from(sheetRelsDoc.getElementsByTagNameNS("*", "Relationship")).find(r => (r.getAttribute("Type") || "").includes("drawing"));
    if (!drawingRel) return result;
    const drawingPath = resolveOoxmlPath(sheetPath, drawingRel.getAttribute("Target"));

    const drawingXml = await zip.readEntryText(drawingPath);
    if (!drawingXml) return result;
    const drawingDoc = parser.parseFromString(drawingXml, "application/xml");
    const drawingDir = drawingPath.substring(0, drawingPath.lastIndexOf("/"));
    const drawingFile = drawingPath.substring(drawingPath.lastIndexOf("/") + 1);
    const drawingRelsXml = await zip.readEntryText(`${drawingDir}/_rels/${drawingFile}.rels`);
    const drawingRelEls = drawingRelsXml ? Array.from(parser.parseFromString(drawingRelsXml, "application/xml").getElementsByTagNameNS("*", "Relationship")) : [];

    const anchors = [
      ...Array.from(drawingDoc.getElementsByTagNameNS("*", "oneCellAnchor")),
      ...Array.from(drawingDoc.getElementsByTagNameNS("*", "twoCellAnchor")),
    ];
    for (const anchor of anchors) {
      const fromEl = anchor.getElementsByTagNameNS("*", "from")[0];
      const rowEl = fromEl && fromEl.getElementsByTagNameNS("*", "row")[0];
      if (!rowEl) continue;
      const row = parseInt(rowEl.textContent, 10); // 0-based
      const blipEl = anchor.getElementsByTagNameNS("*", "blip")[0];
      if (!blipEl) continue;
      const rEmbed = blipEl.getAttributeNS(OOXML_REL_NS, "embed") || blipEl.getAttribute("r:embed");
      const rel = drawingRelEls.find(r => r.getAttribute("Id") === rEmbed);
      if (!rel) continue;
      const mediaPath = resolveOoxmlPath(drawingPath, rel.getAttribute("Target"));
      const mediaBytes = await zip.readEntry(mediaPath);
      if (!mediaBytes) continue;
      const ext = mediaPath.split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "bmp" ? "image/bmp" : "image/jpeg";
      result[row] = { type: "image", url: `data:${mime};base64,${bytesToBase64(mediaBytes)}`, name: `image_ligne_${row + 1}.${ext}` };
    }
  } catch (e) { /* on continue avec ce qu'on a */ }
  return result;
}

// Méthode 2 : "Image dans la cellule" (fonctionnalité récente d'Excel, stockée en Rich Value)
async function extractRichValueCellImages(zip, sheetPath, parser) {
  const result = {};
  try {
    const metadataXml = await zip.readEntryText("xl/metadata.xml");
    const richValueXml = await zip.readEntryText("xl/richData/rdrichvalue.xml");
    const richValueRelXml = await zip.readEntryText("xl/richData/richValueRel.xml");
    const richValueRelRelsXml = await zip.readEntryText("xl/richData/_rels/richValueRel.xml.rels");
    const sheetXml = await zip.readEntryText(sheetPath);
    if (!metadataXml || !richValueXml || !richValueRelXml || !richValueRelRelsXml || !sheetXml) return result;

    // vm (1-based, sur la cellule) -> index dans futureMetadata -> index dans rdrichvalue
    const metaDoc = parser.parseFromString(metadataXml, "application/xml");
    const valueMetaBks = Array.from(metaDoc.getElementsByTagNameNS("*", "valueMetadata")).flatMap(vm => Array.from(vm.getElementsByTagNameNS("*", "bk")));
    const vmToFutureIdx = valueMetaBks.map(bk => { const rc = bk.getElementsByTagNameNS("*", "rc")[0]; return rc ? parseInt(rc.getAttribute("v"), 10) : null; });
    const futureMetaBks = Array.from(metaDoc.getElementsByTagNameNS("*", "futureMetadata")).flatMap(fm => Array.from(fm.getElementsByTagNameNS("*", "bk")));
    const rvbIndices = futureMetaBks.map(bk => { const rvb = bk.getElementsByTagNameNS("*", "rvb")[0]; return rvb ? parseInt(rvb.getAttribute("i"), 10) : null; });

    // index rdrichvalue -> index richValueRel (1er <v> de chaque <rv>)
    const rvDoc = parser.parseFromString(richValueXml, "application/xml");
    const relIndices = Array.from(rvDoc.getElementsByTagNameNS("*", "rv")).map(rv => {
      const v0 = rv.getElementsByTagNameNS("*", "v")[0];
      return v0 ? parseInt(v0.textContent, 10) : null;
    });

    // index richValueRel -> rId -> Target (chemin du fichier média)
    const rvrDoc = parser.parseFromString(richValueRelXml, "application/xml");
    const relIds = Array.from(rvrDoc.getElementsByTagNameNS("*", "rel")).map(rel => rel.getAttributeNS(OOXML_REL_NS, "id") || rel.getAttribute("r:id"));
    const rvrRelsDoc = parser.parseFromString(richValueRelRelsXml, "application/xml");
    const relIdToTarget = {};
    Array.from(rvrRelsDoc.getElementsByTagNameNS("*", "Relationship")).forEach(r => { relIdToTarget[r.getAttribute("Id")] = r.getAttribute("Target"); });

    // Cellules de la feuille portant un attribut vm
    const sheetDoc = parser.parseFromString(sheetXml, "application/xml");
    const cells = Array.from(sheetDoc.getElementsByTagNameNS("*", "c")).filter(c => c.getAttribute("vm"));

    for (const c of cells) {
      const ref = c.getAttribute("r"); // ex. "U8"
      const m = /^[A-Z]+(\d+)$/.exec(ref || "");
      if (!m) continue;
      const excelRow1Based = parseInt(m[1], 10);
      const row0Based = excelRow1Based - 1;

      const vm = parseInt(c.getAttribute("vm"), 10);
      const futureIdx = vmToFutureIdx[vm - 1];
      if (futureIdx === undefined || futureIdx === null) continue;
      const rvIndex = rvbIndices[futureIdx];
      if (rvIndex === undefined || rvIndex === null) continue;
      const relIdx = relIndices[rvIndex];
      if (relIdx === undefined || relIdx === null) continue;
      const relId = relIds[relIdx];
      if (!relId) continue;
      const target = relIdToTarget[relId];
      if (!target) continue;

      const mediaPath = resolveOoxmlPath("xl/richData/richValueRel.xml", target);
      const mediaBytes = await zip.readEntry(mediaPath);
      if (!mediaBytes) continue;
      const ext = mediaPath.split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "bmp" ? "image/bmp" : "image/jpeg";
      result[row0Based] = { type: "image", url: `data:${mime};base64,${bytesToBase64(mediaBytes)}`, name: `image_ligne_${row0Based + 1}.${ext}` };
    }
  } catch (e) { /* on continue avec ce qu'on a */ }
  return result;
}

async function extractRowImages(zip, sheetName) {
  const parser = new DOMParser();
  const sheetPath = await resolveSheetPath(zip, sheetName, parser);
  if (!sheetPath) return {};
  const [fromDrawings, fromCells] = await Promise.all([
    extractDrawingImages(zip, sheetPath, parser),
    extractRichValueCellImages(zip, sheetPath, parser),
  ]);
  return { ...fromDrawings, ...fromCells };
}

const IMPORT_ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function parseImportPair(frRow, nlRow, categories, media) {
  const getFr = (key) => (frRow && frRow[key] !== undefined && frRow[key] !== null ? String(frRow[key]).trim() : "");
  const getNl = (key) => (nlRow && nlRow[key] !== undefined && nlRow[key] !== null ? String(nlRow[key]).trim() : "");

  const typeRaw = getFr("Type");
  const enonceFr = getFr("Question");
  const enonceNl = getNl("Question");
  const catsRaw = getFr("Catégories");
  const numRaw = getFr("N°");
  if (!typeRaw && !enonceFr && !enonceNl && !catsRaw) return { isEmpty: true };

  const errors = [];

  const langFr = getFr("Langue").toUpperCase();
  const langNl = getNl("Langue").toUpperCase();
  if (langFr && langFr !== "FR") errors.push(`Ligne « FR » attendue en premier de la paire, colonne Langue = « ${langFr} » — vérifiez l'alignement des paires de lignes.`);
  if (nlRow && langNl && langNl !== "NL") errors.push(`Ligne « NL » attendue en second de la paire, colonne Langue = « ${langNl} » — vérifiez l'alignement des paires de lignes.`);
  else if (!nlRow) errors.push("Ligne NL manquante pour cette question (les questions vont par paire de 2 lignes).");

  const type = detectImportType(typeRaw);
  if (!type) errors.push(`Type inconnu : « ${typeRaw || "(vide)"} »`);
  if (!enonceFr) errors.push("Question (FR) manquante");
  if (!enonceNl) errors.push("Question (NL) manquante");

  const catsRawList = catsRaw ? catsRaw.split(";").map(c => c.trim()).filter(Boolean) : [];
  if (!catsRawList.length) errors.push("Catégorie manquante");
  const cats = catsRawList.map(c => findCategoryMatch(c, categories) || c);
  const unknownCats = catsRawList.filter(c => !findCategoryMatch(c, categories));

  const rawChoixFr = IMPORT_ANSWER_LETTERS.map(l => getFr(`Réponse ${l}`));
  const rawChoixNl = IMPORT_ANSWER_LETTERS.map(l => getNl(`Réponse ${l}`));
  const filledCount = rawChoixFr.filter(c => c.trim()).length;
  const choixFr = rawChoixFr.slice(0, filledCount);
  const choixNl = rawChoixNl.slice(0, filledCount);

  const cotationRaw = getFr("Cotation").replace(",", ".");
  const cotation = cotationRaw ? Number(cotationRaw) : null;
  const ppbrRaw = getFr("Points par bonne réponse").replace(",", ".");
  const ppbr = ppbrRaw ? Number(ppbrRaw) : null;
  const bonnesRaw = getFr("Bonne(s) réponse(s)");
  const reference = getFr("Référence");
  const reponseAttendue = getFr("Réponse attendue");

  let question = null;
  if (type === "qcm") {
    if (choixFr.length < 2) errors.push("Il faut au moins 2 réponses pour un QCM");
    if (choixNl.some(c => !c.trim())) errors.push("Traduction NL manquante pour une ou plusieurs réponses");
    const idx = importTokenToIdx(bonnesRaw);
    if (idx === undefined || idx >= choixFr.length) errors.push(`Bonne réponse invalide : « ${bonnesRaw || "(vide)"} »`);
    if (!cotation || cotation <= 0) errors.push("Cotation manquante ou invalide");
    if (!errors.length) question = { type, categories: cats, enonceFr, enonceNl, points: cotation, media: media || null, choixFr, choixNl, bonneReponse: idx, reference };
  } else if (type === "qcm_multi") {
    if (choixFr.length < 2) errors.push("Il faut au moins 2 réponses pour un QCM multiple");
    if (choixNl.some(c => !c.trim())) errors.push("Traduction NL manquante pour une ou plusieurs réponses");
    const tokens = splitImportTokens(bonnesRaw);
    const idxs = tokens.map(importTokenToIdx);
    if (!tokens.length || idxs.some(i => i === undefined || i >= choixFr.length)) errors.push(`Bonne(s) réponse(s) invalide(s) : « ${bonnesRaw || "(vide)"} »`);
    if (!ppbr || ppbr <= 0) errors.push("« Points par bonne réponse » manquant ou invalide");
    if (!errors.length) question = { type, categories: cats, enonceFr, enonceNl, points: ppbr * idxs.length, pointsParBonneReponse: ppbr, media: media || null, choixFr, choixNl, bonnesReponses: idxs, reference };
  } else if (type === "vrai_faux") {
    const v = stripAccents(bonnesRaw).toLowerCase().trim();
    if (v !== "vrai" && v !== "faux") errors.push(`« Vrai » ou « Faux » attendu, reçu : « ${bonnesRaw || "(vide)"} »`);
    if (!cotation || cotation <= 0) errors.push("Cotation manquante ou invalide");
    if (!errors.length) question = { type, categories: cats, enonceFr, enonceNl, points: cotation, media: media || null, choixFr: ["Vrai", "Faux"], choixNl: ["Waar", "Onwaar"], bonneReponse: v === "vrai" ? 0 : 1, reference };
  } else if (type === "ouverte") {
    if (!cotation || cotation <= 0) errors.push("Cotation manquante ou invalide");
    if (!errors.length) question = { type, categories: cats, enonceFr, enonceNl, points: cotation, media: media || null, reponseAttendue, reference };
  } else if (type === "ordre") {
    if (choixFr.length < 2) errors.push("Il faut au moins 2 actions pour un Ordre");
    if (choixNl.some(c => !c.trim())) errors.push("Traduction NL manquante pour une ou plusieurs actions");
    if (!ppbr || ppbr <= 0) errors.push("« Points par bonne réponse » manquant ou invalide");
    if (!errors.length) {
      const items = choixFr.map((texteFr, i) => ({ id: genId("it"), texteFr, texteNl: choixNl[i] }));
      question = { type, categories: cats, enonceFr, enonceNl, points: ppbr * items.length, pointsParBonneReponse: ppbr, media: media || null, items, reference };
    }
  }
  return { isEmpty: false, errors, unknownCats, question, preview: { num: numRaw, typeRaw, enonceFr, cats, hasImage: !!media } };
}

function ImportQuestions({ categories, onImport, onClose }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setResult(null); setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.includes("Questions") ? "Questions" : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "", blankrows: true });

      let rowImages = {};
      try {
        const zip = await unzipXlsx(buf.slice(0));
        if (zip) rowImages = await extractRowImages(zip, sheetName);
      } catch (e3) { /* pas grave : l'import continue simplement sans les images */ }

      // Les questions vont par paire de 2 lignes consécutives : la première
      // ligne (FR) puis la seconde (NL) construisent ENSEMBLE une seule question.
      const parsed = [];
      for (let i = 0; i < data.length; i += 2) {
        const frRow = data[i];
        const nlRow = data[i + 1];
        const frSheetRow = range.s.r + 1 + i;
        const media = rowImages[frSheetRow] || rowImages[frSheetRow + 1] || null;
        const result = parseImportPair(frRow, nlRow, categories, media);
        if (!result.isEmpty) parsed.push(result);
      }
      setRows(parsed);
    } catch (e2) { setError("Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un .xlsx basé sur le modèle fourni."); }
  };

  const isRowValid = (r) => !!r.question && !(r.unknownCats || []).length;
  const valid = rows ? rows.filter(isRowValid) : [];
  const invalid = rows ? rows.filter(r => !isRowValid(r)) : [];

  const [busy, setBusy] = useState(false);
  const confirmImport = async () => {
    setBusy(true); setError("");
    try {
      await onImport(valid.map(r => r.question));
      setResult({ count: valid.length });
      setRows(null);
    } catch (e2) { setError(e2.message || "Erreur lors de l'import."); }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>Importer des questions depuis Excel</div>
        <Btn variant="ghost" icon={X} onClick={onClose}>Fermer</Btn>
      </div>

      {result ? (
        <div style={{ background: C.greenSoft, borderRadius: 14, padding: 24, textAlign: "center" }}>
          <CheckCircle2 size={28} color={C.green} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginTop: 10 }}>{result.count} question{result.count > 1 ? "s" : ""} importée{result.count > 1 ? "s" : ""} avec succès</div>
          <Btn variant="primary" onClick={onClose} style={{ marginTop: 16 }}>Retour à la banque de questions</Btn>
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, maxWidth: 900 }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Choisissez un fichier .xlsx basé sur le modèle fourni. Chaque question occupe deux lignes consécutives (Français puis Nederlands). Types pris en charge : QCM, QCM Multiple, Vrai-Faux, Ouverte, Ordre — les catégories doivent déjà exister sur le site (l'orthographe n'a pas besoin d'être identique au caractère près).
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", border: `1.5px dashed ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            <Upload size={15} /> {fileName || "Choisir un fichier .xlsx"}
            <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
          </label>
          {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>{error}</div>}

          {rows && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <Badge color={C.green} bg={C.greenSoft}><CheckCircle2 size={11} /> {valid.length} valide{valid.length > 1 ? "s" : ""}</Badge>
                {invalid.length > 0 && <Badge color={C.red} bg={C.redSoft}><XCircle size={11} /> {invalid.length} en erreur</Badge>}
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr style={{ background: C.bg, textAlign: "left" }}><th style={{ padding: "8px 10px" }}>N°</th><th style={{ padding: "8px 10px" }}>Question (FR)</th><th style={{ padding: "8px 10px" }}>Catégories</th><th style={{ padding: "8px 10px" }}>Statut</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: "8px 10px", fontFamily: FONT_MONO, color: C.inkSoft }}>{r.preview?.num || i + 1}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 320 }}>{r.preview?.enonceFr || "—"} {r.preview?.hasImage && <ImageIcon size={11} color={C.teal} style={{ verticalAlign: -1, marginLeft: 4 }} />}</td>
                        <td style={{ padding: "8px 10px", color: C.inkSoft }}>{(r.preview?.cats || []).join(", ")}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {isRowValid(r) ? <span style={{ color: C.green, fontWeight: 600 }}>OK</span> : r.question ? <span style={{ color: C.red }}>Catégorie(s) inconnue(s) : {(r.unknownCats || []).join(", ")}</span> : <span style={{ color: C.red }}>{r.errors.join(" · ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Btn variant="primary" icon={BadgeCheck} onClick={confirmImport} disabled={!valid.length || busy}>
                {busy ? "Import en cours..." : `Importer ${valid.length} question${valid.length > 1 ? "s" : ""} valide${valid.length > 1 ? "s" : ""}`}
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}
function GestionQuestions({ questions, setQuestions, categories, setCategories, categoryConfig, setCategoryConfig, isAdmin, onImportQuestions, onRenameCategory, questionnaires }) {
  const { lang, t } = useLang();
  const questionStats = useMemo(() => {
    const stats = {};
    const validated = (questionnaires || []).filter(qn => qn.statut === "validé" && !qn.supprime);
    for (const qn of validated) {
      (qn.questionIds || []).forEach((qid, i) => {
        if (!stats[qid]) stats[qid] = { posed: 0, correct: 0 };
        stats[qid].posed += 1;
        const q = questions.find(qq => qq.id === qid);
        if (q && isFullyCorrect(q, (qn.reponses || [])[i])) stats[qid].correct += 1;
      });
    }
    return stats;
  }, [questionnaires, questions]);
  const [modal, setModal] = useState(null);
  const [contentLang, setContentLang] = useState(lang);
  const [filter, setFilter] = useState("Toutes");
  const [search, setSearch] = useState("");
  const [confirmQId, setConfirmQId] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [transferTarget, setTransferTarget] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());
  const doTransfer = () => {
    if (!transferTarget) return;
    setQuestions(questions.map(q => selected.has(q.id) ? { ...q, categories: [transferTarget] } : q));
    setShowTransfer(false); setTransferTarget(""); clearSelection();
  };
  const doBulkDelete = () => {
    setQuestions(questions.filter(q => !selected.has(q.id)));
    setConfirmBulkDelete(false); clearSelection();
  };
  const save = (data) => { if (data.id) setQuestions(questions.map(q => q.id === data.id ? data : q)); else setQuestions([...questions, { ...data, id: genId("q"), numero: null }]); setModal(null); };
  const remove = (id) => setQuestions(questions.filter(q => q.id !== id));
  const byCategory = filter === "EnSuspens"
    ? questions.filter(q => q.statut === "suspendue")
    : filter === "Toutes"
    ? questions.filter(q => q.statut !== "suspendue")
    : questions.filter(q => q.statut !== "suspendue" && (q.categories || []).includes(filter));
  const suspendedCount = questions.filter(q => q.statut === "suspendue").length;
  const searchNorm = normalizeText(search);
  const filtered = !searchNorm ? byCategory : byCategory.filter(q =>
    String(q.numero || "").includes(search.trim())
    || normalizeText(q.enonceFr || q.enonce || "").includes(searchNorm)
    || normalizeText(q.enonceNl || "").includes(searchNorm)
  );

  if (modal !== null) {
    return <QuestionEditor initial={modal} categories={categories} onClose={() => setModal(null)} onSave={save} />;
  }
  if (importing) {
    return <ImportQuestions categories={categories} onImport={onImportQuestions} onClose={() => setImporting(false)} />;
  }

  return (
    <div>
      <CategoryManager categories={categories} setCategories={setCategories} categoryConfig={categoryConfig} setCategoryConfig={setCategoryConfig} questions={questions} setQuestions={setQuestions} isAdmin={isAdmin} onRenameCategory={onRenameCategory} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{t("nav_questions")}</SectionTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3, background: C.bg, borderRadius: 8, padding: 3, marginRight: 4 }}>
            {["fr", "nl"].map(l => (
              <button key={l} onClick={() => setContentLang(l)} style={{ padding: "5px 11px", borderRadius: 6, border: "none", background: contentLang === l ? "#fff" : "transparent", color: contentLang === l ? C.navy : C.inkSoft, fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: contentLang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{l.toUpperCase()}</button>
            ))}
          </div>
          <a href="/gec-modele-import-questions.xlsx" download style={{ textDecoration: "none" }}>
            <Btn variant="ghost" icon={FileDown}>{t("telecharger_modele")}</Btn>
          </a>
          <Btn variant="ghost" icon={Upload} onClick={() => setImporting(true)} disabled={categories.length === 0}>{t("importer_excel")}</Btn>
          <Btn variant="primary" icon={Plus} onClick={() => setModal({})} disabled={categories.length === 0}>{t("ajouter_question")}</Btn>
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: C.inkSoft }} />
        <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder={t("rechercher_question")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t("questions_selectionnees", { n: selected.size })}</span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <Btn variant="ghost" icon={Shuffle} onClick={() => setShowTransfer(true)}>{t("transferer_btn")}</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => setConfirmBulkDelete(true)}>{t("supprimer_btn")}</Btn>
            <Btn variant="ghost" icon={X} onClick={clearSelection}>{t("annuler_selection")}</Btn>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["Toutes", ...categories].map(cat => {
          const count = cat === "Toutes" ? questions.filter(q => q.statut !== "suspendue").length : questions.filter(q => q.statut !== "suspendue" && (q.categories || []).includes(cat)).length;
          return <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${filter === cat ? C.navy : C.line}`, background: filter === cat ? C.navy : "#fff", color: filter === cat ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{cat === "Toutes" ? t("toutes_categories") : cat} ({count})</button>;
        })}
        {suspendedCount > 0 && (
          <button onClick={() => setFilter("EnSuspens")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 20, border: `1px solid ${filter === "EnSuspens" ? C.gold : C.line}`, background: filter === "EnSuspens" ? C.goldSoft : "#fff", color: filter === "EnSuspens" ? C.gold : C.inkSoft, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}><PauseCircle size={13} /> En suspens ({suspendedCount})</button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(q => (
          <div key={q.id} style={{ background: "#fff", border: `1px solid ${selected.has(q.id) ? C.gold : C.line}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flex: 1 }}>
                <button onClick={() => toggleSelect(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(q.id) ? C.gold : C.inkSoft, display: "flex", flexShrink: 0, marginTop: 2 }}>{selected.has(q.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button>
                <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 700, color: C.inkSoft, background: C.bg, borderRadius: 6, padding: "3px 8px" }}>#{q.numero}</span>}
                  {q.statut === "suspendue" && <Badge color={C.gold} bg={C.goldSoft}><PauseCircle size={11} /> En suspens</Badge>}
                  <CategoryBadges allCategories={categories} cats={q.categories} />
                  <TypeBadge type={q.type} />
                  <Badge color={C.navy} bg={C.bg}><Hash size={10} />{q.points} {t("points_short")}{q.points > 1 ? "s" : ""}</Badge>
                  {q.media && <Badge color={C.teal} bg={C.tealSoft}>{q.media.type === "image" ? t("media_image") : q.media.type === "video" ? t("media_video") : t("media_audio")} {t("media_jointe")}</Badge>}
                  {!!q.dureeSecondes && <Badge color={C.gold} bg={C.goldSoft}><Timer size={10} />{Math.floor(q.dureeSecondes / 60)}:{String(q.dureeSecondes % 60).padStart(2, "0")}</Badge>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: qText(q, contentLang).trim() ? C.navy : C.inkSoft, fontStyle: qText(q, contentLang).trim() ? "normal" : "italic", marginTop: 8 }}>{qText(q, contentLang).trim() || "Brouillon sans énoncé pour l'instant"}</div>
                {q.statut === "suspendue" && q.remarqueSuspension && <div style={{ fontSize: 12, color: C.gold, marginTop: 6, display: "flex", alignItems: "flex-start", gap: 5 }}><MessageSquare size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {q.remarqueSuspension}</div>}
                {(q.type === "qcm" || q.type === "vrai_faux") && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {qChoix(q, contentLang).map((c, i) => <span key={i} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, background: i === q.bonneReponse ? C.greenSoft : C.bg, color: i === q.bonneReponse ? C.green : C.inkSoft, fontWeight: i === q.bonneReponse ? 600 : 400 }}>{i === q.bonneReponse && <CheckCircle2 size={11} style={{ marginRight: 4, verticalAlign: -1 }} />}{c}</span>)}
                  </div>
                )}
                {q.type === "qcm_multi" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {qChoix(q, contentLang).map((c, i) => { const ok = (q.bonnesReponses || []).includes(i); return <span key={i} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, background: ok ? C.greenSoft : C.bg, color: ok ? C.green : C.inkSoft, fontWeight: ok ? 600 : 400 }}>{ok && <CheckCircle2 size={11} style={{ marginRight: 4, verticalAlign: -1 }} />}{c}</span>; })}
                  </div>
                )}
                {q.type === "ouverte" && q.reponseAttendue && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8, fontStyle: "italic" }}>{t("element_reponse_attendu")}{q.reponseAttendue}</div>}
                {q.type === "point" && q.media && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>{t("zones_cibles", { n: (q.cibles || []).length })}</div>}
                {q.type === "legende" && q.media && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>{t("points_legender", { n: (q.marqueurs || []).length })}</div>}
                {q.type === "relier" && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>{t("paires_relier", { n: (q.paires || []).length })}</div>}
                {q.type === "action_reaction" && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>{t("scenario_choix", { n: countTreeResults(q.arbre) })}</div>}
                {q.type === "ordre" && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 8 }}>{t("actions_ordre", { n: (q.items || []).length })}{(q.items || []).map(it => itemText(it, contentLang)).join(" → ")}</div>}
                {q.reference && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}><Tag size={11} /> {t("reference_label")}{q.reference}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {q.statut !== "suspendue" && (
                  <span title={t("posed_correct_title")} style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 600, color: C.inkSoft, background: C.bg, borderRadius: 6, padding: "6px 10px" }}>
                    {questionStats[q.id] ? `${questionStats[q.id].posed}/${questionStats[q.id].correct}` : "—"}
                  </span>
                )}
                <Btn variant="subtle" icon={Eye} onClick={() => setPreviewing(q)} style={{ padding: "6px 10px" }} />
                <Btn variant="subtle" icon={Edit2} onClick={() => setModal(q)} style={{ padding: "6px 10px" }} />
                <Btn variant="danger" icon={Trash2} onClick={() => setConfirmQId(q.id)} style={{ padding: "6px 10px" }} />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState icon={HelpCircle} title={t("aucune_question_titre")} body={t("aucune_question_body")} />}
      </div>
      {confirmQId && (
        <ConfirmDialog title={t("supprimer_question_titre")} message={t("supprimer_question_msg")} onConfirm={() => { remove(confirmQId); setConfirmQId(null); }} onCancel={() => setConfirmQId(null)} />
      )}
      {showTransfer && (
        <Modal title={t("transferer_titre", { n: selected.size })} onClose={() => { setShowTransfer(false); setTransferTarget(""); }}>
          <Field label={t("categorie_cible_label")}>
            <select style={inputStyle} value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
              <option value="">{t("choisir_categorie")}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>{t("transferer_hint")}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => { setShowTransfer(false); setTransferTarget(""); }}>{t("cancel")}</Btn>
            <Btn variant="primary" onClick={doTransfer} disabled={!transferTarget}>{t("transferer_btn")}</Btn>
          </div>
        </Modal>
      )}
      {confirmBulkDelete && (
        <ConfirmDialog title={t("supprimer_questions_titre")} message={t("supprimer_questions_msg", { n: selected.size })} onConfirm={doBulkDelete} onCancel={() => setConfirmBulkDelete(false)} />
      )}
      {previewing && <QuestionPreviewModal question={previewing} categories={categories} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
function ActionReactionNode({ node, onUpdate, onDelete, isRoot }) {
  const addActionChild = () => onUpdate({ ...node, enfants: [...(node.enfants || []), { id: genId("ar"), type: "action", texte: "", enfants: [] }] });
  const addTypedChild = (type) => onUpdate({ ...node, enfants: [{ id: genId("ar"), type, texte: "", pourcentage: type === "resultat" ? 50 : undefined, enfants: [] }] });
  const updateChild = (idx, child) => { const enfants = [...node.enfants]; enfants[idx] = child; onUpdate({ ...node, enfants }); };
  const deleteChild = (idx) => onUpdate({ ...node, enfants: node.enfants.filter((_, i) => i !== idx) });
  const color = AR_COLOR[node.type];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "fit-content" }}>
      <div style={{ position: "relative", background: "#fff", border: `2px solid ${color}`, borderRadius: 10, padding: "10px 12px", width: 210, flexShrink: 0 }}>
        {!isRoot && (
          <button onClick={onDelete} title="Supprimer cette branche" style={{ position: "absolute", top: -9, right: -9, width: 20, height: 20, borderRadius: "50%", background: C.red, color: "#fff", border: "2px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={11} /></button>
        )}
        <div style={{ fontSize: 10.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 5 }}>{AR_LABEL[node.type]}</div>
        <textarea
          value={node.texte}
          onChange={e => onUpdate({ ...node, texte: e.target.value })}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          placeholder={node.type === "evenement" ? "Décrivez la situation..." : node.type === "action" ? "Décrivez l'action choisie..." : "Décrivez le résultat final..."}
          style={{ ...inputStyle, minHeight: 54, fontSize: 12.5, resize: "none", padding: "6px 8px", overflow: "hidden" }}
        />
        {node.type === "resultat" && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="number" min={0} max={100} value={node.pourcentage ?? 0} onChange={e => onUpdate({ ...node, pourcentage: Math.max(0, Math.min(100, Number(e.target.value))) })} style={{ ...inputStyle, width: 60, padding: "5px 8px" }} />
            <span style={{ fontSize: 12, color: C.inkSoft }}>% de la note</span>
          </div>
        )}
      </div>

      {node.type !== "resultat" && <div style={{ width: 2, height: 18, background: C.line, flexShrink: 0 }} />}

      {node.type === "evenement" && (
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          {(node.enfants || []).map((child, idx) => (
            <ActionReactionNode key={child.id} node={child} onUpdate={c => updateChild(idx, c)} onDelete={() => deleteChild(idx)} />
          ))}
          <button onClick={addActionChild} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: `1.5px dashed ${C.line}`, background: "#fff", color: C.inkSoft, cursor: "pointer", fontSize: 12.5, fontWeight: 600, height: 40, alignSelf: "flex-start", marginTop: 2 }}><Plus size={14} /> Action</button>
        </div>
      )}
      {node.type === "action" && (
        (node.enfants || []).length ? (
          <ActionReactionNode node={node.enfants[0]} onUpdate={c => updateChild(0, c)} onDelete={() => deleteChild(0)} />
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => addTypedChild("evenement")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1.5px dashed ${C.teal}`, background: "#fff", color: C.teal, cursor: "pointer", fontSize: 12, fontWeight: 600 }}><Plus size={13} /> Événement</button>
            <button onClick={() => addTypedChild("resultat")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1.5px dashed ${C.green}`, background: "#fff", color: C.green, cursor: "pointer", fontSize: 12, fontWeight: 600 }}><Plus size={13} /> Résultat</button>
          </div>
        )
      )}
    </div>
  );
}

function QuestionEditor({ initial, categories, onClose, onSave }) {
  const { t, lang } = useLang();
  const initChoixFr = initial.choixFr ? [...initial.choixFr] : (initial.choix ? [...initial.choix] : ["", ""]);
  const initChoixNl = initial.choixNl ? [...initial.choixNl] : initChoixFr.map(() => "");
  const [form, setForm] = useState({
    id: initial.id, numero: initial.numero, categories: initial.categories && initial.categories.length ? [...initial.categories] : [categories[0]].filter(Boolean), type: initial.type || "qcm",
    enonceFr: initial.enonceFr || initial.enonce || "", enonceNl: initial.enonceNl || "",
    points: initial.points || 1, media: initial.media || null,
    choixFr: initChoixFr, choixNl: initChoixNl, bonneReponse: initial.bonneReponse ?? 0,
    bonnesReponses: initial.bonnesReponses ? [...initial.bonnesReponses] : [],
    reponseAttendue: initial.reponseAttendue || "", cibles: initial.cibles || [],
    marqueurs: initial.marqueurs && initial.marqueurs.length ? [...initial.marqueurs] : [],
    paires: initial.paires && initial.paires.length ? [...initial.paires] : [{ id: genId("pr"), gauche: "", droite: "" }, { id: genId("pr"), gauche: "", droite: "" }],
    arbre: initial.arbre || { id: genId("ar"), type: "evenement", texte: "", enfants: [] },
    items: initial.items && initial.items.length ? initial.items.map(it => ({ id: it.id, texteFr: it.texteFr ?? it.texte ?? "", texteNl: it.texteNl ?? "" })) : [{ id: genId("it"), texteFr: "", texteNl: "" }, { id: genId("it"), texteFr: "", texteNl: "" }],
    reference: initial.reference || "",
    pointsParBonneReponse: initial.pointsParBonneReponse ?? 1,
    minuteurActif: !!initial.dureeSecondes, minMin: initial.dureeSecondes ? Math.floor(initial.dureeSecondes / 60) : 1, minSec: initial.dureeSecondes ? initial.dureeSecondes % 60 : 0,
    remarqueSuspension: initial.remarqueSuspension || "",
  });
  const toggleCategorie = (c) => setForm({ ...form, categories: form.categories.includes(c) ? form.categories.filter(x => x !== c) : [...form.categories, c] });
  const updateItemTexteFr = (i, v) => { const items = [...form.items]; items[i] = { ...items[i], texteFr: v }; setForm({ ...form, items }); };
  const updateItemTexteNl = (i, v) => { const items = [...form.items]; items[i] = { ...items[i], texteNl: v }; setForm({ ...form, items }); };
  const addItem = () => setForm({ ...form, items: [...form.items, { id: genId("it"), texteFr: "", texteNl: "" }] });
  const removeItem = (i) => { if (form.items.length <= 2) return; setForm({ ...form, items: form.items.filter((_, ii) => ii !== i) }); };
  const moveItem = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= form.items.length) return;
    const items = [...form.items];
    [items[i], items[j]] = [items[j], items[i]];
    setForm({ ...form, items });
  };
  const updateChoixFr = (i, v) => { const c = [...form.choixFr]; c[i] = v; setForm({ ...form, choixFr: c }); };
  const updateChoixNl = (i, v) => { const c = [...form.choixNl]; c[i] = v; setForm({ ...form, choixNl: c }); };
  const addChoix = () => { if (form.choixFr.length >= 8) return; setForm({ ...form, choixFr: [...form.choixFr, ""], choixNl: [...form.choixNl, ""] }); };
  const removeChoix = (i) => {
    if (form.choixFr.length <= 2) return;
    const newChoixFr = form.choixFr.filter((_, ci) => ci !== i);
    const newChoixNl = form.choixNl.filter((_, ci) => ci !== i);
    let newBonne = form.bonneReponse;
    if (i === form.bonneReponse) newBonne = 0; else if (i < form.bonneReponse) newBonne = form.bonneReponse - 1;
    const newBonnes = form.bonnesReponses.filter(bi => bi !== i).map(bi => bi > i ? bi - 1 : bi);
    setForm({ ...form, choixFr: newChoixFr, choixNl: newChoixNl, bonneReponse: newBonne, bonnesReponses: newBonnes });
  };
  const toggleBonneMulti = (i) => setForm({ ...form, bonnesReponses: form.bonnesReponses.includes(i) ? form.bonnesReponses.filter(x => x !== i) : [...form.bonnesReponses, i] });
  const setType = (type) => {
    if (type === "vrai_faux") setForm({ ...form, type, choixFr: ["Vrai", "Faux"], choixNl: ["Waar", "Onwaar"], bonneReponse: 0 });
    else if (type === "qcm" || type === "qcm_multi") setForm({ ...form, type, choixFr: form.choixFr.length === 2 && form.type === "vrai_faux" ? ["", ""] : form.choixFr, choixNl: form.choixNl.length === 2 && form.type === "vrai_faux" ? ["", ""] : form.choixNl });
    else if (type === "legende") setForm({ ...form, type, marqueurs: form.media?.type === "image" ? form.marqueurs : [] });
    else setForm({ ...form, type });
  };
  const handleImageClick = (e) => {
    if (form.type !== "point" && form.type !== "legende") return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    if (form.type === "point") setForm({ ...form, cibles: [...form.cibles, { x, y, rayon: 10 }] });
    else setForm({ ...form, marqueurs: [...form.marqueurs, { id: genId("mq"), x, y, reponse: "" }] });
  };
  const removeCible = (i) => setForm({ ...form, cibles: form.cibles.filter((_, ci) => ci !== i) });
  const updateCibleRayon = (i, rayon) => setForm({ ...form, cibles: form.cibles.map((c, ci) => ci === i ? { ...c, rayon } : c) });
  const removeMarqueur = (i) => setForm({ ...form, marqueurs: form.marqueurs.filter((_, mi) => mi !== i) });
  const updateMarqueurReponse = (i, reponse) => setForm({ ...form, marqueurs: form.marqueurs.map((m, mi) => mi === i ? { ...m, reponse } : m) });
  const addPaire = () => { if (form.paires.length >= 10) return; setForm({ ...form, paires: [...form.paires, { id: genId("pr"), gauche: "", droite: "" }] }); };
  const removePaire = (i) => { if (form.paires.length <= 2) return; setForm({ ...form, paires: form.paires.filter((_, pi) => pi !== i) }); };
  const updatePaire = (i, field, v) => setForm({ ...form, paires: form.paires.map((p, pi) => pi === i ? { ...p, [field]: v } : p) });

  const [showSuspendPopup, setShowSuspendPopup] = useState(false);
  const [suspendRemark, setSuspendRemark] = useState(initial.remarqueSuspension || "");
  const canSave = form.enonceFr.trim() && form.enonceNl.trim() && form.categories.length > 0
    && (form.type !== "point" || (form.media?.type === "image" && (form.cibles || []).length > 0))
    && (form.type !== "legende" || (form.media?.type === "image" && form.marqueurs.length > 0 && form.marqueurs.every(m => m.reponse.trim())))
    && ((form.type !== "qcm" && form.type !== "vrai_faux") || (form.choixFr.every(c => c.trim()) && form.choixNl.every(c => c.trim())))
    && (form.type !== "qcm_multi" || (form.choixFr.every(c => c.trim()) && form.choixNl.every(c => c.trim()) && form.bonnesReponses.length > 0))
    && (form.type !== "relier" || form.paires.every(p => p.gauche.trim() && p.droite.trim()))
    && (form.type !== "action_reaction" || validateActionTree(form.arbre))
    && (form.type !== "ordre" || (form.items.length >= 2 && form.items.every(it => it.texteFr.trim() && it.texteNl.trim()) && form.pointsParBonneReponse > 0))
    && (!form.minuteurActif || (form.minMin * 60 + form.minSec) > 0);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy, display: "flex", alignItems: "center", gap: 10 }}>
          {initial.id ? t("modifier_question") : t("ajouter_question")}
          {typeof initial.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: C.inkSoft, background: C.bg, borderRadius: 6, padding: "3px 9px" }}>#{initial.numero}</span>}
        </div>
        <Btn variant="ghost" icon={X} onClick={onClose}>{t("close")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28, maxWidth: form.type === "action_reaction" ? "100%" : 720, width: form.type === "action_reaction" ? "100%" : "auto", minWidth: 0, boxSizing: "border-box" }}>
      <Field label={t("categories_field_label")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {categories.map(c => (
            <button key={c} type="button" onClick={() => toggleCategorie(c)} style={{ padding: "6px 12px", borderRadius: 16, border: `1px solid ${form.categories.includes(c) ? C.navy : C.line}`, background: form.categories.includes(c) ? C.navy : "#fff", color: form.categories.includes(c) ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{c}</button>
          ))}
        </div>
      </Field>
      <Field label={t("type_question_label")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return <button key={key} type="button" onClick={() => setType(key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${form.type === key ? C.navy : C.line}`, background: form.type === key ? C.navy : "#fff", color: form.type === key ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}><Icon size={14} />{typeLabel(key, lang)}</button>;
          })}
        </div>
      </Field>
      <Field label="Énoncé de la question (verplicht)"><textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.enonceFr} onChange={e => setForm({ ...form, enonceFr: e.target.value })} /></Field>
      <Field label="Vraagstelling (obligatoire)"><textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.enonceNl} onChange={e => setForm({ ...form, enonceNl: e.target.value })} /></Field>
      {form.type !== "qcm_multi" && form.type !== "point" && form.type !== "ordre" && (
        <Field label={t("cotation_points_label")}><input type="number" min={0} step={0.5} style={{ ...inputStyle, maxWidth: 120 }} value={form.points} onChange={e => setForm({ ...form, points: Math.max(0, Number(e.target.value) || 0) })} /></Field>
      )}
      {(form.type === "qcm_multi" || form.type === "point" || form.type === "ordre") && (
        <Field label={t("points_bonne_reponse_label")} hint={form.type === "ordre" ? t("points_bonne_reponse_hint_ordre") : t("points_bonne_reponse_hint_autre")}>
          <input type="number" min={0} step={0.5} style={{ ...inputStyle, maxWidth: 120 }} value={form.pointsParBonneReponse} onChange={e => setForm({ ...form, pointsParBonneReponse: Math.max(0, Number(e.target.value) || 0) })} />
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
            {(() => {
              const n = form.type === "qcm_multi" ? form.bonnesReponses.length : form.type === "ordre" ? form.items.length : form.cibles.length;
              const mot = form.type === "ordre" ? t("action_word") : t("bonne_reponse_attendue_word");
              return n > 0 ? `${t("total_question_prefix")}${(form.pointsParBonneReponse * n).toString().replace(".", ",")}${t("total_question_points")}${n} ${mot}${n > 1 ? "s" : ""} × ${form.pointsParBonneReponse})` : t("ajoutez_dabord_elements");
            })()}
          </div>
        </Field>
      )}
      <Field label={t("minuteur_label")} hint={t("minuteur_hint")}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: form.minuteurActif ? 10 : 0 }}>
          <input type="checkbox" checked={form.minuteurActif} onChange={e => setForm({ ...form, minuteurActif: e.target.checked })} /> {t("activer_minuteur")}
        </label>
        {form.minuteurActif && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min={0} style={{ ...inputStyle, width: 70 }} value={form.minMin} onChange={e => setForm({ ...form, minMin: Math.max(0, Number(e.target.value)) })} /><span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("min_short")}</span>
            <input type="number" min={0} max={59} style={{ ...inputStyle, width: 70 }} value={form.minSec} onChange={e => setForm({ ...form, minSec: Math.max(0, Math.min(59, Number(e.target.value))) })} /><span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("sec_short")}</span>
          </div>
        )}
      </Field>
      <Field label={(form.type === "point" || form.type === "legende") ? t("image_obligatoire_label") : t("image_facultatif_label")} hint={(form.type === "point" || form.type === "legende") ? t("image_obligatoire_hint") : null}>
        <MediaField media={form.media} imageOnly={form.type === "point" || form.type === "legende"} onChange={(m) => setForm({ ...form, media: m, cibles: form.type === "point" ? [] : form.cibles, marqueurs: form.type === "legende" ? [] : form.marqueurs })} />
      </Field>

      {(form.type === "qcm" || form.type === "vrai_faux") && (
        <Field label={t("reponses_qcm_label")}>
          {form.choixFr.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input type="radio" checked={form.bonneReponse === i} onChange={() => setForm({ ...form, bonneReponse: i })} />
              <input style={inputStyle} value={c} placeholder={`Réponse ${i + 1} (FR)`} disabled={form.type === "vrai_faux"} onChange={e => updateChoixFr(i, e.target.value)} />
              <input style={inputStyle} value={form.choixNl[i]} placeholder={`Antwoord ${i + 1} (NL)`} disabled={form.type === "vrai_faux"} onChange={e => updateChoixNl(i, e.target.value)} />
              {form.type === "qcm" && form.choixFr.length > 2 && <Btn variant="danger" icon={Trash2} onClick={() => removeChoix(i)} style={{ padding: "6px 8px" }} />}
            </div>
          ))}
          {form.type === "qcm" && form.choixFr.length < 8 && <Btn variant="ghost" icon={Plus} onClick={addChoix} style={{ marginTop: 4 }}>{t("ajouter_reponse")}</Btn>}
        </Field>
      )}
      {form.type === "qcm_multi" && (
        <Field label={t("reponses_qcm_multi_label")}>
          {form.choixFr.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={form.bonnesReponses.includes(i)} onChange={() => toggleBonneMulti(i)} />
              <input style={inputStyle} value={c} placeholder={`Réponse ${i + 1} (FR)`} onChange={e => updateChoixFr(i, e.target.value)} />
              <input style={inputStyle} value={form.choixNl[i]} placeholder={`Antwoord ${i + 1} (NL)`} onChange={e => updateChoixNl(i, e.target.value)} />
              {form.choixFr.length > 2 && <Btn variant="danger" icon={Trash2} onClick={() => removeChoix(i)} style={{ padding: "6px 8px" }} />}
            </div>
          ))}
          {form.choixFr.length < 8 && <Btn variant="ghost" icon={Plus} onClick={addChoix} style={{ marginTop: 4 }}>{t("ajouter_reponse")}</Btn>}
        </Field>
      )}
      {form.type === "ouverte" && (
        <Field label={t("element_reponse_ouverte_label")}><textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={form.reponseAttendue} onChange={e => setForm({ ...form, reponseAttendue: e.target.value })} /></Field>
      )}
      {form.type === "point" && (
        <Field label={t("zones_cible_label", { n: form.cibles.length })} hint={t("zones_cible_hint")}>
          {form.media?.type === "image" ? (
            <div>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                <img src={form.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
                {form.cibles.map((c, i) => (
                  <div key={i} onClick={(e) => { e.stopPropagation(); removeCible(i); }} title="Cliquer pour supprimer" style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.rayon * 2}%`, paddingBottom: `${c.rayon * 2}%`, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `2px solid ${C.gold}`, background: "rgba(200,155,60,0.3)", cursor: "pointer" }} />
                ))}
              </div>
              {form.cibles.map((c, i) => (
                <div key={i} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.inkSoft, minWidth: 60 }}>{t("point_word")} {i + 1}</span>
                  <input type="range" min={4} max={25} value={c.rayon} onChange={e => updateCibleRayon(i, Number(e.target.value))} />
                  <Btn variant="danger" icon={Trash2} onClick={() => removeCible(i)} style={{ padding: "4px 8px" }} />
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("ajoutez_image_dabord")}</div>}
        </Field>
      )}
      {form.type === "relier" && (
        <Field label={t("paires_relier_label", { n: form.paires.length })} hint={t("paires_relier_hint")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.paires.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkSoft, minWidth: 16 }}>{i + 1}</span>
                <input style={inputStyle} placeholder={t("element_gauche_placeholder")} value={p.gauche} onChange={e => updatePaire(i, "gauche", e.target.value)} />
                <Link2 size={14} color={C.inkSoft} style={{ flexShrink: 0 }} />
                <input style={inputStyle} placeholder={t("element_droite_placeholder")} value={p.droite} onChange={e => updatePaire(i, "droite", e.target.value)} />
                {form.paires.length > 2 && <Btn variant="danger" icon={Trash2} onClick={() => removePaire(i)} style={{ padding: "6px 8px" }} />}
              </div>
            ))}
          </div>
          {form.paires.length < 10 && <Btn variant="ghost" icon={Plus} onClick={addPaire} style={{ marginTop: 8 }}>{t("ajouter_paire")}</Btn>}
        </Field>
      )}
      {form.type === "ordre" && (
        <Field label={t("actions_ordonner_label", { n: form.items.length })} hint={t("actions_ordonner_hint")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.items.map((it, i) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkSoft, minWidth: 16 }}>{i + 1}</span>
                <input style={inputStyle} placeholder={`Action ${i + 1} (FR)`} value={it.texteFr} onChange={e => updateItemTexteFr(i, e.target.value)} />
                <input style={inputStyle} placeholder={`Actie ${i + 1} (NL)`} value={it.texteNl} onChange={e => updateItemTexteNl(i, e.target.value)} />
                <Btn variant="ghost" icon={ChevronUp} onClick={() => moveItem(i, -1)} style={{ padding: "6px 8px" }} disabled={i === 0} />
                <Btn variant="ghost" icon={ChevronDown} onClick={() => moveItem(i, 1)} style={{ padding: "6px 8px" }} disabled={i === form.items.length - 1} />
                {form.items.length > 2 && <Btn variant="danger" icon={Trash2} onClick={() => removeItem(i)} style={{ padding: "6px 8px" }} />}
              </div>
            ))}
          </div>
          <Btn variant="ghost" icon={Plus} onClick={addItem} style={{ marginTop: 8 }}>{t("ajouter_action")}</Btn>
        </Field>
      )}
      {form.type === "action_reaction" && (
        <Field label="Arbre de décision" hint="L'élève verra l'Événement, choisira une Action parmi celles proposées, ce qui révèle la suite (nouvel Événement ou Résultat final). Une fois un choix fait, les autres options du même niveau ne sont plus accessibles.">
          <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0, padding: "12px 4px 16px", boxSizing: "border-box" }}>
            <ActionReactionNode node={form.arbre} isRoot onUpdate={n => setForm({ ...form, arbre: n })} onDelete={() => {}} />
          </div>
        </Field>
      )}
      {form.type === "legende" && (
        <Field label={t("points_legender_label", { n: form.marqueurs.length })} hint={t("points_legender_hint")}>
          {form.media?.type === "image" ? (
            <div>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                <img src={form.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
                {form.marqueurs.map((m, i) => (
                  <div key={m.id} onClick={(e) => { e.stopPropagation(); removeMarqueur(i); }} title="Cliquer pour supprimer" style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 24, height: 24, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{i + 1}</div>
                ))}
              </div>
              {form.marqueurs.map((m, i) => (
                <div key={m.id} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.goldSoft, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{i + 1}</span>
                  <input style={inputStyle} placeholder={t("reponse_attendue_point_placeholder")} value={m.reponse} onChange={e => updateMarqueurReponse(i, e.target.value)} />
                  <Btn variant="danger" icon={Trash2} onClick={() => removeMarqueur(i)} style={{ padding: "6px 8px" }} />
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("ajoutez_image_dabord")}</div>}
        </Field>
      )}
      <Field label={t("reference_label_field")}>
        <input style={inputStyle} placeholder={t("reference_placeholder")} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="ghost" icon={PauseCircle} onClick={() => setShowSuspendPopup(true)} title={t("mettre_en_suspens_title")}>{t("mettre_en_suspens_btn")}</Btn>
        <Btn variant="primary" onClick={() => {
          const { minuteurActif, minMin, minSec, ...rest } = form;
          let finalPoints = form.points;
          if (form.type === "qcm_multi") finalPoints = form.pointsParBonneReponse * form.bonnesReponses.length;
          if (form.type === "point") finalPoints = form.pointsParBonneReponse * form.cibles.length;
          if (form.type === "ordre") finalPoints = form.pointsParBonneReponse * form.items.length;
          onSave({ ...rest, points: finalPoints, dureeSecondes: minuteurActif ? (minMin * 60 + minSec) : null, statut: "active" });
        }} disabled={!canSave}>{t("save")}</Btn>
      </div>
      {showSuspendPopup && (
        <Modal title={t("mettre_en_suspens_btn")} onClose={() => setShowSuspendPopup(false)} width={420}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>{t("suspens_popup_intro")}</div>
          <Field label={t("remarque_suspension_label")} hint={t("remarque_suspension_hint")}>
            <textarea autoFocus style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder={t("remarque_suspension_placeholder")} value={suspendRemark} onChange={e => setSuspendRemark(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowSuspendPopup(false)}>{t("cancel")}</Btn>
            <Btn variant="gold" icon={PauseCircle} onClick={() => {
              const { minuteurActif, minMin, minSec, ...rest } = form;
              let finalPoints = form.points;
              if (form.type === "qcm_multi") finalPoints = form.pointsParBonneReponse * form.bonnesReponses.length;
              if (form.type === "point") finalPoints = form.pointsParBonneReponse * form.cibles.length;
              if (form.type === "ordre") finalPoints = form.pointsParBonneReponse * form.items.length;
              onSave({ ...rest, points: finalPoints, dureeSecondes: minuteurActif ? (minMin * 60 + minSec) : null, statut: "suspendue", remarqueSuspension: suspendRemark.trim() });
            }}>{t("mettre_en_suspens_btn")}</Btn>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

/* ------------------------- GESTION QUESTIONNAIRES ------------------------- */
function GestionQuestionnaires({ users, questions, questionnaires, setQuestionnaires, categories, categoryConfig, requestPrint, currentUser }) {
  const { t } = useLang();
  const [subtab, setSubtab] = useState("attribuer");
  const eleves = users.filter(u => u.role === "eleve");
  return (
    <div>
      <SectionTitle>{t("nav_questionnaires")}</SectionTitle>
      <div style={{ display: "flex", gap: 8, margin: "14px 0 18px" }}>
        <button onClick={() => setSubtab("attribuer")} style={pillStyle(subtab === "attribuer")}>{t("attribuer_qn")}</button>
        <button onClick={() => setSubtab("liste")} style={pillStyle(subtab === "liste")}>{t("analyser_valider")}</button>
      </div>
      {subtab === "attribuer" ? <AttribuerQuestionnaire eleves={eleves} questions={questions} setQuestionnaires={setQuestionnaires} questionnaires={questionnaires} categories={categories} categoryConfig={categoryConfig} /> : <ListeQuestionnaires users={users} questions={questions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} requestPrint={requestPrint} currentUser={currentUser} />}
    </div>
  );
}
function pillStyle(active) { return { padding: "8px 14px", borderRadius: 20, border: `1px solid ${active ? C.navy : C.line}`, background: active ? C.navy : "#fff", color: active ? "#fff" : C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }; }

function resolveQuestionLangues(mode, eleveLangue, count) {
  const base = eleveLangue === "nl" ? "nl" : "fr";
  const opp = base === "fr" ? "nl" : "fr";
  if (mode === "inverse") return Array(count).fill(opp);
  if (mode === "5050") return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? "fr" : "nl"));
  return Array(count).fill(base);
}
function AttribuerQuestionnaire({ eleves, questions, setQuestionnaires, questionnaires, categories, categoryConfig }) {
  const { t, lang } = useLang();
  const [eleveId, setEleveId] = useState(eleves[0]?.id || "");
  const [mode, setMode] = useState("aleatoire");
  const [langueMode, setLangueMode] = useState("eleve");
  const [cats, setCats] = useState([]);
  const [nb, setNb] = useState(8);
  const [titre, setTitre] = useState("");
  const [preview, setPreview] = useState(null);
  const [avoidRepeats, setAvoidRepeats] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);
  const toggleCat = (c) => setCats(cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c]);
  const askedQuestionIds = useMemo(() => new Set(questionnaires.filter(q => q.eleveId === eleveId).flatMap(q => q.questionIds || [])), [questionnaires, eleveId]);
  const alreadyAskedCount = askedQuestionIds.size;
  const selectedEleve = eleves.find(e => e.id === eleveId);
  const eleveFonction = selectedEleve?.fonction || "Élève régulateur";
  const allowedCats = useMemo(() => categories.filter(c => (categoryConfig[c]?.fonctions || FONCTIONS).includes(eleveFonction)), [categories, categoryConfig, eleveFonction]);
  useEffect(() => { setCats(c => c.filter(x => allowedCats.includes(x))); }, [eleveId]); // eslint-disable-line
  const pool = useMemo(() => {
    let base = mode === "aleatoire" || cats.length === 0
      ? questions.filter(q => q.statut !== "suspendue" && (q.categories || []).some(c => allowedCats.includes(c)))
      : questions.filter(q => q.statut !== "suspendue" && (q.categories || []).some(c => cats.includes(c) && allowedCats.includes(c)));
    if (avoidRepeats) base = base.filter(q => !askedQuestionIds.has(q.id));
    return base;
  }, [mode, cats, questions, avoidRepeats, askedQuestionIds, allowedCats]);
  const genererApercu = () => { const n = Math.min(nb, pool.length); setPreview(shuffle(pool).slice(0, n)); };
  const previewLangues = useMemo(() => preview ? resolveQuestionLangues(langueMode, selectedEleve?.langue || "fr", preview.length) : [], [preview, langueMode, selectedEleve]);
  const attribuer = () => {
    if (!eleveId || pool.length === 0) return;
    const chosen = preview || shuffle(pool).slice(0, Math.min(nb, pool.length));
    const categoriesUtilisees = mode === "aleatoire" || cats.length === 0 ? allowedCats : cats;
    const now = new Date();
    const finalTitre = titre.trim() || `Questionnaire du ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const questionLangues = resolveQuestionLangues(langueMode, selectedEleve?.langue || "fr", chosen.length);
    setQuestionnaires([...questionnaires, { id: genId("qn"), eleveId, titre: finalTitre, categories: categoriesUtilisees, mode, nbQuestions: chosen.length, questionIds: chosen.map(q => q.id), questionLangues, langueMode, dateAttribution: new Date().toISOString().slice(0, 10), statut: "en cours", reponses: null, scoreParCategorie: null, scoreGlobal: null, luConfirme: false }]);
    const eleve = eleves.find(e => e.id === eleveId);
    setSuccessMsg(t("qn_attribue_msg", { titre: finalTitre, nom: `${eleve?.prenom} ${eleve?.nom}` }));
    setPreview(null); setTitre("");
  };
  return (
    <div>
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: C.greenSoft, color: C.green, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 10, marginBottom: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={16} /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, display: "flex" }}><X size={15} /></button>
        </div>
      )}
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <Field label={t("eleve_concerne")}><select style={inputStyle} value={eleveId} onChange={e => setEleveId(e.target.value)}>{eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.numeroAgent} ({fonctionLabel(e.fonction, lang) || t("role_eleve")})</option>)}</select></Field>
        <Field label={t("titre_qn_label")} hint={t("titre_qn_hint")}><input style={inputStyle} placeholder={t("titre_qn_placeholder")} value={titre} onChange={e => setTitre(e.target.value)} /></Field>
        <Field label={t("langue_qn_label")} hint={t("langue_qn_hint")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "eleve" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "eleve" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "eleve"} onChange={() => setLangueMode("eleve")} /><Globe size={14} /> {t("langue_evalue")} {selectedEleve && <span style={{ color: C.inkSoft }}>({selectedEleve.langue === "nl" ? "Nederlands" : "Français"})</span>}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "inverse" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "inverse" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "inverse"} onChange={() => setLangueMode("inverse")} /><Globe size={14} /> {t("langue_inverse_evalue")} {selectedEleve && <span style={{ color: C.inkSoft }}>({selectedEleve.langue === "nl" ? "Français" : "Nederlands"})</span>}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "5050" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "5050" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "5050"} onChange={() => setLangueMode("5050")} /><Globe size={14} /> {t("langue_5050")}</label>
          </div>
        </Field>
        <Field label={t("selection_categories_label")} hint={t("categories_role_hint", { role: fonctionLabel(eleveFonction, lang) })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${mode === "aleatoire" ? C.gold : C.line}`, borderRadius: 8, background: mode === "aleatoire" ? C.goldSoft : "#fff", cursor: "pointer" }}><input type="radio" checked={mode === "aleatoire"} onChange={() => { setMode("aleatoire"); setCats([]); }} /><Shuffle size={14} /> {t("mode_aleatoire")}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${mode === "cible" ? C.navy : C.line}`, borderRadius: 8, cursor: "pointer" }}><input type="radio" checked={mode === "cible"} onChange={() => setMode("cible")} /><Filter size={14} /> {t("mode_cible")}</label>
          </div>
          {mode === "cible" && (
            allowedCats.length === 0
              ? <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{t("aucune_categorie_role", { role: fonctionLabel(eleveFonction, lang) })}</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{allowedCats.map(c => <button key={c} type="button" onClick={() => toggleCat(c)} style={{ padding: "5px 11px", borderRadius: 16, border: `1px solid ${cats.includes(c) ? C.navy : C.line}`, background: cats.includes(c) ? C.navy : "#fff", color: cats.includes(c) ? "#fff" : C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}</div>
          )}
        </Field>
        <Field label={t("repetitions_label")} hint={eleveId ? t("deja_attribuees_hint", { n: alreadyAskedCount }) : null}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={avoidRepeats} onChange={e => setAvoidRepeats(e.target.checked)} disabled={!eleveId} /> {t("ne_pas_reattribuer")}
          </label>
        </Field>
        <Field label={t("nb_questions_label", { n: pool.length })}><input type="number" min={1} max={pool.length || 1} style={inputStyle} value={nb} onChange={e => setNb(Number(e.target.value))} /></Field>
        <Btn variant="ghost" icon={Eye} onClick={genererApercu} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} disabled={pool.length === 0}>{t("generer_apercu")}</Btn>
        <Btn variant="primary" icon={BadgeCheck} onClick={attribuer} style={{ width: "100%", justifyContent: "center" }} disabled={!eleveId || pool.length === 0}>{t("attribuer_eleve")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("apercu_tirage_titre")}</SectionTitle>
        {!preview ? <EmptyState icon={Shuffle} title={t("aucun_apercu_titre")} body={t("aucun_apercu_body")} /> : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {preview.map((q, i) => (
              <div key={q.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 9 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft, minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: "#fff", background: C.navy2, borderRadius: 6, padding: "2px 7px" }}>#{q.numero}</span>}<CategoryBadges allCategories={categories} cats={q.categories} /><TypeBadge type={q.type} />{!!q.dureeSecondes && <Badge color={C.gold} bg={C.goldSoft}><Timer size={10} />{Math.floor(q.dureeSecondes / 60)}:{String(q.dureeSecondes % 60).padStart(2, "0")}</Badge>}<Badge color={previewLangues[i] === "nl" ? C.teal : C.navy2} bg={previewLangues[i] === "nl" ? C.tealSoft : C.bg}>{previewLangues[i] === "nl" ? "NL" : "FR"}</Badge></div><div style={{ fontSize: 13.5, marginTop: 6 }}>{qText(q, previewLangues[i])}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function ListeQuestionnaires({ users, questions, questionnaires, setQuestionnaires, categories, requestPrint, currentUser }) {
  const { t } = useLang();
  const [reviewing, setReviewing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [histFilter, setHistFilter] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteJustification, setDeleteJustification] = useState("");
  const eleves = users.filter(u => u.role === "eleve");
  const resolveCorrecteur = (q) => (q.correcteurId ? users.find(u => u.id === q.correcteurId) : null);
  const toReview = questionnaires.filter(q => q.statut === "en attente de validation");
  const others = questionnaires
    .filter(q => q.statut !== "en attente de validation" && (!histFilter || q.eleveId === histFilter))
    .slice()
    .sort((a, b) => (b.dateAttribution || "").localeCompare(a.dateAttribution || ""));
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exportSelection = () => {
    const items = others.filter(q => selected.has(q.id)).map(q => ({ questionnaire: q, eleve: users.find(u => u.id === q.eleveId) }));
    if (items.length) requestPrint({ type: "questionnaires", items, questions, categories });
  };
  const confirmDelete = () => {
    if (!deleteJustification.trim() || !deleteTarget) return;
    setQuestionnaires(questionnaires.map(q => q.id === deleteTarget.id ? {
      ...q, supprime: true, justificationSuppression: deleteJustification.trim(),
      supprimePar: currentUser ? { prenom: currentUser.prenom, nom: currentUser.nom } : null,
      dateSuppression: new Date().toISOString().slice(0, 10),
    } : q));
    setDeleteTarget(null); setDeleteJustification("");
  };

  if (reviewing) {
    return (
      <AnalysisView questionnaire={reviewing} eleve={users.find(u => u.id === reviewing.eleveId)} questions={questions} categories={categories}
        onClose={() => setReviewing(null)}
        onValidate={(reponsesFinal, scoreParCategorie, scoreGlobal, remarks, manualGrades, overrides, categorieCounts) => {
          setQuestionnaires(questionnaires.map(q => q.id === reviewing.id ? {
            ...q, statut: "validé", reponses: reponsesFinal, scoreParCategorie, scoreGlobal, categorieCounts,
            remarques: remarks, manualGrades, overrides, correcteurId: currentUser?.id || null,
            dateValidation: new Date().toISOString().slice(0, 10),
          } : q));
          setReviewing(null);
        }} />
    );
  }
  if (viewing) {
    return <AnalysisView questionnaire={{ ...viewing, correcteur: resolveCorrecteur(viewing) }} eleve={users.find(u => u.id === viewing.eleveId)} questions={questions} categories={categories} onClose={() => setViewing(null)} readOnly onValidate={() => {}} />;
  }

  return (
    <div>
      <SectionTitle>{t("a_analyser_valider")}</SectionTitle>
      {toReview.length === 0 ? <div style={{ marginTop: 12 }}><EmptyState icon={ClipboardCheck} title={t("rien_en_attente_titre")} body={t("rien_en_attente_body")} /></div> : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {toReview.map(q => { const e = users.find(u => u.id === q.eleveId); return <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px" }}><div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{q.titre}</div><div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{e?.prenom} {e?.nom} · {q.nbQuestions} {t("question_word")}{q.nbQuestions > 1 ? "s" : ""} · {t("attribue_le")} {q.dateAttribution}</div></div><Btn variant="gold" icon={Eye} onClick={() => setReviewing(q)}>{t("analyser_btn")}</Btn></div>; })}
        </div>
      )}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>{t("historique_titre")}</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selected.size > 0 && <Btn variant="gold" icon={FileDown} onClick={exportSelection}>{t("exporter_selection", { n: selected.size })}</Btn>}
            <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={histFilter} onChange={e => setHistFilter(e.target.value)}>
              <option value="">{t("tous_les_eleves")}</option>
              {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {others.length === 0 && <EmptyState icon={ClipboardList} title={t("aucun_resultat_titre")} body={t("aucun_resultat_body")} />}
          {others.map(q => { const e = users.find(u => u.id === q.eleveId); const isValide = q.statut === "validé"; const correcteur = resolveCorrecteur(q); const isSupprime = !!q.supprime; return (
            <div key={q.id} style={{ display: "flex", flexDirection: "column", background: isSupprime ? C.redSoft : "#fff", border: `1px solid ${isSupprime ? C.red : selected.has(q.id) ? C.gold : C.line}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isValide && !isSupprime && <button onClick={() => toggleSelect(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(q.id) ? C.gold : C.inkSoft, display: "flex" }}>{selected.has(q.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button>}
                  <span style={{ fontSize: 13, textDecoration: isSupprime ? "line-through" : "none", color: isSupprime ? C.red : C.ink }}>
                    {q.titre} — {e?.prenom} {e?.nom} <span style={{ color: isSupprime ? C.red : C.inkSoft }}>· {q.dateAttribution}</span>
                    {isValide && correcteur && <span style={{ color: isSupprime ? C.red : C.inkSoft }}>{t("corrige_par")}{correcteur.prenom} {correcteur.nom}</span>}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {q.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, textDecoration: isSupprime ? "line-through" : "none", color: isSupprime ? C.red : C.ink }}>{q.scoreGlobal}%</span>}
                  <StatusBadge statut={q.statut} />
                  {isValide && !isSupprime && <Btn variant="subtle" icon={ExternalLink} onClick={() => setViewing(q)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("voir_btn")}</Btn>}
                  {!isSupprime && <Btn variant="danger" icon={Ban} onClick={() => setDeleteTarget(q)} style={{ padding: "5px 10px", fontSize: 12 }} title="Supprimer ce questionnaire (justificatif requis)" />}
                </div>
              </div>
              {isSupprime && (
                <div style={{ fontSize: 12.5, color: C.red, fontWeight: 600, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.red}30` }}>
                  Supprimé{q.supprimePar ? ` par ${q.supprimePar.prenom} ${q.supprimePar.nom}` : ""}{q.dateSuppression ? ` le ${q.dateSuppression}` : ""} — {q.justificationSuppression}
                </div>
              )}
            </div>
          ); })}
        </div>
      </div>
      {deleteTarget && (
        <Modal title="Supprimer ce questionnaire" onClose={() => { setDeleteTarget(null); setDeleteJustification(""); }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>
            « {deleteTarget.titre} » de {users.find(u => u.id === deleteTarget.eleveId)?.prenom} {users.find(u => u.id === deleteTarget.eleveId)?.nom} restera visible dans l'historique, affiché barré, avec le justificatif ci-dessous. Cette action n'est pas réversible.
          </div>
          <Field label="Justificatif (obligatoire)">
            <textarea autoFocus style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="Expliquez pourquoi ce questionnaire est supprimé..." value={deleteJustification} onChange={e => setDeleteJustification(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteJustification(""); }}>{t("cancel")}</Btn>
            <Btn variant="danger" icon={Ban} onClick={confirmDelete} disabled={!deleteJustification.trim()}>Supprimer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AnalysisView({ questionnaire, eleve, questions, categories, onClose, onValidate, readOnly = false, showConfirmRead = false, readConfirmed = false, onConfirmRead }) {
  const { t } = useLang();
  const qs = questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
  const langFor = (i) => (questionnaire.questionLangues && questionnaire.questionLangues[i]) || eleve?.langue || "fr";
  const initialAnswers = questionnaire.reponses || [];
  const [grades, setGrades] = useState(() => qs.map((q, i) => { if (q.type !== "ouverte") return null; const a = initialAnswers[i]; return (a && typeof a.points === "number") ? a.points : null; }));
  const [legendeGrades, setLegendeGrades] = useState(() => qs.map((q, i) => { if (q.type !== "legende") return null; const g = questionnaire.manualGrades?.[i]; return typeof g === "number" ? g : null; }));
  const [remarks, setRemarks] = useState(() => qs.map((q, i) => (questionnaire.remarques && questionnaire.remarques[i]) || ""));
  const [overrides, setOverrides] = useState(() => qs.map((q, i) => questionnaire.overrides?.[i] || null));
  const setOverride = (i, patch) => { const next = [...overrides]; next[i] = patch === null ? null : { ...(next[i] || { points: 0, justification: "" }), ...patch }; setOverrides(next); };

  const matchedIndexes = (q, clicks) => {
    const used = new Set(); const matched = [];
    (q.cibles || []).forEach(cible => {
      let matchIdx = -1;
      clicks.forEach((c, idx) => { if (used.has(idx) || matchIdx !== -1) return; const d = Math.hypot(c.x - cible.x, c.y - cible.y); if (d <= cible.rayon) matchIdx = idx; });
      if (matchIdx >= 0) { used.add(matchIdx); matched.push(matchIdx); }
    });
    return matched;
  };
  const autoEarnedFor = (q, i) => {
    const raw = initialAnswers[i];
    const a = q.type === "point" ? (Array.isArray(raw) ? raw : (raw ? [raw] : [])) : raw;
    if (q.type === "qcm" || q.type === "vrai_faux") return a === q.bonneReponse ? q.points : 0;
    if (q.type === "qcm_multi") return scoreQcmMulti(q, a);
    if (q.type === "point") return scorePoint(q, a);
    if (q.type === "legende") return legendeGrades[i];
    if (q.type === "relier") { const total = (q.paires || []).length || 1; const correctCount = (q.paires || []).filter((p, li) => a && a[li] === p.id).length; return Math.round((q.points * correctCount) / total); }
    if (q.type === "action_reaction") { const result = getResultReached(q.arbre, Array.isArray(a) ? a : []); return result ? Math.round((q.points * result.pourcentage) / 100) : 0; }
    if (q.type === "ordre") return scoreOrdre(q, a);
    if (q.type === "ouverte") return grades[i];
    return 0;
  };
  const earnedFor = (q, i) => (overrides[i] ? overrides[i].points : autoEarnedFor(q, i));
  const allGraded = qs.every((q, i) => (q.type !== "ouverte" || (grades[i] !== null && grades[i] !== undefined)) && (q.type !== "legende" || (legendeGrades[i] !== null && legendeGrades[i] !== undefined)))
    && overrides.every(o => !o || (o.justification && o.justification.trim().length > 0));
  const totalPoints = qs.reduce((s, q) => s + q.points, 0);
  const earnedPoints = qs.reduce((s, q, i) => s + (earnedFor(q, i) || 0), 0);
  const scoreGlobal = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const scoreParCategorie = {};
  const categorieCounts = {};
  categories.forEach(cat => {
    const catQs = qs.map((q, i) => ({ q, i })).filter(o => (o.q.categories || []).includes(cat));
    if (!catQs.length) return;
    const tot = catQs.reduce((s, o) => s + o.q.points, 0);
    const earn = catQs.reduce((s, o) => s + (earnedFor(o.q, o.i) || 0), 0);
    scoreParCategorie[cat] = tot ? Math.round((earn / tot) * 100) : 0;
    const correctCount = catQs.filter(o => (earnedFor(o.q, o.i) || 0) === o.q.points).length;
    categorieCounts[cat] = { correct: correctCount, total: catQs.length };
  });
  const handleValidate = () => {
    const reponsesFinal = qs.map((q, i) => q.type === "ouverte" ? { ...initialAnswers[i], points: grades[i] } : initialAnswers[i]);
    const manualGrades = qs.map((q, i) => q.type === "legende" ? legendeGrades[i] : (questionnaire.manualGrades?.[i] ?? null));
    onValidate(reponsesFinal, scoreParCategorie, scoreGlobal, remarks, manualGrades, overrides, categorieCounts);
  };
  const title = !readOnly ? t("analyse_titre") : showConfirmRead ? t("ma_correction_titre") : t("consultation_titre");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{title} — {questionnaire.titre}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{eleve?.prenom} {eleve?.nom} · {qs.length} {t("question_word")}{qs.length > 1 ? "s" : ""} · {earnedPoints}/{totalPoints} {t("points_short")}s</div>
        </div>
        <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "16px 20px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>{readOnly ? (questionnaire.correcteur ? t("qn_deja_valide_par", { nom: `${questionnaire.correcteur.prenom} ${questionnaire.correcteur.nom}` }) : t("qn_deja_valide")) : t("qn_en_attente_validation")}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: scoreGlobal >= 60 ? C.green : C.red }}>{scoreGlobal}%</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {qs.map((q, i) => {
          const a = initialAnswers[i];
          const earned = earnedFor(q, i);
          const isManual = q.type === "ouverte" || q.type === "legende";
          const correct = !isManual && earned === q.points;
          return (
            <div key={q.id} style={{ background: "#fff", padding: "20px 24px", border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <div style={{ fontSize: 14, flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>{typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 7, padding: "4px 10px" }}>#{q.numero}</span>}<CategoryBadges allCategories={categories} cats={q.categories} /><TypeBadge type={q.type} /></div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 8 }}>{qText(q, langFor(i))}</div>
                  {q.media && q.type !== "point" && q.type !== "legende" && (
                    <div style={{ marginBottom: 12, maxWidth: 360 }}>
                      {q.media.type === "image" && <img src={q.media.url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />}
                      {q.media.type === "video" && <video src={q.media.url} controls style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />}
                      {q.media.type === "audio" && <audio src={q.media.url} controls style={{ width: "100%" }} />}
                    </div>
                  )}
                  {(q.type === "qcm" || q.type === "vrai_faux") && (
                    <div style={{ marginTop: 6, fontSize: 13.5, color: correct ? C.green : C.red }}>{t("reponse_eleve")}{a !== undefined && a !== null ? qChoix(q, langFor(i))[a] : t("sans_reponse")}</div>
                  )}
                  {q.type === "qcm_multi" && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      {qChoix(q, langFor(i)).map((c, ci) => {
                        const selected = Array.isArray(a) && a.includes(ci);
                        const shouldBeSelected = (q.bonnesReponses || []).includes(ci);
                        if (!selected && !shouldBeSelected) return null;
                        const ok = selected === shouldBeSelected;
                        return <div key={ci} style={{ fontSize: 12.5, color: ok ? C.green : C.red }}>{selected ? "☑" : "☐"} {c} {shouldBeSelected && !selected ? t("attendu_parens") : ""}</div>;
                      })}
                      {!(Array.isArray(a) && a.length) && <div style={{ fontSize: 13, color: C.red }}>{t("sans_reponse")}</div>}
                    </div>
                  )}
                  {!isManual && !correct && q.type !== "point" && q.type !== "relier" && q.type !== "qcm_multi" && q.type !== "action_reaction" && q.type !== "ordre" && <div style={{ fontSize: 13, color: C.inkSoft }}>{t("bonne_reponse_colon")}{qChoix(q, langFor(i))[q.bonneReponse]}</div>}
                  {q.type === "legende" && q.media && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ position: "relative", display: "inline-block", maxWidth: 340, marginBottom: 10 }}>
                        <img src={q.media.url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />
                        {(q.marqueurs || []).map((m, mi) => <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 22, height: 22, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{mi + 1}</div>)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                        {(q.marqueurs || []).map((m, mi) => {
                          const given = a ? a[mi] : "";
                          const ok = normalizeText(given) === normalizeText(m.reponse);
                          return (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "5px 8px", background: ok ? C.greenSoft : C.redSoft, borderRadius: 6 }}>
                              {ok ? <CheckCircle2 size={12} color={C.green} /> : <XCircle size={12} color={C.red} />}
                              <strong>{mi + 1}.</strong> {given && given.trim() ? given : <em>{t("sans_reponse_italic")}</em>} {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_deux_points", { v: m.reponse })}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6, fontStyle: "italic" }}>{t("comparaison_aide_note")}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("points_attribues")}</span>
                        <input type="number" min={0} max={q.points} disabled={readOnly} style={{ ...inputStyle, width: 70, padding: "6px 8px" }} value={legendeGrades[i] ?? ""} onChange={e => { const v = e.target.value === "" ? null : Math.max(0, Math.min(q.points, Number(e.target.value))); const g = [...legendeGrades]; g[i] = v; setLegendeGrades(g); }} />
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>/ {q.points}</span>
                      </div>
                    </div>
                  )}
                  {q.type === "point" && q.media && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ position: "relative", display: "inline-block", maxWidth: 340 }}>
                        <img src={q.media.url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />
                        {(q.cibles || []).map((c, ci) => <div key={ci} style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.rayon * 2}%`, paddingBottom: `${c.rayon * 2}%`, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `2px solid ${C.green}`, background: "rgba(62,142,87,0.15)" }} />)}
                        {(Array.isArray(a) ? a : (a ? [a] : [])).map((pt, pi) => <div key={pi} style={{ position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`, width: 12, height: 12, borderRadius: "50%", background: C.red, border: "2px solid #fff", transform: "translate(-50%,-50%)" }} />)}
                      </div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{t("zones_vertes_cibles")}</div>
                    </div>
                  )}
                  {q.type === "relier" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(q.paires || []).map((p, li) => {
                        const chosenId = a ? a[li] : null;
                        const chosen = (q.paires || []).find(pp => pp.id === chosenId);
                        const ok = chosenId === p.id;
                        return (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 10px", background: ok ? C.greenSoft : C.redSoft, borderRadius: 6 }}>
                            {ok ? <CheckCircle2 size={13} color={C.green} /> : <XCircle size={13} color={C.red} />}
                            <span style={{ fontWeight: 600 }}>{p.gauche}</span> → <span>{chosen ? chosen.droite : t("sans_reponse")}</span>
                            {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_deux_points", { v: p.droite })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "action_reaction" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {walkTrail(q.arbre, Array.isArray(a) ? a : []).map(node => (
                        <div key={node.id} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, background: node.type === "resultat" ? (node.pourcentage === 100 ? C.greenSoft : node.pourcentage === 0 ? C.redSoft : C.goldSoft) : C.bg }}>
                          <strong style={{ textTransform: "uppercase", fontSize: 10.5, letterSpacing: ".03em", color: AR_COLOR[node.type] }}>{AR_LABEL[node.type]}</strong> — {node.texte}{node.type === "resultat" && ` (${node.pourcentage}%)`}
                        </div>
                      ))}
                      {!getResultReached(q.arbre, Array.isArray(a) ? a : []) && <div style={{ fontSize: 12.5, color: C.red }}>{t("parcours_inacheve")}</div>}
                    </div>
                  )}
                  {q.type === "ordre" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(Array.isArray(a) ? a : []).map((itemId, posIdx) => {
                        const item = (q.items || []).find(it => it.id === itemId);
                        const ok = (q.items || [])[posIdx]?.id === itemId;
                        return (
                          <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, fontSize: 12.5, background: ok ? C.greenSoft : C.redSoft }}>
                            {ok ? <CheckCircle2 size={12} color={C.green} /> : <XCircle size={12} color={C.red} />}
                            <strong>{posIdx + 1}.</strong> {itemText(item, langFor(i))}
                            {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_place", { v: itemText((q.items || [])[posIdx], langFor(i)) })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "ouverte" && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, marginBottom: 8 }}>{a?.text?.trim() ? a.text : <em>{t("sans_reponse_italic")}</em>}</div>
                      {q.reponseAttendue && <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic", marginBottom: 8 }}>{t("ouverte_attendu")}{q.reponseAttendue}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("points_attribues")}</span>
                        <input type="number" min={0} max={q.points} disabled={readOnly} style={{ ...inputStyle, width: 70, padding: "6px 8px" }} value={grades[i] ?? ""} onChange={e => { const v = e.target.value === "" ? null : Math.max(0, Math.min(q.points, Number(e.target.value))); const g = [...grades]; g[i] = v; setGrades(g); }} />
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>/ {q.points}</span>
                      </div>
                    </div>
                  )}
                  {q.reference && (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6, background: C.goldSoft, borderRadius: 8, padding: "8px 10px" }}>
                      <Tag size={13} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12.5, color: C.ink }}><strong>{t("reference_colon")}</strong>{q.reference}</span>
                    </div>
                  )}
                  {!isManual && (
                    !readOnly ? (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.inkSoft, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!overrides[i]} onChange={e => setOverride(i, e.target.checked ? { points: earned, justification: "" } : null)} />
                          {t("modifier_note_auto")}
                        </label>
                        {overrides[i] && (
                          <div style={{ marginTop: 8, padding: "10px 12px", background: C.goldSoft, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: C.inkSoft }}>{t("nouvelle_note")}</span>
                              <input type="number" min={0} max={q.points} value={overrides[i].points} onChange={e => setOverride(i, { points: Math.max(0, Math.min(q.points, Number(e.target.value))) })} style={{ ...inputStyle, width: 64, padding: "5px 8px" }} />
                              <span style={{ fontSize: 12, color: C.inkSoft }}>/ {q.points} {t("note_auto_parens", { v: autoEarnedFor(q, i) })}</span>
                            </div>
                            <textarea placeholder={t("justification_placeholder")} value={overrides[i].justification} onChange={e => setOverride(i, { justification: e.target.value })} style={{ ...inputStyle, minHeight: 44, fontSize: 12.5, resize: "vertical" }} />
                            {!overrides[i].justification.trim() && <div style={{ fontSize: 11, color: C.red }}>{t("justification_requise")}</div>}
                          </div>
                        )}
                      </div>
                    ) : overrides[i] && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: C.goldSoft, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>{t("note_modifiee_manuellement", { points: overrides[i].points, total: q.points })}</div>
                        <div style={{ fontSize: 12.5, color: C.ink }}>{overrides[i].justification}</div>
                      </div>
                    )
                  )}
                  {!readOnly ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}><MessageSquare size={12} color={C.inkSoft} /><span style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".02em" }}>{t("remarque_label")}</span></div>
                      <textarea style={{ ...inputStyle, minHeight: 44, fontSize: 12.5, resize: "vertical" }} placeholder={t("remarque_placeholder")} value={remarks[i]} onChange={e => { const r = [...remarks]; r[i] = e.target.value; setRemarks(r); }} />
                    </div>
                  ) : (remarks[i] && remarks[i].trim() ? (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6, background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <MessageSquare size={13} color={C.inkSoft} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12.5, color: C.ink }}>{remarks[i]}</span>
                    </div>
                  ) : null)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {!isManual && (correct ? <CheckCircle2 size={20} color={C.green} /> : <XCircle size={20} color={C.red} />)}
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{earned ?? 0}/{q.points} {t("pt_short")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {readOnly && showConfirmRead ? (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20 }}>
          {readConfirmed ? (
            <>
              <Badge color={C.green} bg={C.greenSoft}><BookCheck size={11} /> {t("correction_lue")}</Badge>
              <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={onClose}>{t("fermer_sans_confirmer")}</Btn>
              <Btn variant="gold" icon={BookCheck} onClick={() => { onConfirmRead(); onClose(); }}>{t("pris_connaissance_correction")}</Btn>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
          {!readOnly && <Btn variant="primary" icon={BadgeCheck} disabled={!allGraded} onClick={handleValidate}>{t("valider_questionnaire")}</Btn>}
        </div>
      )}
    </div>
  );
}

/* ------------------------- GESTION COMPTES (ADMIN) ------------------------- */
function AdminPage({ refreshQuestionnaires }) {
  const { t } = useLang();
  const [confirmResetQn, setConfirmResetQn] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingLog, setLoadingLog] = useState(true);
  const [resetError, setResetError] = useState("");
  const [nbQuestionnaires, setNbQuestionnaires] = useState(null);
  const PAGE_SIZE = 300;

  const fetchLogPage = async (p) => {
    const from = p * PAGE_SIZE;
    const { data, count } = await supabase.from("activity_log").select("*", { count: "exact" }).order("date", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setActivityLog(prev => p === 0 ? (data || []) : [...prev, ...(data || [])]);
    setTotal(count || 0);
    setLoadingLog(false);
  };
  const fetchCounts = async () => {
    const { count } = await supabase.from("questionnaires").select("*", { count: "exact", head: true });
    setNbQuestionnaires(count || 0);
  };
  useEffect(() => { fetchLogPage(0); fetchCounts(); }, []);
  const loadMore = () => { const next = page + 1; setPage(next); fetchLogPage(next); };

  const doReset = async (rpcName, onDone) => {
    setResetError("");
    try {
      const { error } = await supabase.rpc(rpcName);
      if (error) throw error;
      await onDone();
      await fetchCounts();
    } catch (e) { setResetError(e?.message || "Erreur inconnue."); }
  };

  const ACTION_STYLE = {
    creation: { label: t("log_creation"), color: C.green, bg: C.greenSoft },
    modification: { label: t("log_modification"), color: C.gold, bg: C.goldSoft },
    suppression: { label: t("log_suppression"), color: C.red, bg: C.redSoft },
  };

  return (
    <div>
      <SectionTitle>{t("nav_admin_page")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 24 }}>{t("admin_page_sub")}</div>

      <SectionTitle>{t("journal_activite_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("journal_activite_sub", { n: total })}</div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("log_date"), t("log_auteur"), t("log_entite"), t("log_action"), t("log_description")].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {activityLog.map(entry => {
              const st = ACTION_STYLE[entry.action] || ACTION_STYLE.modification;
              const d = new Date(entry.date);
              return (
                <tr key={entry.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: "10px 16px", fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap" }}>{d.toLocaleDateString("fr-BE")} {d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td style={{ padding: "10px 16px" }}>{entry.auteur}</td>
                  <td style={{ padding: "10px 16px", color: C.inkSoft }}>{entry.entite}</td>
                  <td style={{ padding: "10px 16px" }}><Badge color={st.color} bg={st.bg}>{st.label}</Badge></td>
                  <td style={{ padding: "10px 16px", color: C.inkSoft }}>{entry.description}</td>
                </tr>
              );
            })}
            {!loadingLog && activityLog.length === 0 && <tr><td colSpan={5}><EmptyState icon={ClipboardList} title={t("journal_vide_titre")} body={t("journal_vide_body")} /></td></tr>}
          </tbody>
        </table>
      </div>
      {total > activityLog.length && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <Btn variant="ghost" onClick={loadMore}>{t("charger_plus_btn", { n: total - activityLog.length })}</Btn>
        </div>
      )}
      {total <= activityLog.length && <div style={{ marginBottom: 32 }} />}

      <SectionTitle>{t("zone_dangereuse_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("zone_dangereuse_carnet_note")}</div>
      {resetError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{resetError}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.red}40`, borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 3 }}>{t("reset_questionnaires_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("reset_questionnaires_msg", { n: nbQuestionnaires ?? "…" })}</div>
          </div>
          <Btn variant="danger" icon={Trash2} onClick={() => setConfirmResetQn(true)} disabled={!nbQuestionnaires}>{t("reset_btn")}</Btn>
        </div>
      </div>

      {confirmResetQn && (
        <ConfirmDialog title={t("reset_questionnaires_titre")} message={t("reset_questionnaires_confirm_msg", { n: nbQuestionnaires })}
          confirmLabel={t("reset_btn")} onConfirm={async () => { await doReset("reset_questionnaire_history", refreshQuestionnaires); setConfirmResetQn(false); }} onCancel={() => setConfirmResetQn(false)} />
      )}
    </div>
  );
}
function GestionComptes({ users, setUsers, currentUser }) {
  const { t } = useLang();
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");
  const moniteurs = users.filter(u => u.role === "moniteur" || u.role === "admin");
  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    const before = data.id ? users.find(u => u.id === data.id) : null;
    try {
      if (data.id) {
        await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, langue: data.langue || "fr", responsableTeam: data.role === "admin" ? data.responsableTeam : "", superAdmin: data.role === "admin" ? !!data.superAdmin : false });
        logActivity("Profil", diffEntities([before], [{ ...before, ...data, pseudo }], u => `${u.prenom} ${u.nom}`, USER_LOG_FIELDS), auteurLog);
      } else {
        await callEdgeFunction("manage-user", { action: "create", pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, role: data.role, langue: data.langue || "fr", responsableTeam: data.role === "admin" ? data.responsableTeam : "", superAdmin: data.role === "admin" ? !!data.superAdmin : false });
        logActivity("Profil", [{ action: "creation", description: `${data.prenom} ${data.nom}` }], auteurLog);
      }
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    if (id === currentUser.id) return;
    setError("");
    const target = users.find(u => u.id === id);
    try {
      await callEdgeFunction("manage-user", { action: "delete", userId: id });
      logActivity("Profil", [{ action: "suppression", description: target ? `${target.prenom} ${target.nom}` : id }], auteurLog);
      await setUsers();
    }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = moniteurs.find(m => m.id === confirmId);
  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{t("comptes_titre")}</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setModal({ role: "moniteur" })}>{t("ajouter_compte")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_nom"), t("col_role"), t("responsable_team_label"), t("agent_number"), t("col_identifiant"), ""].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {moniteurs.map(m => (
              <tr key={m.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "12px 16px" }}>{m.prenom} {m.nom}</td>
                <td style={{ padding: "12px 16px" }}><Badge color={m.superAdmin ? C.red : m.role === "admin" ? C.gold : C.teal} bg={m.superAdmin ? C.redSoft : m.role === "admin" ? C.goldSoft : C.tealSoft}>{m.superAdmin ? "Admin +" : m.role === "admin" ? t("role_admin") : t("role_moniteur")}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: m.responsableTeam ? C.ink : C.inkSoft }}>{m.responsableTeam || "—"}</td>
                <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{m.numeroAgent}</td>
                <td style={{ padding: "12px 16px", color: C.inkSoft, fontFamily: FONT_MONO, fontSize: 12.5 }}>{m.pseudo}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}><Btn variant="subtle" icon={Edit2} onClick={() => setModal(m)} style={{ padding: "6px 10px", marginRight: 6 }} /><Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(m.id)} style={{ padding: "6px 10px" }} disabled={m.id === currentUser.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal !== null && <CompteModal initial={modal} users={users} canGrantSuperAdmin={currentUser.superAdmin === true} onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_compte_titre")} message={t("supprimer_compte_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })} onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
function CompteModal({ initial, users, canGrantSuperAdmin, onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({ nom: initial.nom || "", prenom: initial.prenom || "", numeroAgent: initial.numeroAgent || "", role: initial.role || "moniteur", langue: initial.langue || "fr", responsableTeam: initial.responsableTeam || "", superAdmin: initial.superAdmin || false, id: initial.id });
  const pseudoPreview = makePseudo(form.nom, form.prenom, users, initial.id) || "—";
  return (
    <Modal title={initial.id ? t("modifier_compte") : t("ajouter_compte")} onClose={onClose}>
      <Field label={t("prenom_label")}><input style={inputStyle} value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></Field>
      <Field label={t("nom_label")}><input style={inputStyle} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
      <Field label={t("col_role")}><select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value, responsableTeam: e.target.value === "admin" ? form.responsableTeam : "", superAdmin: e.target.value === "admin" ? form.superAdmin : false })}><option value="moniteur">{t("role_moniteur")}</option><option value="admin">{t("administrateur_option")}</option></select></Field>
      <Field label={t("numero_agent_label")}><input style={inputStyle} value={form.numeroAgent} onChange={e => setForm({ ...form, numeroAgent: e.target.value })} /></Field>
      <Field label={t("role_linguistique_label")} hint={t("role_linguistique_hint")}>
        <select style={inputStyle} value={form.langue} onChange={e => setForm({ ...form, langue: e.target.value })}>
          <option value="fr">Français</option>
          <option value="nl">Nederlands</option>
        </select>
      </Field>
      {form.role === "admin" && (
        <Field label={t("responsable_team_label")} hint={t("responsable_team_hint")}>
          <select style={inputStyle} value={form.responsableTeam} onChange={e => setForm({ ...form, responsableTeam: e.target.value })}>
            <option value="">{t("team_aucune")}</option>
            {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
          </select>
        </Field>
      )}
      {form.role === "admin" && canGrantSuperAdmin && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={form.superAdmin} onChange={e => setForm({ ...form, superAdmin: e.target.checked })} />
          {t("admin_plus_label")}
        </label>
      )}
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: C.inkSoft, marginBottom: 8 }}>
        {t("identifiant_connexion")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{pseudoPreview}</strong><br />
        {t("mot_de_passe_label")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{form.numeroAgent ? agentPassword(form.numeroAgent) : "—"}</strong> <span>{t("genere_auto")}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="primary" onClick={() => onSave(form)} disabled={!form.nom || !form.prenom || !form.numeroAgent}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}

/* ---------------------------------- APP ROOT ---------------------------------- */
/* ---------------------------------- APERÇUS D'IMPRESSION ---------------------------------- */
function escapeHtml(str) { return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function printHeaderHTML(subtitle) {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #16233F;padding-bottom:12px;margin-bottom:24px;">
    <div><div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#16233F;letter-spacing:.04em;">G.E.C.</div><div style="font-size:12px;color:#5B6577;">${escapeHtml(subtitle)}</div></div>
    <div style="font-size:11px;color:#5B6577;">Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
  </div>`;
}
function buildRadarSVG(data, size) {
  const cx = size / 2, cy = size / 2 - 6, r = size / 2 - 46;
  const n = data.length;
  if (n < 3) return `<div style="font-size:12px;color:#5B6577;">Pas assez de catégories pour un graphique radar.</div>`;
  const angleFor = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pointFor = (i, ratio) => { const a = angleFor(i); return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)]; };
  const rings = [0.25, 0.5, 0.75, 1].map(ratio => `<polygon points="${data.map((_, i) => pointFor(i, ratio).join(",")).join(" ")}" fill="none" stroke="#E2E1D9" stroke-width="1"/>`).join("");
  const axes = data.map((_, i) => { const [x, y] = pointFor(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E2E1D9" stroke-width="1"/>`; }).join("");
  const dataPts = data.map((d, i) => pointFor(i, Math.max(0, Math.min(1, d.score / 100))).join(",")).join(" ");
  const labels = data.map((d, i) => {
    const [x, y] = pointFor(i, 1.24);
    return `<text x="${x}" y="${y}" font-size="9.5" fill="#5B6577" text-anchor="middle" font-family="Inter,sans-serif">${escapeHtml(d.categorie)}</text>`;
  }).join("");
  const dots = data.map((d, i) => { const [x, y] = pointFor(i, Math.max(0, Math.min(1, d.score / 100))); return `<circle cx="${x}" cy="${y}" r="2.5" fill="#C89B3C"/>`; }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rings}${axes}<polygon points="${dataPts}" fill="#C89B3C" fill-opacity="0.32" stroke="#C89B3C" stroke-width="2"/>${dots}${labels}</svg>`;
}
function buildLineSVG(points, width, height, color) {
  if (!points.length) return "";
  const padL = 26, padR = 8, padT = 10, padB = 22;
  const w = width - padL - padR, h = height - padT - padB;
  const n = points.length;
  const xFor = i => padL + (n === 1 ? w / 2 : (w * i) / (n - 1));
  const yFor = v => padT + h - (h * v) / 100;
  const pathPts = points.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(" ");
  const grid = [0, 50, 100].map(v => `<line x1="${padL}" y1="${yFor(v)}" x2="${width - padR}" y2="${yFor(v)}" stroke="#E2E1D9" stroke-width="1"/><text x="${padL - 5}" y="${yFor(v) + 3}" font-size="7.5" fill="#B8BCC4" text-anchor="end">${v}</text>`).join("");
  const dots = points.map((p, i) => `<circle cx="${xFor(i)}" cy="${yFor(p.score)}" r="2.6" fill="${color}"/>`).join("");
  const xlabels = points.map((p, i) => `<text x="${xFor(i)}" y="${height - 6}" font-size="7.5" fill="#5B6577" text-anchor="middle">${i + 1}</text>`).join("");
  return `<svg width="${width}" height="${height}">${grid}<polyline points="${pathPts}" fill="none" stroke="${color}" stroke-width="2"/>${dots}${xlabels}</svg>`;
}
function buildProfileBodyHTML({ eleve, questionnaires, questions, categories }) {
  const validated = questionnaires.filter(q => q.eleveId === eleve.id && q.statut === "validé" && !q.supprime);
  const catStats = computeCategoryStats(validated, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const evolution = computeCategoryEvolution(validated, categories);
  const evolutionCats = Object.keys(evolution);

  const rows = categories.map(cat => {
    const vals = validated.map(q => q.scoreParCategorie?.[cat]).filter(v => v !== undefined && v !== null);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    return `<tr><td style="padding:8px 10px;border-top:1px solid #E2E1D9;">${escapeHtml(cat)}</td><td style="padding:8px 10px;border-top:1px solid #E2E1D9;font-weight:600;">${avg != null ? avg + "%" : "—"}</td></tr>`;
  }).join("");

  const evolutionBlocks = evolutionCats.map(cat => `
    <div style="border:1px solid #E2E1D9;border-radius:10px;padding:10px;display:inline-block;width:230px;vertical-align:top;margin:0 12px 12px 0;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;"><span style="width:7px;height:7px;border-radius:50%;background:${catColor(categories, cat)};display:inline-block;"></span><span style="font-size:11.5px;font-weight:600;">${escapeHtml(cat)}</span></div>
      ${buildLineSVG(evolution[cat], 210, 110, catColor(categories, cat))}
    </div>`).join("");

  return `${printHeaderHTML("Fiche élève")}
    <div style="display:flex;gap:24px;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:50%;background:#16233F;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px;">${escapeHtml(initials(eleve.prenom, eleve.nom))}</div>
      <div><div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;">${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</div>
      <div style="font-size:13px;color:#5B6577;margin-top:4px;">N° agent : ${escapeHtml(eleve.numeroAgent)} · Fonction : ${escapeHtml(eleve.fonction || "Élève")}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;"><tbody><tr><td style="padding:8px 0;color:#5B6577;width:260px;">Questionnaires répondus (validés)</td><td style="padding:8px 0;font-weight:700;">${validated.length}</td></tr></tbody></table>

    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;margin-bottom:10px;">Points forts & points faibles (vue globale)</div>
    <div style="text-align:center;margin-bottom:24px;">${validated.length ? buildRadarSVG(radarData, 320) : `<div style="font-size:12px;color:#5B6577;">Pas encore de questionnaire validé.</div>`}</div>

    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;margin-bottom:4px;">Taux de réussite par catégorie</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;"><thead><tr style="background:#F2F2EE;text-align:left;"><th style="padding:8px 10px;">Catégorie</th><th style="padding:8px 10px;">Réussite moyenne</th></tr></thead><tbody>${rows}</tbody></table>

    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;margin-bottom:4px;page-break-before:always;padding-top:16px;">Évolution par catégorie</div>
    <div style="font-size:11.5px;color:#5B6577;margin-bottom:12px;">Une catégorie n'apparaît que si au moins une question de cette catégorie a été posée à l'élève. Chaque point correspond à un questionnaire validé, dans l'ordre chronologique.</div>
    ${evolutionCats.length ? evolutionBlocks : `<div style="font-size:12px;color:#5B6577;">Pas encore assez de données.</div>`}`;
}
function buildTeamBodyHTML({ team, operators, questionnaires, questions, categories }) {
  const operatorIds = new Set(operators.map(o => o.id));
  const teamValidated = questionnaires.filter(qn => operatorIds.has(qn.eleveId) && qn.statut === "validé" && !qn.supprime);
  const catStats = computeCategoryStats(teamValidated, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const rows = operators.map(o => {
    const mine = questionnaires.filter(qn => qn.eleveId === o.id && !qn.supprime);
    const graded = mine.filter(qn => qn.statut === "validé");
    const avg = graded.length ? Math.round(graded.reduce((a, qn) => a + (qn.scoreGlobal || 0), 0) / graded.length) : null;
    return `<tr><td style="padding:8px 10px;border-top:1px solid #E2E1D9;">${escapeHtml(o.prenom)} ${escapeHtml(o.nom)}</td><td style="padding:8px 10px;border-top:1px solid #E2E1D9;">${escapeHtml(o.fonction || "Élève")}</td><td style="padding:8px 10px;border-top:1px solid #E2E1D9;">${graded.length}</td><td style="padding:8px 10px;border-top:1px solid #E2E1D9;font-weight:600;">${avg != null ? avg + "%" : "—"}</td></tr>`;
  }).join("");

  const summary = `${printHeaderHTML(`Fiche team — ${escapeHtml(team)}`)}
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;"><tbody>
      <tr><td style="padding:8px 0;color:#5B6577;width:260px;">Opérateurs</td><td style="padding:8px 0;font-weight:700;">${operators.length}</td></tr>
      <tr><td style="padding:8px 0;color:#5B6577;">Questionnaires validés (team)</td><td style="padding:8px 0;font-weight:700;">${teamValidated.length}</td></tr>
    </tbody></table>

    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;margin-bottom:10px;">Résultats globaux de la team</div>
    <div style="text-align:center;margin-bottom:24px;">${teamValidated.length ? buildRadarSVG(radarData, 320) : `<div style="font-size:12px;color:#5B6577;">Pas encore de questionnaire validé.</div>`}</div>

    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;margin-bottom:4px;">Opérateurs de la team</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#F2F2EE;text-align:left;"><th style="padding:8px 10px;">Opérateur</th><th style="padding:8px 10px;">Fonction</th><th style="padding:8px 10px;">Validés</th><th style="padding:8px 10px;">Score moyen</th></tr></thead><tbody>${rows}</tbody></table>`;

  const perOperator = operators.map(o => `<div style="page-break-before:always;padding-top:16px;">${buildProfileBodyHTML({ eleve: o, questionnaires, questions, categories })}</div>`).join("");

  return summary + perOperator;
}
function buildQuestionnairesBodyHTML({ items, questions, categories }) {
  const describe = (q, raw, langue) => {
    if (q.type === "qcm" || q.type === "vrai_faux") return raw !== undefined && raw !== null ? qChoix(q, langue)[raw] : "Sans réponse";
    if (q.type === "qcm_multi") { const sel = Array.isArray(raw) ? raw : []; return sel.length ? sel.map(i => qChoix(q, langue)[i]).join(", ") : "Sans réponse"; }
    if (q.type === "ouverte") return raw?.text?.trim() ? raw.text : "Sans réponse";
    if (q.type === "point") { const clicks = Array.isArray(raw) ? raw : (raw ? [raw] : []); return `${matchedCiblesCount(q, clicks)}/${(q.cibles || []).length} cible(s) trouvée(s), ${clicks.length - matchedCiblesCount(q, clicks)} erreur(s)`; }
    if (q.type === "legende") { const vals = Array.isArray(raw) ? raw : []; return vals.length ? vals.map((v, li) => `${li + 1}. ${v || "—"}`).join(" · ") : "Sans réponse"; }
    if (q.type === "relier") { const total = (q.paires || []).length; const n = (q.paires || []).filter((p, li) => raw && raw[li] === p.id).length; return `${n}/${total} paire(s) correcte(s)`; }
    if (q.type === "action_reaction") { const result = getResultReached(q.arbre, Array.isArray(raw) ? raw : []); return result ? `Résultat : ${result.texte} (${result.pourcentage}%)` : "Parcours inachevé"; }
    if (q.type === "ordre") { const order = Array.isArray(raw) ? raw : []; const total = (q.items || []).length; return `${correctPlacementsOrdre(q, order)}/${total} action(s) bien placée(s) : ${order.map(id => itemText((q.items || []).find(it => it.id === id), langue)).join(" → ")}`; }
    return "—";
  };
  const pointsFor = (q, raw, manual, override) => {
    if (override != null) return override;
    if (q.type === "qcm" || q.type === "vrai_faux") return raw === q.bonneReponse ? q.points : 0;
    if (q.type === "qcm_multi") return scoreQcmMulti(q, raw);
    if (q.type === "ouverte") return typeof raw?.points === "number" ? raw.points : 0;
    if (q.type === "point") return scorePoint(q, raw);
    if (q.type === "legende") return typeof manual === "number" ? manual : 0;
    if (q.type === "relier") { const total = (q.paires || []).length || 1; const n = (q.paires || []).filter((p, li) => raw && raw[li] === p.id).length; return Math.round((q.points * n) / total); }
    if (q.type === "action_reaction") { const result = getResultReached(q.arbre, Array.isArray(raw) ? raw : []); return result ? Math.round((q.points * result.pourcentage) / 100) : 0; }
    if (q.type === "ordre") return scoreOrdre(q, raw);
    return 0;
  };
  const sections = items.map(({ questionnaire: qn, eleve }, idx) => {
    const qs = qn.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    const answers = qn.reponses || [];
    const catRows = qn.scoreParCategorie ? Object.entries(qn.scoreParCategorie).map(([cat, v]) => `<tr><td style="padding:6px 8px;border-top:1px solid #E2E1D9;">${escapeHtml(cat)}</td><td style="padding:6px 8px;border-top:1px solid #E2E1D9;font-weight:600;">${v}%</td></tr>`).join("") : "";
    const qRows = qs.map((q, i) => {
      const raw = answers[i];
      const remarque = qn.remarques && qn.remarques[i] && qn.remarques[i].trim() ? `<div style="font-style:italic;color:#5B6577;margin-top:3px;">Remarque : ${escapeHtml(qn.remarques[i])}</div>` : "";
      const reference = q.reference ? `<div style="font-size:11px;color:#C89B3C;margin-top:3px;">Référence : ${escapeHtml(q.reference)}</div>` : "";
      const overridePts = qn.overrides?.[i]?.points;
      const overrideNote = overridePts != null ? `<div style="font-style:italic;color:#C89B3C;margin-top:3px;">Note modifiée manuellement${qn.overrides[i].justification ? " : " + escapeHtml(qn.overrides[i].justification) : ""}</div>` : "";
      return `<tr><td style="padding:6px 8px;border-top:1px solid #E2E1D9;">${i + 1}</td><td style="padding:6px 8px;border-top:1px solid #E2E1D9;">${escapeHtml(qText(q, eleve?.langue))}${remarque}${reference}${overrideNote}</td><td style="padding:6px 8px;border-top:1px solid #E2E1D9;">${escapeHtml(describe(q, raw, eleve?.langue))}</td><td style="padding:6px 8px;border-top:1px solid #E2E1D9;font-weight:600;">${pointsFor(q, raw, qn.manualGrades?.[i], overridePts)}/${q.points}</td></tr>`;
    }).join("");
    return `<div style="${idx < items.length - 1 ? "page-break-after:always;" : ""}margin-bottom:28px;">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;color:#16233F;margin-bottom:4px;">${escapeHtml(qn.titre)}</div>
      <div style="font-size:12.5px;color:#5B6577;margin-bottom:14px;">${escapeHtml(eleve?.prenom)} ${escapeHtml(eleve?.nom)} · ${escapeHtml(eleve?.numeroAgent)} · attribué le ${escapeHtml(qn.dateAttribution)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#F2F2EE;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
        <span style="font-size:12.5px;">Score global</span><span style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;">${qn.scoreGlobal}%</span>
      </div>
      ${catRows ? `<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px;"><thead><tr style="background:#F2F2EE;text-align:left;"><th style="padding:6px 8px;">Catégorie</th><th style="padding:6px 8px;">Score</th></tr></thead><tbody>${catRows}</tbody></table>` : ""}
      <table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#F2F2EE;text-align:left;"><th style="padding:6px 8px;">#</th><th style="padding:6px 8px;">Question</th><th style="padding:6px 8px;">Réponse</th><th style="padding:6px 8px;">Points</th></tr></thead><tbody>${qRows}</tbody></table>
    </div>`;
  }).join("");
  return `${printHeaderHTML(`Questionnaires validés (${items.length})`)}${sections}`;
}
function PrintOverlay({ job, onClose }) {
  const bodyHTML = job.type === "profile" ? buildProfileBodyHTML(job) : job.type === "team" ? buildTeamBodyHTML(job) : buildQuestionnairesBodyHTML(job);
  const filename = job.type === "profile"
    ? `fiche-${(job.eleve.nom || "eleve").toLowerCase().replace(/[^a-z]/g, "")}.html`
    : job.type === "team"
    ? `fiche-${(job.team || "team").toLowerCase().replace(/[^a-z0-9]/g, "")}.html`
    : `questionnaires-gec-${new Date().toISOString().slice(0, 10)}.html`;
  const download = () => {
    const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>G.E.C. — export</title>
      <style>body{font-family:Inter,-apple-system,sans-serif;color:#16233F;max-width:800px;margin:0 auto;padding:32px 28px;} table{width:100%;} @media print{ body{margin:0;} }</style>
      </head><body>${bodyHTML}</body></html>`;
    downloadFile(filename, fullHtml, "text/html");
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, overflowY: "auto" }}>
      <div className="no-print" style={{ position: "sticky", top: 0, background: C.navy, color: "#fff", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: ".03em" }}>Aperçu du rapport</div>
          <div style={{ fontSize: 11.5, color: "#C7CEE0", marginTop: 2 }}>Téléchargez le fichier, puis ouvrez-le dans votre navigateur pour l'imprimer ou l'enregistrer en PDF (Ctrl/Cmd+P).</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Btn variant="gold" icon={FileDown} onClick={download}>Télécharger le rapport</Btn>
          <Btn variant="ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onClose}>Fermer</Btn>
        </div>
      </div>
      <div id="visee-print-area" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 28px", fontFamily: FONT_BODY, color: C.ink }} dangerouslySetInnerHTML={{ __html: bodyHTML }} />
    </div>
  );
}

async function syncArray(table, oldArr, newArr, toRow) {
  const oldIds = new Set(oldArr.map(x => x.id));
  const newIds = new Set(newArr.map(x => x.id));
  const idMap = {};
  const insertedRows = {};
  for (const old of oldArr) {
    if (!newIds.has(old.id)) await supabase.from(table).delete().eq("id", old.id);
  }
  for (const item of newArr) {
    if (!oldIds.has(item.id)) {
      const { data, error } = await supabase.from(table).insert(toRow(item)).select().single();
      if (error) throw error;
      idMap[item.id] = data.id;
      insertedRows[item.id] = data;
    } else {
      const before = oldArr.find(o => o.id === item.id);
      if (JSON.stringify(toRow(before)) !== JSON.stringify(toRow(item))) {
        const { error } = await supabase.from(table).update(toRow(item)).eq("id", item.id);
        if (error) throw error;
      }
    }
  }
  return { idMap, insertedRows };
}

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [users, setUsersState] = useState([]);
  const [questions, setQuestionsState] = useState([]);
  const [questionnaires, setQuestionnairesState] = useState([]);
  const [categories, setCategoriesState] = useState([]);
  const [categoryConfig, setCategoryConfigState] = useState({});
  const [session, setSession] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [printJob, setPrintJob] = useState(null);

  // Au premier chargement : reprendre une session déjà ouverte (ex. après un rafraîchissement de page)
  useEffect(() => {
    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authSession.user.id).single();
        if (profile) setSession(rowToUser(profile));
      }
      setCheckingSession(false);
    })();
  }, []);

  // Chargement des données une fois la personne identifiée
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      try {
        const catsRes = await supabase.from("categories").select("*");
        if (catsRes.error) throw catsRes.error;
        setCategoriesState(catsRes.data.map(c => c.nom));
        setCategoryConfigState(Object.fromEntries(catsRes.data.map(c => [c.nom, { seuil: c.seuil, fonctions: c.fonctions }])));

        if (session.role === "eleve") {
          const qnRes = await supabase.from("questionnaires").select("*").eq("eleve_id", session.id);
          if (qnRes.error) throw qnRes.error;
          setQuestionnairesState(qnRes.data.map(rowToQuestionnaire));
          setQuestionsState([]); // chargées à la demande (voir EleveView)
          setUsersState([session]);
        } else {
          const [usersRes, qRes, qnRes] = await Promise.all([
            supabase.from("profiles").select("*"),
            supabase.from("questions").select("*"),
            supabase.from("questionnaires").select("*"),
          ]);
          if (usersRes.error || qRes.error || qnRes.error) throw (usersRes.error || qRes.error || qnRes.error);
          setUsersState(usersRes.data.map(rowToUser));
          setQuestionsState(qRes.data.map(rowToQuestion));
          setQuestionnairesState(qnRes.data.map(rowToQuestionnaire));
        }
        setLoadError(false);
      } catch (e) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.id, loadAttempt]);

  // Écoute en direct (Supabase Realtime) : quand le staff attribue un
  // nouveau questionnaire (ou valide une correction), ça apparaît chez
  // l'élève sans qu'il doive recharger la page. Volontairement limité
  // aux élèves : côté staff, l'écran est déjà mis à jour immédiatement
  // par l'action elle-même — ajouter Realtime là aussi risquerait de
  // faire apparaître un doublon le temps que l'id temporaire (créé
  // localement avant confirmation de la base) soit remplacé par le vrai.
  useEffect(() => {
    if (!session || session.role !== "eleve") return;
    const channel = supabase
      .channel(`questionnaires-eleve-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questionnaires", filter: `eleve_id=eq.${session.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setQuestionnairesState(prev => prev.some(q => q.id === payload.new.id) ? prev : [...prev, rowToQuestionnaire(payload.new)]);
        } else if (payload.eventType === "UPDATE") {
          setQuestionnairesState(prev => prev.map(q => q.id === payload.new.id ? rowToQuestionnaire(payload.new) : q));
        } else if (payload.eventType === "DELETE") {
          setQuestionnairesState(prev => prev.filter(q => q.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, session?.role]);

  // Même principe côté staff, mais limité aux mises à jour (UPDATE) :
  // quand un élève envoie ses réponses, ça apparaît dans "À valider" en
  // direct. Volontairement pas les nouvelles attributions (INSERT) —
  // celles-là, seul le staff peut les créer, et la personne qui vient
  // d'attribuer a déjà l'affichage à jour via sa propre action ; les
  // écouter aussi ferait courir le même risque de doublon évoqué plus
  // haut. Une mise à jour, elle, ne peut jamais créer de doublon
  // (elle remplace une ligne déjà là par son id réel, jamais un id
  // temporaire) — donc sans danger de l'écouter systématiquement.
  useEffect(() => {
    if (!session || session.role === "eleve") return;
    const channel = supabase
      .channel(`questionnaires-staff-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "questionnaires" }, (payload) => {
        setQuestionnairesState(prev => prev.map(q => q.id === payload.new.id ? rowToQuestionnaire(payload.new) : q));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, session?.role]);

  const login = async (pseudo, password) => {
    const email = `${pseudo.trim().toLowerCase()}@gec.internal`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Identifiant ou mot de passe incorrect." };
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (profileError || !profile) return { error: "Profil introuvable." };
    setSession(rowToUser(profile));
    return { error: null };
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null); setUsersState([]); setQuestionsState([]); setQuestionnairesState([]); setCategoriesState([]); setCategoryConfigState({});
  };

  const auteurLog = session ? `${session.prenom} ${session.nom}` : "Système";
  const setQuestions = async (newArr) => {
    const old = questions;
    setQuestionsState(newArr);
    try {
      const { idMap, insertedRows } = await syncArray("questions", old, newArr, questionToRow);
      if (Object.keys(idMap).length) setQuestionsState(prev => prev.map(q => idMap[q.id] ? { ...q, id: idMap[q.id], numero: insertedRows[q.id]?.numero ?? q.numero } : q));
      setSaveError("");
      logActivity("Question", diffEntities(old, newArr, q => `#${q.numero ?? "?"} — ${(q.enonceFr || "").slice(0, 60) || "(sans énoncé)"}`, QUESTION_LOG_FIELDS), auteurLog);
    } catch (e) { setQuestionsState(old); setSaveError(e?.message || "Erreur inconnue."); }
  };
  const setQuestionnaires = async (newArr) => {
    const old = questionnaires;
    setQuestionnairesState(newArr);
    try {
      const { idMap } = await syncArray("questionnaires", old, newArr, questionnaireToRow);
      if (Object.keys(idMap).length) setQuestionnairesState(prev => prev.map(q => idMap[q.id] ? { ...q, id: idMap[q.id] } : q));
      setSaveError("");
      logActivity("Questionnaire", diffEntities(old, newArr, qn => { const e = users.find(u => u.id === qn.eleveId); return `${qn.titre || "Questionnaire"} — ${e ? `${e.prenom} ${e.nom}` : "élève inconnu"}`; }, QUESTIONNAIRE_LOG_FIELDS), auteurLog);
    } catch (e) { setQuestionnairesState(old); setSaveError(e?.message || "Erreur inconnue."); }
  };
  const renameCategory = async (oldName, newName) => {
    const oldCats = categories; const oldConfig = categoryConfig; const oldQuestions = questions;
    setCategoriesState(categories.map(c => c === oldName ? newName : c));
    setCategoryConfigState(cfg => { const n = { ...cfg }; n[newName] = n[oldName] || { seuil: 60, fonctions: [...FONCTIONS] }; delete n[oldName]; return n; });
    setQuestionsState(qs => qs.map(q => (q.categories || []).includes(oldName) ? { ...q, categories: q.categories.map(c => c === oldName ? newName : c) } : q));
    try {
      const { error } = await supabase.from("categories").update({ nom: newName }).eq("nom", oldName);
      if (error) throw error;
      const affected = oldQuestions.filter(q => (q.categories || []).includes(oldName));
      for (const q of affected) {
        const newCats = q.categories.map(c => c === oldName ? newName : c);
        const { error: qErr } = await supabase.from("questions").update({ categories: newCats }).eq("id", q.id);
        if (qErr) throw qErr;
      }
      setSaveError("");
      logActivity("Catégorie", [{ action: "modification", description: `${oldName} → ${newName}` }], auteurLog);
    } catch (e) {
      setCategoriesState(oldCats); setCategoryConfigState(oldConfig); setQuestionsState(oldQuestions);
      setSaveError(e?.message || "Erreur inconnue.");
    }
  };
  const setCategories = async (newArr) => {
    const old = categories;
    setCategoriesState(newArr);
    try {
      const removed = old.filter(c => !newArr.includes(c));
      const added = newArr.filter(c => !old.includes(c));
      for (const c of removed) await supabase.from("categories").delete().eq("nom", c);
      for (const c of added) await supabase.from("categories").insert({ nom: c, seuil: categoryConfig[c]?.seuil ?? 60, fonctions: categoryConfig[c]?.fonctions || [...FONCTIONS] });
      setSaveError("");
      logActivity("Catégorie", [
        ...removed.map(c => ({ action: "suppression", description: c })),
        ...added.map(c => ({ action: "creation", description: c })),
      ], auteurLog);
    } catch (e) { setCategoriesState(old); setSaveError(e?.message || "Erreur inconnue."); }
  };
  const setCategoryConfig = async (newConfig) => {
    const old = categoryConfig;
    setCategoryConfigState(newConfig);
    try {
      for (const cat of Object.keys(newConfig)) {
        if (JSON.stringify(old[cat]) !== JSON.stringify(newConfig[cat])) {
          await supabase.from("categories").update({ seuil: newConfig[cat].seuil, fonctions: newConfig[cat].fonctions }).eq("nom", cat);
        }
      }
      setSaveError("");
    } catch (e) { setCategoryConfigState(old); setSaveError(e?.message || "Erreur inconnue."); }
  };
  const refreshUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setUsersState(data.map(rowToUser));
  };
  const refreshQuestionnaires = async () => {
    const { data, error } = await supabase.from("questionnaires").select("*");
    if (!error) setQuestionnairesState(data.map(rowToQuestionnaire));
  };

  const importQuestions = async (newQuestions) => {
    const rows = newQuestions.map(q => questionToRow({ ...q, numero: null }));
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await supabase.from("questions").insert(rows.slice(i, i + chunkSize));
      if (error) throw error;
    }
    const { data, error } = await supabase.from("questions").select("*");
    if (error) throw error;
    setQuestionsState(data.map(rowToQuestion));
  };

  const submitReponses = async (questionnaireId, reponses) => {
    const before = questionnaires.find(q => q.id === questionnaireId);
    setQuestionnairesState(prev => prev.map(q => q.id === questionnaireId ? { ...q, reponses, statut: "en attente de validation" } : q));
    try { await supabase.from("questionnaires").update({ reponses, statut: "en attente de validation" }).eq("id", questionnaireId); setSaveError(""); }
    catch (e) {
      setQuestionnairesState(prev => prev.map(q => q.id === questionnaireId ? before : q));
      setSaveError(e?.message || "Erreur inconnue.");
    }
  };
  const confirmRead = async (questionnaireId) => {
    const date = new Date().toISOString().slice(0, 10);
    const before = questionnaires.find(q => q.id === questionnaireId);
    setQuestionnairesState(prev => prev.map(q => q.id === questionnaireId ? { ...q, luConfirme: true, luConfirmeDate: date } : q));
    try { await supabase.from("questionnaires").update({ lu_confirme: true, lu_confirme_date: date }).eq("id", questionnaireId); setSaveError(""); }
    catch (e) {
      setQuestionnairesState(prev => prev.map(q => q.id === questionnaireId ? before : q));
      setSaveError(e?.message || "Erreur inconnue.");
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: 680, padding: 18, borderRadius: 20, position: "relative" }}>
      <FontImport />
      <PrintStyles />
      <LangProvider lang={(session && session.langue) || "fr"}>
        {checkingSession ? <LoadingScreen label="Chargement..." /> : !session ? <LoginPage onLogin={login} /> : loading ? <LoadingScreen label="Chargement des données..." /> : loadError ? (
          <div style={{ minHeight: 640, background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <AlertTriangle size={28} color={C.gold} />
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginTop: 14, fontFamily: FONT_DISPLAY }}>Impossible de charger les données</div>
            <div style={{ color: "#C7CEE0", fontSize: 13, marginTop: 8, maxWidth: 380 }}>La connexion à la base de données a échoué. Réessayez — si le problème persiste, rechargez la page.</div>
            <Btn variant="gold" style={{ marginTop: 18 }} onClick={() => { setLoadError(false); setLoadAttempt(a => a + 1); }}>Réessayer</Btn>
          </div>
        ) : session.role === "eleve" ? (
          <EleveView user={users.find(u => u.id === session.id) || session} users={users} setUsers={refreshUsers} questionnaires={questionnaires} categories={categories} onLogout={logout} submitReponses={submitReponses} confirmRead={confirmRead} saveError={saveError} />
        ) : (
          <StaffView user={session} users={users} setUsers={refreshUsers} questions={questions} setQuestions={setQuestions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} setCategories={setCategories} categoryConfig={categoryConfig} setCategoryConfig={setCategoryConfig} onLogout={logout} saveError={saveError} requestPrint={setPrintJob} onImportQuestions={importQuestions} onRenameCategory={renameCategory} refreshQuestionnaires={refreshQuestionnaires} />
        )}
      </LangProvider>
      {printJob && <PrintOverlay job={printJob} onClose={() => setPrintJob(null)} />}
    </div>
  );
}
