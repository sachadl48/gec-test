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
import { groupePoste } from "../data/carnetDisplay.js";
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
// Construit une nouvelle ligne "vierge" de la feuille Commentaire_Journalier,
// avec un style raisonnable (repris d'une ligne normale du modèle) — pour
// les jours au-delà de ce que prévoyait le modèle d'origine (35 jours) :
// jours solo, ou formation prolongée au-delà de 35 jours avec moniteur.
const COMMENTAIRE_ROW_STYLES = { A: "23", B: "30", C: "23", D: "23", E: "23", F: "31", G: "32", H: "91" };
export function buildEmptyCommentaireRowXml(rowNum) {
  const cells = ["A", "B", "C", "D", "E", "F", "G", "H"].map(col => `<c r="${col}${rowNum}" s="${COMMENTAIRE_ROW_STYLES[col]}"/>`).join("");
  return `<row r="${rowNum}" spans="1:8">${cells}</row>`;
}
// Insère une nouvelle ligne au bon endroit dans le XML (juste avant la
// première ligne existante de numéro supérieur, ou en fin de tableau sinon)
// — l'ordre croissant des lignes doit être respecté pour qu'Excel ouvre le
// fichier sans le "réparer".
export function insertRowXmlAt(sheetXml, rowNum, newRowXml) {
  const rowRe = /<row r="(\d+)"[^>]*>.*?<\/row>/gs;
  let m, insertPos = null;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    if (parseInt(m[1], 10) > rowNum) { insertPos = m.index; break; }
  }
  if (insertPos !== null) return sheetXml.slice(0, insertPos) + newRowXml + sheetXml.slice(insertPos);
  return sheetXml.replace("</sheetData>", newRowXml + "</sheetData>");
}
// Comme setCellInSheetXml, mais crée la ligne si elle n'existe pas encore
// dans le modèle, au lieu de l'ignorer silencieusement — utilisé uniquement
// pour Commentaire_Journalier, où chaque jour a besoin de sa propre ligne
// (contrairement aux feuilles de compétences, où seule la colonne varie).
export function setCellInSheetXmlEnsuringRow(sheetXml, addr, value, isText) {
  if (value === null || value === undefined) return sheetXml;
  const rowNum = addr.match(/\d+/)[0];
  const rowRe = new RegExp(`<row r="${rowNum}"[^>]*>.*?</row>`, "s");
  if (!sheetXml.match(rowRe)) sheetXml = insertRowXmlAt(sheetXml, parseInt(rowNum, 10), buildEmptyCommentaireRowXml(rowNum));
  const m = sheetXml.match(rowRe);
  if (!m) return sheetXml; // sécurité, ne devrait plus arriver
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
    sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `A${row}`, jourData.moniteurNom, true);
    sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `B${row}`, jourData.date, true);
    if (jourData.poste) {
      sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `C${row}`, jourData.poste, true);
      sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `D${row}`, groupePoste(jourData.poste), true);
    }
    sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `E${row}`, jourData.commentaireHumain, true);
    sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `F${row}`, jourData.commentaireTechnique, true);
    sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `G${row}`, jourData.incidentsRencontres, true);
    // "Résumé de la semaine" : la colonne H est fusionnée par blocs de 5 lignes
    // (H5:H9, H10:H14, ...) — il faut écrire sur la PREMIÈRE ligne du bloc
    // (la cellule "maîtresse" de la fusion), pas sur la ligne du jour lui-même.
    // Au-delà de la ligne 39 (jour 35), le modèle ne définit plus cette
    // fusion — le texte s'écrit quand même, mais seulement dans la cellule
    // de la 5e ligne du bloc, sans s'étaler visuellement sur les 5 lignes.
    if (jourData.resumeSemaine && jourData.numero % 5 === 0) {
      sheetXml = setCellInSheetXmlEnsuringRow(sheetXml, `H${row - 4}`, jourData.resumeSemaine, true);
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
// Décale la numérotation des jours solo pour qu'ils s'enchaînent juste
// après le dernier jour réel avec moniteur — jamais un "35" fixe, sinon
// une formation prolongée au-delà de 35 jours ferait chevaucher les
// numéros des jours solo avec les derniers jours réguliers.
export function offsetRegSoloJours(joursReg, joursRegSolo) {
  return (joursRegSolo || []).map(j => ({ ...j, numero: j.numero + (joursReg || []).length }));
}

export async function exportCarnetExcel(eleve) {
  const resp = await fetch("/carnet-modele.xlsx");
  const buf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const carnet = eleve.carnet || {};
  const joursReg = carnet.reg || [];
  const joursRegSolo = offsetRegSoloJours(joursReg, carnet.regSolo);
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
