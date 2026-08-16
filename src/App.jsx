import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase, callEdgeFunction } from "./lib/supabaseClient.js";
import { rowToUser, rowToQuestion, questionToRow, rowToQuestionnaire, questionnaireToRow } from "./lib/mappers.js";
import { LANGS, useLang, LangProvider } from "./lang.jsx";
import { TYPE_META, typeLabel, AR_COLOR, AR_LABEL } from "./data/questionTypes.js";
import { FONCTIONS, TEAMS, FONCTION_LABELS, fonctionLabel, fonctionColor } from "./data/fonctions.js";
import { catColor } from "./utils/categoryColor.js";
import { stripAccents, normalizeText, findCategoryMatch, makePseudo, agentPassword } from "./utils/userAccount.js";
import { diffEntities, logActivity, USER_LOG_FIELDS, QUESTION_LOG_FIELDS, QUESTIONNAIRE_LOG_FIELDS } from "./utils/activityLog.js";
import {
  Btn, Field, inputStyle, Badge, StatusBadge, CategoryBadges, TypeBadge, Modal, EmptyState,
  ConfirmDialog, InfoDialog, SectionTitle, Header, LoadingScreen, SaveErrorBanner, MediaField, StatCard,
} from "./components/atoms.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { ActionReactionPlayer, RelierQuestion, ExamMode } from "./components/ExamMode.jsx";
import { ExamIntro } from "./components/ExamIntro.jsx";
import { StationGame } from "./components/StationGame.jsx";
import { EleveDetailView, ProfilModal } from "./components/profileShared.jsx";
import { GestionProfils } from "./components/GestionProfils.jsx";
import { CarnetPersonnel, CarnetsEleves } from "./components/Carnet.jsx";
import { QuestionPreviewModal } from "./components/QuestionPreviewModal.jsx";
import { CategoryManager } from "./components/CategoryManager.jsx";
import { ImportQuestions, GestionQuestions, ActionReactionNode, QuestionEditor } from "./components/GestionQuestions.jsx";
import { GestionQuestionnaires, AttribuerQuestionnaire, ListeQuestionnaires, AnalysisView } from "./components/GestionQuestionnaires.jsx";
import { AdminPage, GestionComptes, CompteModal } from "./components/GestionComptes.jsx";
import { EleveView } from "./components/EleveView.jsx";
import { StaffView } from "./components/StaffView.jsx";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO, PALETTE } from "./theme.js";
import { T } from "./data/translations.js";
import { VOLETS_REGULATEUR, VOLETS_DISPATCHEUR } from "./data/competences.js";
import { EXCEL_ROW_MAP_REGULATEUR, EXCEL_ROW_MAP_DISPATCHEUR } from "./data/excelRowMap.js";
import { POSTES, COTATION_SCALE, VOLET_CLUSTERS_REGULATEUR, VOLET_CLUSTERS_DISPATCHEUR, RADAR_GROUPS, EVOLUTION_GRAPHS, EVOLUTION_COLORS } from "./data/carnetDisplay.js";
import { qText, qChoix, itemText, paireText, arNodeText } from "./utils/bilingual.js";
import { genId } from "./utils/id.js";
import {
  shuffle, initials, getResultReached, walkTrail, countTreeResults, validateActionTree,
  pointsPerAnswerOf, scoreQcmMulti, correctPlacementsOrdre, scoreOrdre, matchedCiblesCount,
  scorePoint, isFullyCorrect, computeCategoryStats, computeCategoryEvolution,
} from "./utils/scoring.js";
import { getCompetenceGlobale, getCritereValeur, moyenneCategorieCarnet, computeRadarCarnet, computeEvolutionCarnet } from "./utils/carnetKeys.js";
import { colForJour, colLetterFromIndex, colLetterToNum, cellXml, setCellInRow, setCellInSheetXml, fillCompetencesSheet, fillCommentaireJournalier, resolveCarnetSheetPath, exportCarnetExcel } from "./utils/excelExport.js";
import * as XLSX from "xlsx";
import {
  Home, Users, HelpCircle, ClipboardList, ShieldCheck, Plus, Trash2,
  Edit2, CheckCircle2, XCircle, Search, X, TrendingUp, TrendingDown,
  Lock, BadgeCheck, ClipboardCheck, Eye,
  RotateCcw, AlertTriangle, PlayCircle, Upload,
  Hash, XCircle as XCircleIcon,
  ExternalLink, FileDown, Printer, MessageSquare, CheckSquare, Square,
  Link2, Timer, BookCheck, ChevronUp, ChevronDown, Image as ImageIcon,
  PauseCircle, Gamepad2
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

/* ---------------------------------- TOKENS ---------------------------------- */

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

/* ---------------------------------- MAPPING BASE DE DONNÉES ↔ APPLICATION ---------------------------------- */

/* ---------------------------------- OUTILS DIVERS ---------------------------------- */


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


/* ---------------------------------- ÉLÈVE VIEW ---------------------------------- */

/* ---------------------------------- STAFF (MONITEUR / ADMIN) ---------------------------------- */

/* ------------------------- MA TEAM ------------------------- */

/* ------------------------- GESTION DES CATÉGORIES ------------------------- */
/* ------------------------- GESTION QUESTIONS ------------------------- */
/* ------------------------- GESTION QUESTIONNAIRES ------------------------- */

/* ------------------------- GESTION COMPTES (ADMIN) ------------------------- */

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
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;"><tbody><tr><td style="padding:8px 0;color:#5B6577;width:260px;">Questionnaires répondus (validés)</td><td style="padding:8px 0;font-weight:700;">${validated.length}</td></tr><tr><td style="padding:8px 0;color:#5B6577;">Record jeu des stations</td><td style="padding:8px 0;font-weight:700;">${eleve.jeuStationsMeilleurScore || 0}</td></tr></tbody></table>

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
    if (q.type === "action_reaction") { const result = getResultReached(q.arbre, Array.isArray(raw) ? raw : []); return result ? `Résultat : ${arNodeText(result, langue)} (${result.pourcentage}%)` : "Parcours inachevé"; }
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

  // Synchro en direct des profils (carnet compris) : quand un autre membre
  // du staff ouvre/ferme un jour de carnet — ou modifie tout autre champ
  // d'un profil — ça se reflète immédiatement, sans devoir rafraîchir.
  // Réservé au staff, comme les questionnaires ci-dessus.
  useEffect(() => {
    if (!session || session.role === "eleve") return;
    const channel = supabase
      .channel(`profiles-staff-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        setUsersState(prev => prev.map(u => u.id === payload.new.id ? rowToUser(payload.new) : u));
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
