// Correspondance ligne-par-ligne entre les compétences de l'app et les
// vraies lignes du modèle Excel "carnet-modele.xlsx" (feuilles Régulateur
// et Dispatcher), pour l'export du carnet.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export const EXCEL_ROW_MAP_REGULATEUR = {
  "Regulation": { headerRow: 7, criteriaRows: [8, 9, 10, 11, 12] },
  "Safety": { headerRow: 14, criteriaRows: [15, 16, 17, 18] },
  "Multi Tasking": { headerRow: 19, criteriaRows: [20, 21, 22, 23] },
  "SYREM Généralité": { headerRow: 24, criteriaRows: [25, 26, 27, 28, 29, 30, 31, 32] },
  "PEX": { headerRow: 33, criteriaRows: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
  "Factory Link": { headerRow: 51, criteriaRows: [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65] },
  "GCTR": { headerRow: 66, criteriaRows: [67, 68, 69, 70, 71, 72, 73, 74, 75] },
  "Généralités": { headerRow: 76, criteriaRows: [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90] },
  "Administratif": { headerRow: 91, criteriaRows: [92, 93, 94, 95] },
  "Respect des règles": { headerRow: 97, criteriaRows: [98, 99, 100] },
  "IRIS/Qualité": { headerRow: 101, criteriaRows: [102, 103, 104, 105, 106, 107] },
  "Communication": { headerRow: 108, criteriaRows: [109, 110, 111, 112, 113, 114] },
  "client et info-voyageur": { headerRow: 115, criteriaRows: [116, 117, 118, 119] },
  "Envie d'apprendre": { headerRow: 120, criteriaRows: [121, 122, 123, 124, 125, 126] },
  "Gestion stress & Comportement": { headerRow: 127, criteriaRows: [128, 129, 130, 131, 132, 133, 134, 135] },
  "Hermès": { headerRow: 137, criteriaRows: [138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190] },
  "Crew Management (Hermès)": { headerRow: 191, criteriaRows: [192, 193, 194, 195, 196] },
};

export const EXCEL_ROW_MAP_DISPATCHEUR = {
  "Gestion d'incident": { headerRow: 7, criteriaRows: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  "Safety": { headerRow: 23, criteriaRows: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
  "Travaux / Travaux de nuit": { headerRow: 49, criteriaRows: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62] },
  "Multi Tasking": { headerRow: 64, criteriaRows: [65, 66, 67, 68] },
  "SYREM Généralité": { headerRow: 70, criteriaRows: [71, 72] },
  "PEX": { headerRow: 74, criteriaRows: [75] },
  "Factory Link": { headerRow: 77, criteriaRows: [] },
  "GCTR": { headerRow: 80, criteriaRows: [] },
  "Généralités": { headerRow: 83, criteriaRows: [] },
  "Administratif": { headerRow: 86, criteriaRows: [87] },
  "Respect des règles": { headerRow: 90, criteriaRows: [91, 92] },
  "IRIS/Qualité": { headerRow: 94, criteriaRows: [95, 96, 97, 98] },
  "Communication": { headerRow: 100, criteriaRows: [101, 102] },
  "client et info-voyageur": { headerRow: 104, criteriaRows: [105] },
  "Envie d'apprendre": { headerRow: 107, criteriaRows: [108, 109, 110, 111, 112, 113] },
  "Gestion stress & Comportement": { headerRow: 114, criteriaRows: [115, 116, 117, 118, 119, 120, 121, 122, 123] },
  "Hermès": { headerRow: 124, criteriaRows: [] },
  "Crew Management (Hermès)": { headerRow: 127, criteriaRows: [] },
};
