import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BadgeCheck, CheckCircle2, CheckSquare, ChevronDown, ChevronUp, Edit2, Eye, FileDown, Hash,
  HelpCircle, Image as ImageIcon, Link2, MessageSquare, PauseCircle, Plus, Search, Shuffle,
  Square, Tag, Timer, Trash2, Upload, X, XCircle,
} from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { TYPE_META, typeLabel, AR_COLOR, AR_LABEL } from "../data/questionTypes.js";
import { genId } from "../utils/id.js";
import { qText, qChoix, itemText } from "../utils/bilingual.js";
import { stripAccents, normalizeText, findCategoryMatch } from "../utils/userAccount.js";
import { isFullyCorrect, countTreeResults, validateActionTree } from "../utils/scoring.js";
import {
  Btn, Field, inputStyle, Badge, StatusBadge, CategoryBadges, TypeBadge, Modal, EmptyState,
  ConfirmDialog, InfoDialog, SectionTitle, MediaField,
} from "./atoms.jsx";
import { QuestionPreviewModal } from "./QuestionPreviewModal.jsx";
import { CategoryManager } from "./CategoryManager.jsx";

const IMPORT_LETTER_TO_IDX = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

// Toute la page "Gestion des questions" : import Excel bilingue (avec
// extraction des images intégrées aux cellules, en lisant directement la
// structure ZIP/XML du fichier), liste de la banque de questions, éditeur
// complet (tous les types), et l'éditeur d'arbre Action/Réaction.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

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

export function ImportQuestions({ categories, onImport, onClose }) {
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
export function GestionQuestions({ questions, setQuestions, categories, setCategories, categoryConfig, setCategoryConfig, isAdmin, onImportQuestions, onRenameCategory, questionnaires, users, currentUser }) {
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
  const [lockError, setLockError] = useState("");
  const VERROU_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes : au-delà, on considère le verrou abandonné (fermeture de navigateur sans clic sur Annuler/Fermer)

  // Ouvre une question pour édition, après avoir vérifié directement en
  // base (pas seulement l'état local, même synchronisé en direct) que
  // personne d'autre ne l'a déjà ouverte récemment.
  const openEdit = async (q) => {
    setLockError("");
    if (!q.id) { setModal(q); return; } // nouvelle question : rien à verrouiller
    const { data } = await supabase.from("questions").select("verrouille_par, verrouille_le").eq("id", q.id).single();
    const lockedBy = data?.verrouille_par;
    const lockedAt = data?.verrouille_le;
    const estPerime = !lockedAt || (Date.now() - new Date(lockedAt).getTime()) > VERROU_EXPIRATION_MS;
    if (lockedBy && lockedBy !== currentUser?.id && !estPerime) {
      const qui = users?.find(u => u.id === lockedBy);
      setLockError(t("question_verrouillee_msg", { nom: qui ? `${qui.prenom} ${qui.nom}` : t("quelquun_dautre") }));
      return;
    }
    await supabase.from("questions").update({ verrouille_par: currentUser?.id || null, verrouille_le: new Date().toISOString() }).eq("id", q.id);
    setModal(q);
  };
  // Referme l'éditeur en libérant systématiquement le verrou — que la
  // fermeture vienne d'un Annuler ou d'un Enregistrer réussi.
  const closeEdit = async () => {
    if (modal?.id) {
      await supabase.from("questions").update({ verrouille_par: null, verrouille_le: null }).eq("id", modal.id);
    }
    setModal(null);
  };
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
  const save = (data) => { if (data.id) setQuestions(questions.map(q => q.id === data.id ? data : q)); else setQuestions([...questions, { ...data, id: genId("q"), numero: null }]); closeEdit(); };
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
    return <QuestionEditor initial={modal} categories={categories} onClose={closeEdit} onSave={save} />;
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
                <Btn variant="subtle" icon={Edit2} onClick={() => openEdit(q)} style={{ padding: "6px 10px" }} />
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
      {lockError && (
        <InfoDialog title={t("question_verrouillee_titre")} message={lockError} onClose={() => setLockError("")} />
      )}
      {previewing && <QuestionPreviewModal question={previewing} categories={categories} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
export function ActionReactionNode({ node, onUpdate, onDelete, isRoot }) {
  const addActionChild = () => onUpdate({ ...node, enfants: [...(node.enfants || []), { id: genId("ar"), type: "action", texteFr: "", texteNl: "", enfants: [] }] });
  const addTypedChild = (type) => onUpdate({ ...node, enfants: [{ id: genId("ar"), type, texteFr: "", texteNl: "", pourcentage: type === "resultat" ? 50 : undefined, enfants: [] }] });
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
          value={node.texteFr}
          onChange={e => onUpdate({ ...node, texteFr: e.target.value })}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          placeholder={(node.type === "evenement" ? "Décrivez la situation... (FR)" : node.type === "action" ? "Décrivez l'action choisie... (FR)" : "Décrivez le résultat final... (FR)")}
          style={{ ...inputStyle, minHeight: 40, fontSize: 12.5, resize: "none", padding: "6px 8px", overflow: "hidden", marginBottom: 5 }}
        />
        <textarea
          value={node.texteNl}
          onChange={e => onUpdate({ ...node, texteNl: e.target.value })}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          placeholder={(node.type === "evenement" ? "Beschrijf de situatie... (NL)" : node.type === "action" ? "Beschrijf de gekozen actie... (NL)" : "Beschrijf het eindresultaat... (NL)")}
          style={{ ...inputStyle, minHeight: 40, fontSize: 12.5, resize: "none", padding: "6px 8px", overflow: "hidden" }}
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

// Migre récursivement un arbre Action/Réaction depuis l'ancien format
// (un seul champ "texte") vers le nouveau format bilingue, sans rien perdre :
// le texte existant devient la version FR par défaut.
function migrateArbreBilingue(node) {
  if (!node) return node;
  return {
    ...node,
    texteFr: node.texteFr ?? node.texte ?? "",
    texteNl: node.texteNl ?? "",
    enfants: (node.enfants || []).map(migrateArbreBilingue),
  };
}
export function QuestionEditor({ initial, categories, onClose, onSave }) {
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
    paires: initial.paires && initial.paires.length
      ? initial.paires.map(p => ({ id: p.id, gaucheFr: p.gaucheFr ?? p.gauche ?? "", gaucheNl: p.gaucheNl ?? "", droiteFr: p.droiteFr ?? p.droite ?? "", droiteNl: p.droiteNl ?? "" }))
      : [{ id: genId("pr"), gaucheFr: "", gaucheNl: "", droiteFr: "", droiteNl: "" }, { id: genId("pr"), gaucheFr: "", gaucheNl: "", droiteFr: "", droiteNl: "" }],
    arbre: initial.arbre ? migrateArbreBilingue(initial.arbre) : { id: genId("ar"), type: "evenement", texteFr: "", texteNl: "", enfants: [] },
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
  const addPaire = () => { if (form.paires.length >= 10) return; setForm({ ...form, paires: [...form.paires, { id: genId("pr"), gaucheFr: "", gaucheNl: "", droiteFr: "", droiteNl: "" }] }); };
  const removePaire = (i) => { if (form.paires.length <= 2) return; setForm({ ...form, paires: form.paires.filter((_, pi) => pi !== i) }); };
  const updatePaire = (i, field, v) => setForm({ ...form, paires: form.paires.map((p, pi) => pi === i ? { ...p, [field]: v } : p) });

  const [showSuspendPopup, setShowSuspendPopup] = useState(false);
  const [suspendRemark, setSuspendRemark] = useState(initial.remarqueSuspension || "");
  const canSave = form.enonceFr.trim() && form.enonceNl.trim() && form.categories.length > 0
    && (form.type !== "point" || (form.media?.type === "image" && (form.cibles || []).length > 0))
    && (form.type !== "legende" || (form.media?.type === "image" && form.marqueurs.length > 0 && form.marqueurs.every(m => m.reponse.trim())))
    && ((form.type !== "qcm" && form.type !== "vrai_faux") || (form.choixFr.every(c => c.trim()) && form.choixNl.every(c => c.trim())))
    && (form.type !== "qcm_multi" || (form.choixFr.every(c => c.trim()) && form.choixNl.every(c => c.trim()) && form.bonnesReponses.length > 0))
    && (form.type !== "relier" || form.paires.every(p => p.gaucheFr.trim() && p.gaucheNl.trim() && p.droiteFr.trim() && p.droiteNl.trim()))
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {form.paires.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkSoft, minWidth: 16, marginTop: 8 }}>{i + 1}</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input style={inputStyle} placeholder={`${t("element_gauche_placeholder")} (FR)`} value={p.gaucheFr} onChange={e => updatePaire(i, "gaucheFr", e.target.value)} />
                    <Link2 size={14} color={C.inkSoft} style={{ flexShrink: 0 }} />
                    <input style={inputStyle} placeholder={`${t("element_droite_placeholder")} (FR)`} value={p.droiteFr} onChange={e => updatePaire(i, "droiteFr", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input style={inputStyle} placeholder={`${t("element_gauche_placeholder")} (NL)`} value={p.gaucheNl} onChange={e => updatePaire(i, "gaucheNl", e.target.value)} />
                    <Link2 size={14} color="transparent" style={{ flexShrink: 0 }} />
                    <input style={inputStyle} placeholder={`${t("element_droite_placeholder")} (NL)`} value={p.droiteNl} onChange={e => updatePaire(i, "droiteNl", e.target.value)} />
                  </div>
                </div>
                {form.paires.length > 2 && <Btn variant="danger" icon={Trash2} onClick={() => removePaire(i)} style={{ padding: "6px 8px", marginTop: 2 }} />}
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

