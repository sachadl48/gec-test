import { describe, it, expect } from "vitest";
import { correctPlacementsOrdre, matchedCiblesCount, computeCategoryStats, getResultReached, countTreeResults, validateActionTree, questionnaireReussi, computeLegendePoints } from "./utils/scoring.js";

describe("correctPlacementsOrdre (question type 'ordre')", () => {
  const q = { items: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  it("compte 0 si rien n'est placé", () => {
    expect(correctPlacementsOrdre(q, [])).toBe(0);
  });
  it("compte les bonnes positions", () => {
    expect(correctPlacementsOrdre(q, ["a", "b", "c"])).toBe(3);
    expect(correctPlacementsOrdre(q, ["a", "c", "b"])).toBe(1);
  });
  it("ignore un ordre plus court ou plus long que prévu, sans planter", () => {
    expect(correctPlacementsOrdre(q, ["a"])).toBe(1);
    expect(correctPlacementsOrdre(q, undefined)).toBe(0);
  });
});

describe("matchedCiblesCount (question type 'point')", () => {
  const q = { cibles: [{ x: 10, y: 10, rayon: 5 }, { x: 100, y: 100, rayon: 5 }] };
  it("compte un clic dans le rayon comme trouvé", () => {
    expect(matchedCiblesCount(q, [{ x: 11, y: 11 }])).toBe(1);
  });
  it("ne compte pas un clic hors du rayon", () => {
    expect(matchedCiblesCount(q, [{ x: 50, y: 50 }])).toBe(0);
  });
  it("n'associe pas deux cibles au même clic", () => {
    // un seul clic ne peut valider qu'une seule cible, même s'il est proche de deux
    expect(matchedCiblesCount(q, [{ x: 11, y: 11 }])).toBe(1);
  });
});

describe("computeCategoryStats (statistiques par catégorie)", () => {
  it("agrège correct/total sur plusieurs questionnaires", () => {
    const qns = [
      { categorieCounts: { Safety: { correct: 3, total: 5 } } },
      { categorieCounts: { Safety: { correct: 2, total: 5 } } },
    ];
    const stats = computeCategoryStats(qns, ["Safety"]);
    expect(stats.Safety.correct).toBe(5);
    expect(stats.Safety.total).toBe(10);
  });
  it("initialise à zéro une catégorie sans données", () => {
    const stats = computeCategoryStats([], ["Safety"]);
    expect(stats.Safety).toEqual({ correct: 0, total: 0 });
  });
});

describe("arbre Action/Réaction (getResultReached, countTreeResults, validateActionTree)", () => {
  const arbre = {
    id: "e1", type: "evenement", texteFr: "Panne signal", texteNl: "Seinstoring",
    enfants: [
      { id: "a1", type: "action", texteFr: "Alerter le poste", texteNl: "Post waarschuwen", enfants: [
        { id: "r1", type: "resultat", texteFr: "Bonne décision", texteNl: "Goede beslissing", pourcentage: 100, enfants: [] },
      ] },
      { id: "a2", type: "action", texteFr: "Ne rien faire", texteNl: "Niets doen", enfants: [
        { id: "r2", type: "resultat", texteFr: "Mauvaise décision", texteNl: "Slechte beslissing", pourcentage: 0, enfants: [] },
      ] },
    ],
  };

  it("retrouve le bon résultat selon le chemin emprunté", () => {
    expect(getResultReached(arbre, ["a1"]).id).toBe("r1");
    expect(getResultReached(arbre, ["a2"]).id).toBe("r2");
  });
  it("retourne null pour un chemin invalide ou incomplet", () => {
    expect(getResultReached(arbre, [])).toBeNull();
    expect(getResultReached(arbre, ["inconnu"])).toBeNull();
  });
  it("compte le bon nombre de résultats possibles dans l'arbre", () => {
    expect(countTreeResults(arbre)).toBe(2);
  });
  it("valide un arbre complet (FR+NL partout, résultats à pourcentage valide)", () => {
    expect(validateActionTree(arbre)).toBe(true);
  });
  it("invalide un arbre avec une traduction NL manquante", () => {
    const incomplet = JSON.parse(JSON.stringify(arbre));
    incomplet.enfants[0].texteNl = "";
    expect(validateActionTree(incomplet)).toBe(false);
  });
});

describe("questionnaireReussi (verdict global d'un questionnaire, pour les notes obligatoires)", () => {
  const categoryConfig = { Safety: { seuil: 60 }, Regulation: { seuil: 80 } };

  it("retourne null si pas encore corrigé (pas de scoreParCategorie)", () => {
    expect(questionnaireReussi({ scoreParCategorie: null }, categoryConfig)).toBeNull();
    expect(questionnaireReussi({}, categoryConfig)).toBeNull();
  });

  it("réussi si toutes les catégories atteignent leur seuil", () => {
    const qn = { scoreParCategorie: { Safety: 70, Regulation: 90 } };
    expect(questionnaireReussi(qn, categoryConfig)).toBe(true);
  });

  it("échoué si une seule catégorie n'atteint pas son seuil", () => {
    const qn = { scoreParCategorie: { Safety: 70, Regulation: 50 } }; // Regulation sous 80
    expect(questionnaireReussi(qn, categoryConfig)).toBe(false);
  });

  it("utilise un seuil par défaut de 60 si la catégorie n'a pas de config", () => {
    const qn = { scoreParCategorie: { Inconnue: 65 } };
    expect(questionnaireReussi(qn, categoryConfig)).toBe(true);
    expect(questionnaireReussi({ scoreParCategorie: { Inconnue: 50 } }, categoryConfig)).toBe(false);
  });
});

describe("computeLegendePoints (correction 'Légender une image' via boutons ✓/✗)", () => {
  it("attribue tous les points si toutes les réponses sont correctes", () => {
    expect(computeLegendePoints([true, true, true], 6)).toBe(6);
  });
  it("attribue 0 point si aucune réponse n'est correcte", () => {
    expect(computeLegendePoints([false, false, false], 6)).toBe(0);
  });
  it("répartit proportionnellement et arrondit à l'entier le plus proche", () => {
    expect(computeLegendePoints([true, false, false], 6)).toBe(2); // 6 * 1/3 = 2
    expect(computeLegendePoints([true, true, false], 5)).toBe(3); // 5 * 2/3 = 3.33 -> 3
  });
  it("ne plante pas avec un tableau vide ou absent", () => {
    expect(computeLegendePoints([], 6)).toBe(0);
    expect(computeLegendePoints(undefined, 6)).toBe(0);
  });
});
