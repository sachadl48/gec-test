import { describe, it, expect } from "vitest";
import { generateAbreviationQuestion } from "./components/AbbreviationGame.jsx";
import { generateTraductionQuestion, pickTraductionDistractors } from "./components/TranslationGame.jsx";
import { ABREVIATIONS } from "./data/abreviations.js";
import { TRADUCTIONS } from "./data/traductions.js";

// ABREVIATIONS/TRADUCTIONS (fichiers statiques, plus utilisés par les
// jeux eux-mêmes depuis le passage à "Gestion des jeux") servent ici
// uniquement de jeux de données d'exemple stables pour les tests — les
// mauvaises réponses des abréviations sont désormais tirées au hasard à
// chaque partie, plus fixées dans la donnée (voir la conversation avec
// Sacha à ce sujet).

describe("données", () => {
  it("chaque abréviation a bien un acronyme et une signification", () => {
    expect(ABREVIATIONS.every(a => a.acronyme && a.correct)).toBe(true);
  });
  it("chaque traduction a bien un terme FR et un terme NL", () => {
    expect(TRADUCTIONS.every(t => t.fr && t.nl)).toBe(true);
  });
});

describe("generateAbreviationQuestion", () => {
  it("génère toujours 4 options (ou moins si la liste est très courte) avec la bonne réponse dedans", () => {
    const q = generateAbreviationQuestion(ABREVIATIONS);
    expect(q.options.length).toBeGreaterThanOrEqual(2);
    expect(q.options.length).toBeLessThanOrEqual(4);
    expect(q.options[q.correctIndex]).toBeTruthy();
    const entry = ABREVIATIONS.find(a => a.acronyme === q.acronyme && a.correct === q.options[q.correctIndex]);
    expect(entry).toBeTruthy();
  });
  it("les mauvaises réponses proposées viennent bien d'un AUTRE acronyme, jamais du même", () => {
    for (let i = 0; i < 20; i++) {
      const q = generateAbreviationQuestion(ABREVIATIONS);
      const mauvaisesOptions = q.options.filter((_, i) => i !== q.correctIndex);
      const memeAcronymeQueLaBonneReponse = mauvaisesOptions.some(opt =>
        ABREVIATIONS.some(a => a.acronyme === q.acronyme && a.correct === opt)
      );
      expect(memeAcronymeQueLaBonneReponse).toBe(false);
    }
  });
});

describe("pickTraductionDistractors", () => {
  it("ne renvoie jamais le terme correct lui-même", () => {
    const correct = TRADUCTIONS[0];
    const distractors = pickTraductionDistractors(TRADUCTIONS, correct, 3);
    expect(distractors.every(t => t.fr !== correct.fr)).toBe(true);
  });
});

describe("generateTraductionQuestion", () => {
  it("génère toujours 4 options avec la bonne réponse dedans", () => {
    const q = generateTraductionQuestion(TRADUCTIONS);
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex].fr).toBe(q.correct.fr);
  });
});
