import { describe, it, expect } from "vitest";
import {
  colForJour, colLetterToNum, setCellInRow, setCellInSheetXml,
  fillCompetencesSheet, fillCommentaireJournalier,
} from "./utils/excelExport.js";
import { EXCEL_ROW_MAP_REGULATEUR, EXCEL_ROW_MAP_DISPATCHEUR } from "./data/excelRowMap.js";
import { VOLETS_REGULATEUR, VOLETS_DISPATCHEUR } from "./data/competences.js";
import { groupePoste, POSTES_REGULATEUR, POSTES_DISPATCHEUR } from "./data/carnetDisplay.js";

describe("colForJour (numéro de jour -> lettre de colonne Excel)", () => {
  // Non-régression : jour 1 doit tomber en colonne D, pas E. Un bug de
  // décalage de +1 était passé inaperçu jusqu'à un test manuel complet.
  it("jour 1 correspond bien à la colonne D", () => {
    expect(colForJour(1)).toBe("D");
  });
  it("jour 5 correspond à la colonne H", () => {
    expect(colForJour(5)).toBe("H");
  });
  it("jour 36 (1er jour solo régulateur) correspond à la colonne AM", () => {
    expect(colForJour(36)).toBe("AM");
  });
});

describe("colLetterToNum (lettre de colonne -> numéro, pour le tri)", () => {
  // Non-régression : cette fonction a un jour reçu une adresse complète
  // ("A5") au lieu de juste la lettre ("A"), donnant un numéro de tri
  // absurde et provoquant un fichier Excel jugé corrompu par Excel.
  it("ignore un numéro de ligne accolé à la lettre", () => {
    expect(colLetterToNum("A5")).toBe(colLetterToNum("A"));
    expect(colLetterToNum("A")).toBe(1);
  });
  it("respecte l'ordre alphabétique simple", () => {
    expect(colLetterToNum("A")).toBeLessThan(colLetterToNum("B"));
    expect(colLetterToNum("G")).toBeLessThan(colLetterToNum("H"));
  });
});

describe("setCellInRow (insertion chirurgicale d'une cellule dans une ligne)", () => {
  // Non-régression directe du bug d'ordre : dans cette ligne réelle
  // (extraite du modèle), la colonne G n'existe pas au départ ; l'ajouter
  // ne doit jamais la faire apparaître avant A.
  const row5 = '<row r="5" spans="1:12"><c r="A5"/><c r="B5" s="25"/><c r="C5"/><c r="D5"/><c r="E5"/><c r="F5" s="26"/><c r="H5" s="92"/></row>';

  it("insère une nouvelle cellule (G, absente à l'origine) au bon endroit, entre F et H", () => {
    const result = setCellInRow(row5, "G5", "RAS", true);
    const order = [...result.matchAll(/<c r="([A-Z]+)\d+"/g)].map(m => m[1]);
    expect(order).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("garde l'ordre correct même après plusieurs insertions successives (comme lors d'un vrai export)", () => {
    let row = row5;
    for (const col of ["A", "B", "C", "D", "E", "F", "G"]) {
      row = setCellInRow(row, `${col}5`, `valeur-${col}`, true);
    }
    const order = [...row.matchAll(/<c r="([A-Z]+)\d+"/g)].map(m => m[1]);
    expect(order).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("préserve le style existant (s=\"25\") en modifiant la valeur d'une cellule déjà présente", () => {
    const result = setCellInRow(row5, "B5", "12/08/2026", true);
    expect(result).toContain('s="25"');
  });
});

describe("fillCompetencesSheet (grille de notes Régulateur/Dispatcheur)", () => {
  const volets = [
    { titre: "Regulation", criteres: [{}, {}] },
    { titre: "Safety", criteres: [{}] },
  ];
  const rowMap = {
    Regulation: { headerRow: 7, criteriaRows: [8, 9] },
    Safety: { headerRow: 14, criteriaRows: [15] },
  };
  // squelette minimal imitant la structure réelle du modèle (lignes vides stylées)
  const sheetXml = `<sheetData>
    <row r="7" spans="2:10"><c r="D7" s="1"/></row>
    <row r="8" spans="2:10"><c r="D8" s="1"/></row>
    <row r="9" spans="2:10"><c r="D9" s="1"/></row>
    <row r="14" spans="2:10"><c r="D14" s="1"/></row>
    <row r="15" spans="2:10"><c r="D15" s="1"/></row>
  </sheetData>`;

  it("place la note globale sur la ligne d'en-tête de la compétence", () => {
    const jour = { numero: 1, competencesGlobales: { 0: 3 }, criteres: {} };
    const result = fillCompetencesSheet(sheetXml, [jour], rowMap, volets);
    expect(result).toMatch(/<c r="D7"[^>]*><v>3<\/v><\/c>/);
  });

  it("place la note d'une sous-compétence sur sa propre ligne, pas sur celle de l'en-tête", () => {
    const jour = { numero: 1, competencesGlobales: {}, criteres: { "0-1": 2 } };
    const result = fillCompetencesSheet(sheetXml, [jour], rowMap, volets);
    expect(result).toMatch(/<c r="D9"[^>]*><v>2<\/v><\/c>/); // 2e critère de Regulation = ligne 9
  });

  it("n'écrit rien pour un jour sans aucune note (pas de case vide forcée à 0)", () => {
    const jour = { numero: 1, competencesGlobales: {}, criteres: {} };
    const result = fillCompetencesSheet(sheetXml, [jour], rowMap, volets);
    expect(result).toBe(sheetXml); // rien n'a dû changer
    expect(result).not.toContain("<v>");
  });
});

describe("fillCommentaireJournalier (journal quotidien, résumé de semaine fusionné)", () => {
  const sheetXml = `<sheetData>
    <row r="5" spans="1:12"><c r="A5"/><c r="B5"/><c r="C5"/><c r="D5"/><c r="E5"/><c r="F5"/><c r="G5"/><c r="H5"/></row>
    <row r="9" spans="1:12"><c r="A9"/><c r="H9"/></row>
  </sheetData>`;

  it("place le nom du moniteur et met DTM en colonne D si un poste est renseigné", () => {
    const jour = { numero: 1, moniteurNom: "Dupont", date: "12/08/2026", poste: "P11" };
    const result = fillCommentaireJournalier(sheetXml, [jour], 0);
    expect(result).toContain("Dupont");
    expect(result).toMatch(/<c r="D5"[^>]*>.*DTM/s);
  });

  it("le résumé de semaine (jour multiple de 5) s'écrit sur la 1ère ligne du bloc fusionné, pas la dernière", () => {
    // Non-régression : H5:H9 est une cellule fusionnée sur 5 lignes dans le
    // vrai modèle — écrire sur H9 (la dernière ligne, comme le code le
    // faisait initialement) est invisible dans Excel, seule H5 compte.
    const jour = { numero: 5, resumeSemaine: "Bonne semaine" };
    const result = fillCommentaireJournalier(sheetXml, [jour], 0);
    expect(result).toMatch(/<c r="H5"[^>]*>.*Bonne semaine/s);
    expect(result).not.toMatch(/<c r="H9"[^>]*>.*Bonne semaine/s);
  });

  it("n'écrit pas de résumé de semaine pour un jour qui n'en a pas (pas multiple de 5)", () => {
    const jour = { numero: 3, resumeSemaine: "Ne devrait pas apparaître" };
    const result = fillCommentaireJournalier(sheetXml, [jour], 0);
    expect(result).not.toContain("Ne devrait pas apparaître");
  });
});

describe("intégrité de la table de correspondance des lignes Excel", () => {
  it("chaque compétence du régulateur référencée dans EXCEL_ROW_MAP existe bien dans VOLETS_REGULATEUR", () => {
    for (const titre of Object.keys(EXCEL_ROW_MAP_REGULATEUR)) {
      expect(VOLETS_REGULATEUR.some(v => v.titre === titre), `"${titre}" absent de VOLETS_REGULATEUR`).toBe(true);
    }
  });
  it("chaque compétence du dispatcheur référencée dans EXCEL_ROW_MAP existe bien dans VOLETS_DISPATCHEUR", () => {
    for (const titre of Object.keys(EXCEL_ROW_MAP_DISPATCHEUR)) {
      expect(VOLETS_DISPATCHEUR.some(v => v.titre === titre), `"${titre}" absent de VOLETS_DISPATCHEUR`).toBe(true);
    }
  });
  it("le nombre de sous-critères déclaré correspond au nombre réel de critères du volet", () => {
    for (const [titre, info] of Object.entries(EXCEL_ROW_MAP_REGULATEUR)) {
      const volet = VOLETS_REGULATEUR.find(v => v.titre === titre);
      expect(info.criteriaRows.length, `"${titre}" : nombre de lignes ≠ nombre de critères`).toBe(volet.criteres.length);
    }
  });
});

describe("groupePoste (lieu réel pour l'export Excel, colonne 'Lieu Salle/MTC')", () => {
  it("FOR donne MTC", () => {
    expect(groupePoste("FOR")).toBe("MTC");
    expect(groupePoste("for")).toBe("MTC"); // insensible à la casse
  });
  it("tout poste commençant par R donne Réseau", () => {
    expect(groupePoste("R1")).toBe("Réseau");
    expect(groupePoste("R5")).toBe("Réseau");
    expect(groupePoste("r3")).toBe("Réseau");
  });
  it("tout le reste donne DTM", () => {
    expect(groupePoste("P11")).toBe("DTM");
    expect(groupePoste("23")).toBe("DTM");
    expect(groupePoste("P13")).toBe("DTM");
  });
  it("gère une valeur vide sans planter", () => {
    expect(groupePoste("")).toBe("");
    expect(groupePoste(null)).toBe("");
  });
  it("chaque poste réel des deux filières retombe bien sur un groupe valide", () => {
    for (const p of [...POSTES_REGULATEUR, ...POSTES_DISPATCHEUR]) {
      expect(["DTM", "Réseau", "MTC"]).toContain(groupePoste(p));
    }
  });
});
