import { describe, it, expect } from "vitest";
import { pickDistractors, pickDistractorsProches, generateStationQuestion } from "./components/StationGame.jsx";
import { STATIONS } from "./data/stations.js";

describe("pickDistractors (mode facile, aléatoire)", () => {
  it("ne renvoie jamais la station correcte elle-même", () => {
    const correct = STATIONS[0];
    const distractors = pickDistractors(correct, 3);
    expect(distractors.every(s => s.numero !== correct.numero)).toBe(true);
  });
  it("renvoie bien le nombre demandé", () => {
    expect(pickDistractors(STATIONS[0], 3)).toHaveLength(3);
  });
});

describe("pickDistractorsProches (mode Hard, numéros les plus proches)", () => {
  it("renvoie les stations dont le numéro est le plus proche du bon", () => {
    // On construit une petite liste artificielle pour tester précisément
    // le tri par distance, indépendamment des vraies données du réseau.
    const correct = { numero: 14, fr: "Alma", nl: "Alma" };
    const distractors = pickDistractorsProches(correct, 3);
    // Les distracteurs doivent être les stations réelles les plus proches
    // par numéro — jamais des numéros pris au hasard dans tout le réseau.
    const distances = distractors.map(s => Math.abs(s.numero - 14));
    const autresDistances = STATIONS.filter(s => s.numero !== 14 && !distractors.includes(s)).map(s => Math.abs(s.numero - 14));
    const maxChoisi = Math.max(...distances);
    const minRestant = autresDistances.length ? Math.min(...autresDistances) : Infinity;
    expect(maxChoisi).toBeLessThanOrEqual(minRestant);
  });
  it("ne renvoie jamais la station correcte elle-même", () => {
    const correct = STATIONS[10];
    const distractors = pickDistractorsProches(correct, 3);
    expect(distractors.every(s => s.numero !== correct.numero)).toBe(true);
  });
});

describe("generateStationQuestion", () => {
  it("génère toujours 4 options avec la bonne réponse dedans", () => {
    const q = generateStationQuestion(false);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex].numero).toBe(q.correct.numero);
  });
  it("fonctionne aussi en mode hard (true)", () => {
    const q = generateStationQuestion(true);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex].numero).toBe(q.correct.numero);
  });
});
