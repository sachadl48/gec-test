import { describe, it, expect } from "vitest";
import { parseDateFr, computeFormationTimelineRows, computeBarPosition, formationTimelineWindow } from "./utils/formationTimeline.js";

describe("parseDateFr", () => {
  it("convertit correctement une date au format JJ/MM/AAAA", () => {
    const d = parseDateFr("15/03/2026");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // mars = index 2
    expect(d.getDate()).toBe(15);
  });
  it("renvoie null pour une date vide, absente ou invalide", () => {
    expect(parseDateFr("")).toBe(null);
    expect(parseDateFr(null)).toBe(null);
    expect(parseDateFr(undefined)).toBe(null);
  });
});

describe("computeFormationTimelineRows", () => {
  const base = { role: "eleve", prenom: "Jean", nom: "Dupont" };

  it("ne garde que les élèves actuellement en formation (pas diplômés, pas ratés)", () => {
    const users = [
      { ...base, id: "1", fonction: "Élève régulateur" },
      { ...base, id: "2", fonction: "Régulateur" }, // diplômé -> exclu
      { ...base, id: "3", fonction: "Élève dispatcheur", formationStatut: "echouee" }, // raté -> exclu
      { ...base, id: "4", role: "moniteur", fonction: "Élève régulateur" }, // pas un élève -> exclu
    ];
    const rows = computeFormationTimelineRows(users);
    expect(rows.map(r => r.id)).toEqual(["1"]);
  });

  it("utilise les dates de la filière régulateur pour un élève régulateur, dispatcheur pour un élève dispatcheur", () => {
    const users = [
      { ...base, id: "1", fonction: "Élève régulateur", carnet: { regFormationDebut: "01/01/2026", regFormationFin: "01/03/2026", dispFormationDebut: "99/99/9999" } },
      { ...base, id: "2", fonction: "Élève dispatcheur", carnet: { dispFormationDebut: "01/02/2026", dispFormationFin: "01/04/2026" } },
    ];
    const rows = computeFormationTimelineRows(users);
    expect(rows[0].dateDebut.getMonth()).toBe(0); // janvier, pas la date dispFormationDebut invalide
    expect(rows[1].dateDebut.getMonth()).toBe(1); // février
  });

  it("renvoie des dates null (pas une erreur) si le carnet n'a pas encore de dates", () => {
    const rows = computeFormationTimelineRows([{ ...base, id: "1", fonction: "Élève régulateur", carnet: {} }]);
    expect(rows[0].dateDebut).toBe(null);
    expect(rows[0].dateFin).toBe(null);
  });

  it("ne plante pas avec une liste vide ou absente", () => {
    expect(computeFormationTimelineRows([])).toEqual([]);
    expect(computeFormationTimelineRows(undefined)).toEqual([]);
  });
});

describe("computeBarPosition", () => {
  const today = new Date(2026, 0, 1); // 1er janvier 2026
  const windowEnd = new Date(2026, 4, 1); // 1er mai 2026 (+4 mois)

  it("renvoie null si une des deux dates est absente ou invalide", () => {
    expect(computeBarPosition(null, new Date(), today, windowEnd)).toBe(null);
    expect(computeBarPosition(new Date(), null, today, windowEnd)).toBe(null);
  });

  it("place une formation déjà en cours au bord gauche (startsBeforeToday)", () => {
    const pos = computeBarPosition(new Date(2025, 11, 1), new Date(2026, 1, 1), today, windowEnd);
    expect(pos.startsBeforeToday).toBe(true);
    expect(pos.startPct).toBe(0);
  });

  it("place une formation future avec un startPct proportionnel, pas à 0", () => {
    // Démarre à mi-chemin de la fenêtre de 4 mois (~2 mois après aujourd'hui)
    const debut = new Date(2026, 2, 1); // 1er mars
    const fin = new Date(2026, 3, 1); // 1er avril
    const pos = computeBarPosition(debut, fin, today, windowEnd);
    expect(pos.startsBeforeToday).toBe(false);
    expect(pos.startPct).toBeGreaterThan(0);
    expect(pos.startPct).toBeLessThan(100);
  });

  it("détecte bien une fin qui dépasse la fenêtre visible (endsAfterWindow)", () => {
    const pos = computeBarPosition(new Date(2026, 0, 15), new Date(2026, 7, 1), today, windowEnd);
    expect(pos.endsAfterWindow).toBe(true);
    expect(pos.endPct).toBe(100); // ramené (clampé) au bord droit, pas au-delà
  });

  it("ne dépasse jamais les bornes 0-100, même avec des dates extrêmes", () => {
    const pos = computeBarPosition(new Date(2000, 0, 1), new Date(2050, 0, 1), today, windowEnd);
    expect(pos.startPct).toBeGreaterThanOrEqual(0);
    expect(pos.endPct).toBeLessThanOrEqual(100);
  });
});

describe("formationTimelineWindow", () => {
  it("calcule bien une fenêtre de 4 mois pile, pas une approximation en jours", () => {
    const { start, end } = formationTimelineWindow(new Date(2026, 0, 31));
    // 31 janvier + 4 mois = 31 mai (et non un nombre de jours fixe, qui
    // tomberait mal selon les mois traversés)
    expect(end.getMonth()).toBe(4); // mai = index 4
    expect(end.getDate()).toBe(31);
  });
});
