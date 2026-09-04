import { describe, it, expect } from "vitest";
import { extraireMoniteursCarnet } from "./components/Carnet.jsx";

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
