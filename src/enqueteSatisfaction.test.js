import { describe, it, expect } from "vitest";
import { extraireMoniteursCarnet } from "./components/Carnet.jsx";
import { computeMoniteurRadarData } from "./data/enqueteSatisfaction.js";
import { filiereNotesPour } from "./components/profileShared.jsx";

describe("extraireMoniteursCarnet (liste des moniteurs figée à la création de l'enquête de satisfaction — identifiés par id, pas par nom)", () => {
  it("extrait les moniteurs distincts par id (ouvertParId), toutes sections confondues", () => {
    const carnet = {
      reg: [{ ouvertParId: "id-jean", moniteurComplet: "Jean Dupont" }, { ouvertParId: "id-marie", moniteurComplet: "Marie Martin" }, { ouvertParId: "id-jean", moniteurComplet: "Jean Dupont" }],
      regSolo: [{ ouvertParId: "id-marie", moniteurComplet: "Marie Martin" }],
      disp: [{ ouvertParId: "id-paul", moniteurComplet: "Paul Petit" }],
    };
    const result = extraireMoniteursCarnet(carnet);
    expect(result.map(m => m.nom).sort()).toEqual(["Jean Dupont", "Marie Martin", "Paul Petit"]);
    expect(result.every(m => m.id)).toBe(true);
  });
  it("se replie sur moniteurNom si moniteurComplet est absent (anciennes données)", () => {
    const carnet = { reg: [{ ouvertParId: "id-jean", moniteurComplet: null, moniteurNom: "Dupont" }] };
    const result = extraireMoniteursCarnet(carnet);
    expect(result).toEqual([{ id: "id-jean", nom: "Dupont" }]);
  });
  it("ignore les jours sans moniteur (pas encore ouverts) sans planter", () => {
    const carnet = { reg: [{ ouvertParId: null }, { ouvertParId: "id-jean", moniteurComplet: "Jean Dupont" }] };
    const result = extraireMoniteursCarnet(carnet);
    expect(result).toEqual([{ id: "id-jean", nom: "Jean Dupont" }]);
  });
  it("renvoie une liste vide plutôt que de planter si le carnet est vide ou absent", () => {
    expect(extraireMoniteursCarnet(null)).toEqual([]);
    expect(extraireMoniteursCarnet({})).toEqual([]);
    expect(extraireMoniteursCarnet(undefined)).toEqual([]);
  });
});

describe("computeMoniteurRadarData (alimente les graphiques de performances des moniteurs — filtre par id, pas par nom)", () => {
  const enquete = (id, nom, notes) => ({
    statut: "terminee",
    reponses: { moniteurs: [{ id, nom, questions: Object.fromEntries(Object.entries(notes).map(([cle, note]) => [cle, { note }])) }] },
  });

  it("calcule bien la moyenne, ramenée en pourcentage (note 5/5 -> 100%)", () => {
    const enquetes = [enquete("id-jean", "Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 })];
    const data = computeMoniteurRadarData(enquetes, null, "fr");
    expect(data.every(d => d.score === 100)).toBe(true);
  });

  it("fait bien la moyenne entre plusieurs enquêtes pour le même moniteur", () => {
    const enquetes = [
      enquete("id-jean", "Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 }),
      enquete("id-jean", "Jean Dupont", { maitrise: 1, reponses_techniques: 1, accessibilite: 1, participation: 1, engagement: 1 }),
    ];
    const data = computeMoniteurRadarData(enquetes, null, "fr");
    // (5+1)/2 = 3 -> 3/5 = 60%
    expect(data.every(d => d.score === 60)).toBe(true);
  });

  it("le graphique personnel (filterId) ignore bien les notes des autres moniteurs, même en cas d'homonymie", () => {
    const enquetes = [
      enquete("id-jean", "Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 }),
      enquete("id-autre-jean", "Jean Dupont", { maitrise: 1, reponses_techniques: 1, accessibilite: 1, participation: 1, engagement: 1 }),
    ];
    const data = computeMoniteurRadarData(enquetes, "id-jean", "fr");
    expect(data.every(d => d.score === 100)).toBe(true);
  });

  it("renvoie 0 plutôt que de planter (division par zéro) si aucune donnée pour ce moniteur", () => {
    const data = computeMoniteurRadarData([], "id-inexistant", "fr");
    expect(data.every(d => d.score === 0)).toBe(true);
    expect(data).toHaveLength(5);
  });

  it("utilise bien les libellés NL quand demandé", () => {
    const data = computeMoniteurRadarData([], null, "nl");
    expect(data.map(d => d.competence)).toContain("Beheersing");
  });
});

describe("filiereNotesPour (les notes obligatoires doivent rester visibles après le diplôme)", () => {
  it("ramène un élève encore en formation vers sa propre filière (identité)", () => {
    expect(filiereNotesPour("Élève régulateur")).toBe("Élève régulateur");
    expect(filiereNotesPour("Élève dispatcheur")).toBe("Élève dispatcheur");
  });
  it("ramène un opérateur déjà diplômé vers la filière élève correspondante, pas vers sa fonction actuelle", () => {
    expect(filiereNotesPour("Régulateur")).toBe("Élève régulateur");
    expect(filiereNotesPour("Dispatcheur")).toBe("Élève dispatcheur");
  });
  it("renvoie null pour une fonction inconnue ou absente, sans planter", () => {
    expect(filiereNotesPour(undefined)).toBe(null);
    expect(filiereNotesPour(null)).toBe(null);
    expect(filiereNotesPour("Autre chose")).toBe(null);
  });
});
