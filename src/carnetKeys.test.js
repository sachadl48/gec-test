import { describe, it, expect } from "vitest";
import { getCompetenceGlobale, getCritereValeur } from "./utils/carnetKeys.js";

const volet = { titre: "Regulation", criteres: [{}, {}] };

describe("getCompetenceGlobale (repli ancien format -> nouveau format stable)", () => {
  it("lit l'ancien format positionnel si c'est tout ce qui existe", () => {
    const jour = { competencesGlobales: { 0: 3 } };
    expect(getCompetenceGlobale(jour, volet, 0)).toBe(3);
  });
  it("lit le nouveau format stable (par nom) s'il existe", () => {
    const jour = { competencesGlobales: { Regulation: 4 } };
    expect(getCompetenceGlobale(jour, volet, 0)).toBe(4);
  });
  it("le nouveau format prend toujours le dessus si les deux sont présents", () => {
    const jour = { competencesGlobales: { 0: 3, Regulation: 4 } };
    expect(getCompetenceGlobale(jour, volet, 0)).toBe(4);
  });
  it("ne plante pas si le jour n'a aucune note", () => {
    expect(getCompetenceGlobale({}, volet, 0)).toBeUndefined();
  });

  // Le scénario exact qui avait causé le bug initial : une note entrée à
  // la position 0 doit continuer à s'afficher correctement même après
  // qu'une compétence ait été insérée avant elle, décalant les positions —
  // à condition que ce soit bien lu via la clé stable (nom), pas la position.
  it("résiste à une réorganisation de l'ordre des compétences (le cas qui avait cassé l'affichage)", () => {
    const jourAvantReorg = { competencesGlobales: { Regulation: 5 } }; // déjà migré
    const voletApresReorg = { titre: "Regulation", criteres: [{}, {}] };
    const nouvelIndexApresReorg = 3; // la compétence a été déplacée plus loin dans la liste
    expect(getCompetenceGlobale(jourAvantReorg, voletApresReorg, nouvelIndexApresReorg)).toBe(5);
  });
});

describe("getCritereValeur (même repli pour les sous-compétences)", () => {
  it("lit l'ancien format positionnel (vi-ci) si c'est tout ce qui existe", () => {
    const jour = { criteres: { "0-1": 2 } };
    expect(getCritereValeur(jour, volet, 0, 1)).toBe(2);
  });
  it("lit le nouveau format stable (titre-ci) s'il existe", () => {
    const jour = { criteres: { "Regulation-1": 5 } };
    expect(getCritereValeur(jour, volet, 0, 1)).toBe(5);
  });
  it("le nouveau format prend le dessus si les deux sont présents", () => {
    const jour = { criteres: { "0-1": 2, "Regulation-1": 5 } };
    expect(getCritereValeur(jour, volet, 0, 1)).toBe(5);
  });
});
