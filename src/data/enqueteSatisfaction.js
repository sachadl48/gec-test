// Contenu réel de l'enquête de satisfaction, fourni par Sacha. Les
// traductions NL sont une première proposition de ma part (pas encore
// officiellement vérifiées) — à corriger si la terminologie doit être
// plus précise.

// Échelle par défaut, utilisée par la plupart des questions.
export const SCALE_DEFAULT = [
  { value: 1, label: "1", desc: "Pas du tout", descNl: "Helemaal niet" },
  { value: 2, label: "2", desc: "Peu", descNl: "Weinig" },
  { value: 3, label: "3", desc: "Moyennement", descNl: "Matig" },
  { value: 4, label: "4", desc: "Bien", descNl: "Goed" },
  { value: 5, label: "5", desc: "Très bien", descNl: "Zeer goed" },
];
// Échelle spécifique à la question sur le rythme de la formation.
export const SCALE_RYTHME = [
  { value: 1, label: "1", desc: "Trop lent", descNl: "Te traag" },
  { value: 2, label: "2", desc: "Lent", descNl: "Traag" },
  { value: 3, label: "3", desc: "Adapté", descNl: "Aangepast" },
  { value: 4, label: "4", desc: "Rapide", descNl: "Snel" },
  { value: 5, label: "5", desc: "Trop rapide", descNl: "Te snel" },
];

// Partie 1 — la formation elle-même. `scale` = l'échelle à utiliser pour
// cette question précise (SCALE_DEFAULT sauf pour le rythme).
// `note: false` = question à réponse libre uniquement, sans cotation —
// c'est le cas de "Quels aspects pourraient être améliorés ?", qui ne se
// prête pas à une note chiffrée par nature (voir la conversation avec
// Sacha à ce sujet).
export const ENQUETE_FORMATION_QUESTIONS = [
  { cle: "explications", label: "As-tu reçu des explications claires et précises sur les outils et procédures ?", labelNl: "Heb je duidelijke en nauwkeurige uitleg gekregen over de tools en procedures?", scale: SCALE_DEFAULT, note: true },
  { cle: "rythme", label: "Rythme de la formation", labelNl: "Tempo van de opleiding", scale: SCALE_RYTHME, note: true },
  { cle: "supports", label: "Supports pédagogiques (notes, documents)", labelNl: "Lesmateriaal (nota's, documenten)", scale: SCALE_DEFAULT, note: true },
  { cle: "ambiance", label: "Ambiance générale pendant la formation", labelNl: "Algemene sfeer tijdens de opleiding", scale: SCALE_DEFAULT, note: true },
  { cle: "amelioration", label: "Quels aspects pourraient être améliorés ?", labelNl: "Welke aspecten zouden verbeterd kunnen worden?", note: false },
];

// Partie 2 — un jeu de 5 questions, répété pour chaque moniteur du
// carnet de l'élève. Toutes utilisent l'échelle par défaut.
export const ENQUETE_MONITEUR_QUESTIONS = [
  { cle: "maitrise", label: "Le moniteur maîtrise-t-il les sujets enseignés ?", labelNl: "Beheerst de instructeur de onderwezen onderwerpen?" },
  { cle: "reponses_techniques", label: "Le moniteur était-il capable de répondre à vos questions techniques ?", labelNl: "Was de instructeur in staat om uw technische vragen te beantwoorden?" },
  { cle: "accessibilite", label: "Le moniteur était-il accessible et à l'écoute ?", labelNl: "Was de instructeur toegankelijk en luisterde hij/zij naar u?" },
  { cle: "participation", label: "Le moniteur stimule-t-il la participation et l'interaction ?", labelNl: "Stimuleert de instructeur participatie en interactie?" },
  { cle: "engagement", label: "Avez-vous ressenti un réel engagement du moniteur dans votre progression ?", labelNl: "Heeft u een echte betrokkenheid van de instructeur bij uw vooruitgang ervaren?" },
];

// Les 5 compétences du graphique "Performances des moniteurs", chacune
// alimentée par UNE question précise de la partie 2 de l'enquête —
// correspondance choisie par déduction (à confirmer avec Sacha) :
export const COMPETENCES_MONITEUR = [
  { competence: "Maîtrise", competenceNl: "Beheersing", cle: "maitrise" },
  { competence: "Pédagogie", competenceNl: "Pedagogie", cle: "reponses_techniques" },
  { competence: "Écoute", competenceNl: "Luisterbereidheid", cle: "accessibilite" },
  { competence: "Intégration", competenceNl: "Integratie", cle: "participation" },
  { competence: "Engagement", competenceNl: "Betrokkenheid", cle: "engagement" },
];

// Calcule les 5 points du graphique en toile d'araignée à partir des
// enquêtes déjà complétées — soit toutes confondues (graphique général),
// soit filtrées sur un seul moniteur (graphique personnel), selon que
// `filterNom` est fourni ou non. Chaque compétence = moyenne des notes
// (1-5) de sa question associée, ramenée à un pourcentage (comme les
// autres graphiques radar de l'app) — 0 si aucune donnée pour l'instant.
export function computeMoniteurRadarData(enquetesTerminees, filterNom, lang) {
  return COMPETENCES_MONITEUR.map(({ competence, competenceNl, cle }) => {
    let total = 0, count = 0;
    for (const e of enquetesTerminees) {
      for (const m of (e.reponses?.moniteurs || [])) {
        if (filterNom && m.nom !== filterNom) continue;
        const note = m.questions?.[cle]?.note;
        if (typeof note === "number") { total += note; count++; }
      }
    }
    return { competence: lang === "nl" ? competenceNl : competence, score: count ? Math.round((total / count / 5) * 100) : 0 };
  });
}
