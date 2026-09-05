import { describe, it, expect } from "vitest";
import { pickPhoneDistractors, pickPhoneDistractorsProches, generatePhoneQuestion, TELEPHONE_TYPES } from "./components/PhoneGame.jsx";
import { TELEPHONES } from "./data/telephones.js";

// TELEPHONES (fichier statique, plus utilisé par le jeu lui-même depuis
// le passage à "Gestion des jeux") sert ici uniquement de jeu de données
// d'exemple stable pour les tests — les fonctions testées reçoivent
// maintenant la liste en paramètre plutôt que de l'importer directement.

describe("données téléphones", () => {
  it("chaque service a au moins un numéro (pax ou cisco)", () => {
    expect(TELEPHONES.every(s => s.pax || s.cisco)).toBe(true);
  });
});

describe("pickPhoneDistractors (mode normal, aléatoire)", () => {
  it("ne renvoie jamais le service correct lui-même", () => {
    const service = TELEPHONES.find(s => s.pax);
    const distractors = pickPhoneDistractors(TELEPHONES, service, "pax", 3);
    expect(distractors.every(s => s.serviceFr !== service.serviceFr)).toBe(true);
  });
  it("ne renvoie que des services ayant bien un numéro pour ce type précis", () => {
    const service = TELEPHONES.find(s => s.cisco);
    const distractors = pickPhoneDistractors(TELEPHONES, service, "cisco", 3);
    expect(distractors.every(s => !!s.cisco)).toBe(true);
  });
});

describe("pickPhoneDistractorsProches (mode Hard, numéros les plus proches DANS LE MÊME SYSTÈME)", () => {
  it("ne compare que des numéros du même système (jamais pax vs cisco)", () => {
    const service = TELEPHONES.find(s => s.pax);
    const distractors = pickPhoneDistractorsProches(TELEPHONES, service, "pax", 3);
    // Tous les distracteurs doivent avoir un numéro PAX (pas juste un
    // numéro dans n'importe quel système).
    expect(distractors.every(s => !!s.pax)).toBe(true);
  });
  it("choisit bien les numéros les plus proches parmi ceux du même système", () => {
    const service = TELEPHONES.find(s => s.cisco);
    const correctNum = parseInt(service.cisco, 10);
    const distractors = pickPhoneDistractorsProches(TELEPHONES, service, "cisco", 3);
    const distances = distractors.map(s => Math.abs(parseInt(s.cisco, 10) - correctNum));
    const autres = TELEPHONES.filter(s => s.cisco && s.serviceFr !== service.serviceFr && !distractors.includes(s));
    const autresDistances = autres.map(s => Math.abs(parseInt(s.cisco, 10) - correctNum));
    const maxChoisi = Math.max(...distances);
    const minRestant = autresDistances.length ? Math.min(...autresDistances) : Infinity;
    expect(maxChoisi).toBeLessThanOrEqual(minRestant);
  });
});

describe("generatePhoneQuestion", () => {
  it("génère toujours 4 options avec la bonne réponse dedans", () => {
    const q = generatePhoneQuestion(TELEPHONES, false);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex].serviceFr).toBe(q.correct.serviceFr);
    expect(TELEPHONE_TYPES).toContain(q.type);
  });
  it("choisit toujours un type de numéro réellement présent pour le service choisi", () => {
    for (let i = 0; i < 30; i++) {
      const q = generatePhoneQuestion(TELEPHONES, false);
      expect(q.correct[q.type]).toBeTruthy();
    }
  });
  it("en mode hard, la direction est toujours service -> numéro", () => {
    for (let i = 0; i < 20; i++) {
      const q = generatePhoneQuestion(TELEPHONES, true);
      expect(q.direction).toBe("serviceToNum");
    }
  });
});
