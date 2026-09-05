import { describe, it, expect } from "vitest";
import { computeMatieresRecap, MATIERES_ACTIONS } from "./data/matieresActions.js";

describe("computeMatieresRecap", () => {
  it("compte bien 0 occurrence pour un élément jamais fait", () => {
    const recap = computeMatieresRecap([{ numero: 1, matieresFaites: {} }]);
    expect(recap.every(r => r.count === 0)).toBe(true);
  });

  it("retrouve les bonnes occurrences (jour, moniteur, date) pour un élément fait plusieurs fois", () => {
    const jours = [
      { numero: 3, moniteurComplet: "Jean Dupont", date: "05/09/2026", matieresFaites: { position_t: true } },
      { numero: 7, moniteurComplet: "Marie Martin", date: "12/09/2026", matieresFaites: { position_t: true, tag_elisabeth: true } },
      { numero: 9, moniteurComplet: "Jean Dupont", date: "14/09/2026", matieresFaites: {} },
    ];
    const recap = computeMatieresRecap(jours);
    const positionT = recap.find(r => r.cle === "position_t");
    expect(positionT.count).toBe(2);
    expect(positionT.occurrences.map(o => o.numero)).toEqual([3, 7]);
    const tag = recap.find(r => r.cle === "tag_elisabeth");
    expect(tag.count).toBe(1);
    expect(tag.occurrences[0]).toEqual({ numero: 7, moniteur: "Marie Martin", date: "12/09/2026" });
  });

  it("renvoie bien une entrée par élément de la liste, même sans aucun jour", () => {
    const recap = computeMatieresRecap([]);
    expect(recap).toHaveLength(MATIERES_ACTIONS.length);
  });

  it("ne plante pas si des jours n'ont pas encore de matieresFaites du tout", () => {
    const recap = computeMatieresRecap([{ numero: 1 }, { numero: 2, matieresFaites: null }]);
    expect(recap.every(r => r.count === 0)).toBe(true);
  });

  it("ne plante pas avec une liste de jours vide ou absente", () => {
    expect(computeMatieresRecap([])).toHaveLength(MATIERES_ACTIONS.length);
    expect(computeMatieresRecap(undefined)).toHaveLength(MATIERES_ACTIONS.length);
  });
});
