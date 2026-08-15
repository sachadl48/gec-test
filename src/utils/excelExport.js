// Export du carnet vers le modèle Excel "Carnet_d_élève.xlsx".
//
// Volontairement PAS de librairie "haut niveau" (xlsx, exceljs) pour cette
// tâche : ces librairies réinterprètent tout le classeur en mémoire, et
// perdent au passage ce qu'elles ne modélisent pas — notamment les
// graphiques natifs Excel (confirmé : exceljs les supprime entièrement,
// c'est un manque connu et assumé du projet). Un fichier .xlsx est en
// réalité une archive ZIP de fichiers XML — on modifie ici uniquement le
// texte des quelques feuilles concernées, cellule par cellule, et tout le
// reste de l'archive (styles, graphiques, dessins) est recopié à l'identique.
//
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

import JSZip from "jszip";
import { getCompetenceGlobale, getCritereValeur } from "./carnetKeys.js";
import { VOLETS_REGULATEUR, VOLETS_DISPATCHEUR } from "../data/competences.js";
import { EXCEL_ROW_MAP_REGULATEUR, EXCEL_ROW_MAP_DISPATCHEUR } from "../data/excelRowMap.js";

// ============================================================
// Export du carnet vers le modèle Excel "Carnet_d_élève.xlsx"
// ============================================================

export function colForJour(n) {
  return colLetterFromIndex(2 + n); // jour 1 = colonne D (index 3, 0-indexé)
}
export function colLetterFromIndex(idx) {
  let s = "", n = idx + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
export function colLetterToNum(letter) {
  const lettersOnly = letter.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of lettersOnly) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function escapeXmlText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
export function cellXml(addr, styleAttr, value, isText) {
  const style = styleAttr ? ` s="${styleAttr}"` : "";
  if (isText) return `<c r="${addr}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(value)}</t></is></c>`;
  return `<c r="${addr}"${style}><v>${value}</v></c>`;
}
// Modifie une ligne XML de feuille pour y injecter/remplacer une cellule
// précise, en conservant le style existant de la cellule (attribut s="...")
// et en respectant l'ordre des colonnes attendu par Excel.
export function setCellInRow(rowXml, addr, value, isText) {
  const cellRe = /<c r="([A-Z]+\d+)"([^>]*?)(\/>|>(.*?)<\/c>)/gs;
  const cells = [];
  let m, found = false;
  while ((m = cellRe.exec(rowXml)) !== null) {
    const cAddr = m[1];
    if (cAddr === addr) {
      found = true;
      const styleMatch = (m[2] || "").match(/s="(\d+)"/);
      cells.push({ col: colLetterToNum(cAddr), xml: cellXml(addr, styleMatch ? styleMatch[1] : null, value, isText) });
    } else {
      cells.push({ col: colLetterToNum(cAddr), xml: m[0] });
    }
  }
  if (!found) cells.push({ col: colLetterToNum(addr.match(/^[A-Z]+/)[0]), xml: cellXml(addr, null, value, isText) });
  cells.sort((a, b) => a.col - b.col);
  const rowOpen = rowXml.match(/^<row[^>]*>/)[0];
  return rowOpen + cells.map(c => c.xml).join("") + "</row>";
}
export function setCellInSheetXml(sheetXml, addr, value, isText) {
  if (value === null || value === undefined) return sheetXml;
  const rowNum = addr.match(/\d+/)[0];
  const rowRe = new RegExp(`<row r="${rowNum}"[^>]*>.*?</row>`, "s");
  const m = sheetXml.match(rowRe);
  if (!m) return sheetXml; // ligne hors du modèle (au-delà de ce qui était prévu) : ignorée silencieusement
  return sheetXml.replace(rowRe, setCellInRow(m[0], addr, value, isText));
}
export function fillCompetencesSheet(sheetXml, jours, rowMap, volets) {
  for (const jourData of jours) {
    const col = colForJour(jourData.numero);
    volets.forEach((volet, vi) => {
      const info = rowMap[volet.titre];
      if (!info) return;
      sheetXml = setCellInSheetXml(sheetXml, `${col}${info.headerRow}`, getCompetenceGlobale(jourData, volet, vi), false);
      volet.criteres.forEach((crit, ci) => {
        const rowNum = info.criteriaRows[ci];
        if (rowNum == null) return;
        sheetXml = setCellInSheetXml(sheetXml, `${col}${rowNum}`, getCritereValeur(jourData, volet, vi, ci), false);
      });
    });
  }
  return sheetXml;
}
export function fillCommentaireJournalier(sheetXml, jours, rowOffset) {
  for (const jourData of jours) {
    const row = 5 + rowOffset + (jourData.numero - 1);
    sheetXml = setCellInSheetXml(sheetXml, `A${row}`, jourData.moniteurNom, true);
    sheetXml = setCellInSheetXml(sheetXml, `B${row}`, jourData.date, true);
    if (jourData.poste) {
      sheetXml = setCellInSheetXml(sheetXml, `C${row}`, jourData.poste, true);
      sheetXml = setCellInSheetXml(sheetXml, `D${row}`, "DTM", true);
    }
    sheetXml = setCellInSheetXml(sheetXml, `E${row}`, jourData.commentaireHumain, true);
    sheetXml = setCellInSheetXml(sheetXml, `F${row}`, jourData.commentaireTechnique, true);
    sheetXml = setCellInSheetXml(sheetXml, `G${row}`, jourData.incidentsRencontres, true);
    // "Résumé de la semaine" : la colonne H est fusionnée par blocs de 5 lignes
    // (H5:H9, H10:H14, ...) — il faut écrire sur la PREMIÈRE ligne du bloc
    // (la cellule "maîtresse" de la fusion), pas sur la ligne du jour lui-même.
    if (jourData.resumeSemaine && jourData.numero % 5 === 0) {
      sheetXml = setCellInSheetXml(sheetXml, `H${row - 4}`, jourData.resumeSemaine, true);
    }
  }
  return sheetXml;
}
// Retrouve, pour un nom de feuille donné, le chemin de son fichier XML interne
// (xl/worksheets/sheetN.xml) — passe par workbook.xml + les relations plutôt
// que de supposer un numéro fixe, au cas où l'ordre des feuilles changerait.
export async function resolveCarnetSheetPath(zip, sheetName) {
  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const sheetMatch = workbookXml.match(new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*r:id="(rId\\d+)"`));
  if (!sheetMatch) return null;
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const relMatch = relsXml.match(new RegExp(`Id="${sheetMatch[1]}"[^>]*Target="([^"]+)"`));
  if (!relMatch) return null;
  return "xl/" + relMatch[1];
}

// Fonction principale : construit et déclenche le téléchargement du carnet
// Excel rempli pour un élève donné.
//
// Volontairement PAS de librairie "haut niveau" (xlsx, exceljs) pour cette
// tâche : ces librairies réinterprètent tout le classeur en mémoire, et
// perdent au passage ce qu'elles ne modélisent pas — notamment les
// graphiques natifs Excel (confirmé : exceljs les supprime entièrement,
// c'est un manque connu et assumé du projet). Un fichier .xlsx est en
// réalité une archive ZIP de fichiers XML — on modifie ici uniquement le
// texte des quelques feuilles concernées, cellule par cellule, et tout le
// reste de l'archive (styles, graphiques, dessins) est recopié à l'identique.
export async function exportCarnetExcel(eleve) {
  const resp = await fetch("/carnet-modele.xlsx");
  const buf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const carnet = eleve.carnet || {};
  const joursReg = carnet.reg || [];
  const joursRegSolo = (carnet.regSolo || []).map(j => ({ ...j, numero: j.numero + 35 }));
  const joursDisp = carnet.disp || [];

  const pathCJ = await resolveCarnetSheetPath(zip, "Commentaire_Journalier");
  const pathReg = await resolveCarnetSheetPath(zip, "Régulateur");
  const pathDisp = await resolveCarnetSheetPath(zip, "Dispatcher");

  if (pathReg) {
    let xml = await zip.file(pathReg).async("string");
    xml = fillCompetencesSheet(xml, [...joursReg, ...joursRegSolo], EXCEL_ROW_MAP_REGULATEUR, VOLETS_REGULATEUR);
    zip.file(pathReg, xml);
  }
  if (pathDisp) {
    let xml = await zip.file(pathDisp).async("string");
    xml = fillCompetencesSheet(xml, joursDisp, EXCEL_ROW_MAP_DISPATCHEUR, VOLETS_DISPATCHEUR);
    zip.file(pathDisp, xml);
  }
  if (pathCJ) {
    let xml = await zip.file(pathCJ).async("string");
    xml = fillCommentaireJournalier(xml, [...joursReg, ...joursRegSolo], 0);
    xml = fillCommentaireJournalier(xml, joursDisp, joursReg.length + joursRegSolo.length);
    zip.file(pathCJ, xml);
  }

  const outBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(outBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Carnet_${eleve.prenom}_${eleve.nom}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
