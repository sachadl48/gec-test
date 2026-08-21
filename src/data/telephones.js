// Liste des services et de leurs numéros internes (PAX, SISCO, Stento)
// pour le jeu des téléphones. Trois systèmes de numérotation
// indépendants, chacun avec sa propre échelle — ne jamais comparer
// un numéro PAX à un numéro Stento pour juger de leur "proximité".
// Tous les services n'ont pas les 3 numéros ; null = numéro absent
// pour ce service dans ce système.
//
// Deux services du fichier source n'avaient AUCUN numéro dans aucun
// des 3 systèmes ("Position T", "Erasme G1") — exclus ici, inutilisables
// pour le jeu. À rajouter si un numéro est retrouvé pour eux un jour.

export const TELEPHONES = [
  { serviceFr: "DP 1-5", serviceNl: "DP 1-5", pax: "971", sisco: "2331", stento: "117" },
  { serviceFr: "Regu 1-5", serviceNl: "Regu 1-5", pax: "972", sisco: null, stento: "126" },
  { serviceFr: "DP 2-6", serviceNl: "DP 2-6", pax: "951", sisco: "2332", stento: "127" },
  { serviceFr: "Regu 2-6", serviceNl: "Regu 2-6", pax: "952", sisco: null, stento: "136" },
  { serviceFr: "5e poste", serviceNl: "5e poste", pax: "991", sisco: "2333", stento: "133" },
  { serviceFr: "Security", serviceNl: "Security", pax: "7251", sisco: "3890", stento: null },
  { serviceFr: "Disp. Central", serviceNl: "Disp. Central", pax: "009", sisco: "3009", stento: "147" },
  { serviceFr: "Disp. Technique", serviceNl: "Disp. Technique", pax: "006", sisco: "3006", stento: "130" },
  { serviceFr: "Disp. Energie", serviceNl: "Disp. Energie", pax: null, sisco: "3008", stento: "153" },
  { serviceFr: "PM 1-5", serviceNl: "PM 1-5", pax: "7893", sisco: "5079", stento: null },
  { serviceFr: "PM 2-6", serviceNl: "PM 2-6", pax: "935", sisco: "2318", stento: null },
  { serviceFr: "Metzo 1-5", serviceNl: "Metzo 1-5", pax: null, sisco: "5075", stento: null },
  { serviceFr: "Metzo 2-6", serviceNl: "Metzo 2-6", pax: "936", sisco: "5322", stento: null },
  { serviceFr: "Local cond. 1-5", serviceNl: "Local cond. 1-5", pax: "7892", sisco: null, stento: null },
  { serviceFr: "Local cond. 2-6", serviceNl: "Local cond. 2-6", pax: "7880", sisco: null, stento: null },
  { serviceFr: "Dépot Brel", serviceNl: "Steelplaats Brel", pax: "860", sisco: "5661", stento: null },
  { serviceFr: "Dépot Delta", serviceNl: "Steelplaats Delta", pax: "7002", sisco: "3543", stento: null },
  { serviceFr: "Dépot Erasme", serviceNl: "Steelplaats Erasmus", pax: "84600", sisco: "5671", stento: "780" },
  { serviceFr: "Commis technique DTM", serviceNl: "Commis technique DTM", pax: "970", sisco: "3529", stento: "139" },
  { serviceFr: "Disp. Bus", serviceNl: "Disp. Bus", pax: null, sisco: "5330", stento: null },
  { serviceFr: "Disp. Tram", serviceNl: "Disp. Tram", pax: "961", sisco: "2328", stento: "128" },
  { serviceFr: "Exploitation Delta", serviceNl: "Exploitatie Delta", pax: "7027", sisco: "3393", stento: null },
  { serviceFr: "SOC", serviceNl: "SOC", pax: null, sisco: "8299", stento: null },
  { serviceFr: "Helpdesk", serviceNl: "Helpdesk", pax: null, sisco: "2288", stento: null },
  { serviceFr: "Baudouin G1", serviceNl: "Boudewijn G1", pax: "78402", sisco: null, stento: null },
  { serviceFr: "Baudouin G2", serviceNl: "Boudewijn G2", pax: "7827", sisco: null, stento: null },
  { serviceFr: "Heizel GH", serviceNl: "Heysel GH", pax: "7827", sisco: null, stento: null },
  { serviceFr: "Heizel GB", serviceNl: "Heysel GB", pax: "7827", sisco: null, stento: null },
  { serviceFr: "Bockstael G", serviceNl: "Bockstael G", pax: "7757", sisco: null, stento: null },
  { serviceFr: "Simonis G3", serviceNl: "Simonis G3", pax: "7774", sisco: null, stento: null },
  { serviceFr: "Simonis G4", serviceNl: "Simonis G4", pax: "7767", sisco: null, stento: null },
  { serviceFr: "Brel S23", serviceNl: "Brel S23", pax: "862", sisco: null, stento: null },
  { serviceFr: "Brel S24", serviceNl: "Brel S24", pax: "863", sisco: null, stento: null },
  { serviceFr: "Delacroix V4", serviceNl: "Delacroix V5", pax: "374", sisco: null, stento: null },
  { serviceFr: "P. de Hal G", serviceNl: "Hallepoort G", pax: "347", sisco: null, stento: null },
  { serviceFr: "Elisabeth G5", serviceNl: "Elisabeth G5", pax: "195", sisco: null, stento: null },
  { serviceFr: "Elisabeth G6", serviceNl: "Elisabeth G6", pax: "196", sisco: null, stento: null },
  { serviceFr: "Elisabeth G7", serviceNl: "Elisabeth G7", pax: "197", sisco: null, stento: null },
  { serviceFr: "Elisabeth V3", serviceNl: "Elisabeth S3", pax: "471", sisco: null, stento: null },
  { serviceFr: "Elisabeth V4", serviceNl: "Elisabeth S4", pax: "472", sisco: null, stento: null },
  { serviceFr: "Elisabeth local glissement", serviceNl: "Elisabeth local glissement", pax: "476", sisco: null, stento: null },
  { serviceFr: "Stockel G", serviceNl: "Stokkel G", pax: "164", sisco: null, stento: null },
  { serviceFr: "Stockel G", serviceNl: "Stokkel G", pax: "170", sisco: null, stento: null },
  { serviceFr: "Hermann G", serviceNl: "Hermann G", pax: "264", sisco: null, stento: null },
  { serviceFr: "Delta S31", serviceNl: "Delta S31", pax: "7042", sisco: null, stento: null },
  { serviceFr: "Delta S51", serviceNl: "Delta S51", pax: "7046", sisco: null, stento: null },
  { serviceFr: "Delta S72", serviceNl: "Delta S72", pax: "7045", sisco: null, stento: null },
  { serviceFr: "Shuman G", serviceNl: "Shuman G", pax: "191", sisco: null, stento: null },
  { serviceFr: "Ouest v3", serviceNl: "West S3", pax: "7733", sisco: null, stento: null },
  { serviceFr: "Ouest v4", serviceNl: "West S4", pax: "7734", sisco: null, stento: null },
  { serviceFr: "Ouest v6", serviceNl: "West S6", pax: "7736", sisco: null, stento: null },
  { serviceFr: "Ouest G", serviceNl: "West G", pax: "7735", sisco: null, stento: null },
  { serviceFr: "St-Guidon G", serviceNl: "St-Guido", pax: "7704", sisco: null, stento: null },
  { serviceFr: "Veeweyde G", serviceNl: "Veeweide G", pax: "7697", sisco: null, stento: null },
  { serviceFr: "Erasme G2", serviceNl: "Erasmus G2", pax: "84648", sisco: null, stento: null },
];
