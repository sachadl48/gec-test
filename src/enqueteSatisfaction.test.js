import { describe, it, expect } from "vitest";
import { extraireMoniteursCarnet } from "./components/Carnet.jsx";
import { computeMoniteurRadarData } from "./data/enqueteSatisfaction.js";

describe("extraireMoniteursCarnet (liste des moniteurs figée à la création de l'enquête de satisfaction)", () => {
  it("extrait les noms distincts, toutes sections confondues (reg, regSolo, disp)", () => {
    const carnet = {
      reg: [{ moniteurNom: "Jean Dupont" }, { moniteurNom: "Marie Martin" }, { moniteurNom: "Jean Dupont" }],
      regSolo: [{ moniteurNom: "Marie Martin" }],
      disp: [{ moniteurNom: "Paul Petit" }],
    };
    const result = extraireMoniteursCarnet(carnet);
    expect(result.map(m => m.nom).sort()).toEqual(["Jean Dupont", "Marie Martin", "Paul Petit"]);
  });
  it("ignore les jours sans moniteur (pas encore ouverts) sans planter", () => {
    const carnet = { reg: [{ moniteurNom: null }, { moniteurNom: "" }, { moniteurNom: "Jean Dupont" }] };
    const result = extraireMoniteursCarnet(carnet);
    expect(result).toEqual([{ nom: "Jean Dupont" }]);
  });
  it("renvoie une liste vide plutôt que de planter si le carnet est vide ou absent", () => {
    expect(extraireMoniteursCarnet(null)).toEqual([]);
    expect(extraireMoniteursCarnet({})).toEqual([]);
    expect(extraireMoniteursCarnet(undefined)).toEqual([]);
  });
});

describe("computeMoniteurRadarData (alimente les graphiques de performances des moniteurs)", () => {
  const enquete = (nom, notes) => ({
    statut: "terminee",
    reponses: { moniteurs: [{ nom, questions: Object.fromEntries(Object.entries(notes).map(([cle, note]) => [cle, { note }])) }] },
  });

  it("calcule bien la moyenne, ramenée en pourcentage (note 5/5 -> 100%)", () => {
    const enquetes = [enquete("Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 })];
    const data = computeMoniteurRadarData(enquetes, null, "fr");
    expect(data.every(d => d.score === 100)).toBe(true);
  });

  it("fait bien la moyenne entre plusieurs enquêtes pour le même moniteur", () => {
    const enquetes = [
      enquete("Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 }),
      enquete("Jean Dupont", { maitrise: 1, reponses_techniques: 1, accessibilite: 1, participation: 1, engagement: 1 }),
    ];
    const data = computeMoniteurRadarData(enquetes, null, "fr");
    // (5+1)/2 = 3 -> 3/5 = 60%
    expect(data.every(d => d.score === 60)).toBe(true);
  });

  it("le graphique personnel (filterNom) ignore bien les notes des autres moniteurs", () => {
    const enquetes = [
      enquete("Jean Dupont", { maitrise: 5, reponses_techniques: 5, accessibilite: 5, participation: 5, engagement: 5 }),
      enquete("Marie Martin", { maitrise: 1, reponses_techniques: 1, accessibilite: 1, participation: 1, engagement: 1 }),
    ];
    const data = computeMoniteurRadarData(enquetes, "Jean Dupont", "fr");
    expect(data.every(d => d.score === 100)).toBe(true);
  });

  it("renvoie 0 plutôt que de planter (division par zéro) si aucune donnée pour ce moniteur", () => {
    const data = computeMoniteurRadarData([], "Personne Inexistante", "fr");
    expect(data.every(d => d.score === 0)).toBe(true);
    expect(data).toHaveLength(5);
  });

  it("utilise bien les libellés NL quand demandé", () => {
    const data = computeMoniteurRadarData([], null, "nl");
    expect(data.map(d => d.competence)).toContain("Beheersing");
  });
});
