import { describe, it, expect } from "vitest";
import { qText, qChoix, itemText, paireText, arNodeText, mediaFor, ciblesFor, marqueursFor } from "./utils/bilingual.js";

describe("qText (énoncé de question)", () => {
  it("retourne le FR par défaut", () => {
    expect(qText({ enonceFr: "Bonjour", enonceNl: "Hallo" }, "fr")).toBe("Bonjour");
  });
  it("retourne le NL quand demandé et rempli", () => {
    expect(qText({ enonceFr: "Bonjour", enonceNl: "Hallo" }, "nl")).toBe("Hallo");
  });
  it("se replie sur le FR si le NL demandé est vide", () => {
    expect(qText({ enonceFr: "Bonjour", enonceNl: "" }, "nl")).toBe("Bonjour");
  });
  it("se replie sur l'ancien champ non-bilingue si présent", () => {
    expect(qText({ enonce: "Ancien format" }, "fr")).toBe("Ancien format");
  });
});

describe("qChoix (choix QCM)", () => {
  it("retourne les choix FR par défaut", () => {
    expect(qChoix({ choixFr: ["A", "B"], choixNl: ["X", "Y"] }, "fr")).toEqual(["A", "B"]);
  });
  it("retourne les choix NL si tous remplis", () => {
    expect(qChoix({ choixFr: ["A", "B"], choixNl: ["X", "Y"] }, "nl")).toEqual(["X", "Y"]);
  });
  it("se replie sur FR si un seul choix NL est vide", () => {
    expect(qChoix({ choixFr: ["A", "B"], choixNl: ["X", ""] }, "nl")).toEqual(["A", "B"]);
  });
});

describe("itemText (item d'ordre)", () => {
  it("gère un item nul sans planter", () => {
    expect(itemText(null, "fr")).toBe("");
  });
  it("résout FR/NL avec repli", () => {
    expect(itemText({ texteFr: "Premier", texteNl: "" }, "nl")).toBe("Premier");
    expect(itemText({ texteFr: "Premier", texteNl: "Eerste" }, "nl")).toBe("Eerste");
  });
});

describe("paireText (paires à relier)", () => {
  const paire = { gaucheFr: "Chat", gaucheNl: "Kat", droiteFr: "Chien", droiteNl: "Hond" };
  it("résout le côté gauche selon la langue", () => {
    expect(paireText(paire, "gauche", "fr")).toBe("Chat");
    expect(paireText(paire, "gauche", "nl")).toBe("Kat");
  });
  it("résout le côté droit selon la langue", () => {
    expect(paireText(paire, "droite", "fr")).toBe("Chien");
    expect(paireText(paire, "droite", "nl")).toBe("Hond");
  });
  it("se replie sur l'ancien format (gauche/droite) si présent", () => {
    expect(paireText({ gauche: "Ancien" }, "gauche", "fr")).toBe("Ancien");
  });
  it("gère une paire nulle sans planter", () => {
    expect(paireText(null, "gauche", "fr")).toBe("");
  });
});

describe("arNodeText (nœuds Action/Réaction)", () => {
  it("résout FR/NL avec repli, comme les autres types bilingues", () => {
    const node = { texteFr: "Situation", texteNl: "" };
    expect(arNodeText(node, "fr")).toBe("Situation");
    expect(arNodeText(node, "nl")).toBe("Situation"); // repli car NL vide
  });
  it("se replie sur l'ancien champ texte si présent (anciennes questions)", () => {
    expect(arNodeText({ texte: "Ancien nœud" }, "fr")).toBe("Ancien nœud");
  });
});

describe("mediaFor (média d'une question, avec repli vers le FR)", () => {
  it("retourne le média FR par défaut", () => {
    const q = { media: { type: "image", url: "fr.jpg" } };
    expect(mediaFor(q, "fr")).toEqual({ type: "image", url: "fr.jpg" });
  });
  it("retourne le média NL s'il existe et que le NL est demandé", () => {
    const q = { media: { type: "image", url: "fr.jpg" }, mediaNl: { type: "image", url: "nl.jpg" } };
    expect(mediaFor(q, "nl")).toEqual({ type: "image", url: "nl.jpg" });
  });
  it("se replie sur le FR si aucun média NL n'existe", () => {
    const q = { media: { type: "image", url: "fr.jpg" } };
    expect(mediaFor(q, "nl")).toEqual({ type: "image", url: "fr.jpg" });
  });
  it("retourne null si aucun média du tout", () => {
    expect(mediaFor({}, "fr")).toBeNull();
  });
});

describe("ciblesFor / marqueursFor (coordonnées liées à l'image NL, seulement si l'image NL existe)", () => {
  it("se replie sur les cibles FR si aucune image NL n'existe, même si ciblesNl est rempli par erreur", () => {
    const q = { cibles: [{ x: 1, y: 1, rayon: 5 }], ciblesNl: [{ x: 9, y: 9, rayon: 5 }] }; // pas de mediaNl !
    expect(ciblesFor(q, "nl")).toEqual([{ x: 1, y: 1, rayon: 5 }]);
  });
  it("utilise les cibles NL seulement si l'image NL existe aussi", () => {
    const q = { media: { url: "fr.jpg" }, mediaNl: { url: "nl.jpg" }, cibles: [{ x: 1, y: 1, rayon: 5 }], ciblesNl: [{ x: 9, y: 9, rayon: 5 }] };
    expect(ciblesFor(q, "nl")).toEqual([{ x: 9, y: 9, rayon: 5 }]);
    expect(ciblesFor(q, "fr")).toEqual([{ x: 1, y: 1, rayon: 5 }]);
  });
  it("même logique pour marqueursFor", () => {
    const q = { media: { url: "fr.jpg" }, mediaNl: { url: "nl.jpg" }, marqueurs: [{ id: "1", x: 1, y: 1 }], marqueursNl: [{ id: "2", x: 9, y: 9 }] };
    expect(marqueursFor(q, "nl")).toEqual([{ id: "2", x: 9, y: 9 }]);
    expect(marqueursFor(q, "fr")).toEqual([{ id: "1", x: 1, y: 1 }]);
  });
});
