import { describe, it, expect } from "vitest";
import { dateFrToIso, dateIsoToFr } from "./components/Carnet.jsx";

describe("dateFrToIso / dateIsoToFr (conversion pour le champ date modifiable du carnet)", () => {
  it("convertit correctement du format stocké (JJ/MM/AAAA) vers le format ISO attendu par <input type=\"date\">", () => {
    expect(dateFrToIso("05/08/2026")).toBe("2026-08-05");
  });
  it("convertit correctement dans l'autre sens", () => {
    expect(dateIsoToFr("2026-08-05")).toBe("05/08/2026");
  });
  it("fait un aller-retour sans perte", () => {
    const original = "17/01/2027";
    expect(dateIsoToFr(dateFrToIso(original))).toBe(original);
  });
  it("gère une date vide ou absente sans planter", () => {
    expect(dateFrToIso("")).toBe("");
    expect(dateFrToIso(null)).toBe("");
    expect(dateIsoToFr("")).toBe(null);
  });
});
