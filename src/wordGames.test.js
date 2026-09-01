import { describe, it, expect } from "vitest";
import { generateAbreviationQuestion } from "./components/AbbreviationGame.jsx";
import { generateTraductionQuestion, pickTraductionDistractors } from "./components/TranslationGame.jsx";
import { ABREVIATIONS } from "./data/abreviations.js";
import { TRADUCTIONS } from "./data/traductions.js";

describe("données", () => {
  it("chaque abréviation a bien exactement 3 mauvaises réponses", () => {
    expect(ABREVIATIONS.every(a => a.mauvaises.length === 3)).toBe(true);
  });
  it("aucune mauvaise réponse n'est identique à la bonne, pour une même entrée", () => {
    expect(ABREVIATIONS.every(a => !a.mauvaises.includes(a.correct))).toBe(true);
  });
  it("chaque traduction a bien un terme FR et un terme NL", () => {
    expect(TRADUCTIONS.every(t => t.fr && t.nl)).toBe(true);
  });
});

describe("generateAbreviationQuestion", () => {
  it("génère toujours 4 options avec la bonne réponse dedans", () => {
    const q = generateAbreviationQuestion();
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex]).toBe(q.options[q.correctIndex]);
    const entry = ABREVIATIONS.find(a => a.acronyme === q.acronyme && a.correct === q.options[q.correctIndex]);
    expect(entry).toBeTruthy();
  });
});

describe("pickTraductionDistractors", () => {
  it("ne renvoie jamais le terme correct lui-même", () => {
    const correct = TRADUCTIONS[0];
    const distractors = pickTraductionDistractors(correct, 3);
    expect(distractors.every(t => t.fr !== correct.fr)).toBe(true);
  });
});

describe("generateTraductionQuestion", () => {
  it("génère toujours 4 options avec la bonne réponse dedans", () => {
    const q = generateTraductionQuestion();
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correctIndex].fr).toBe(q.correct.fr);
  });
});
