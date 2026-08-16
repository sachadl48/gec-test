import { ListChecks, CheckSquare, ToggleLeft, AlignLeft, MapPin, Link2, ListOrdered, GitBranch, ArrowUpDown } from "lucide-react";
import { C } from "../theme.js";

// Métadonnées des différents types de questions (libellé FR/NL, icône).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export const TYPE_META = {
  qcm: { label: "QCM", labelNl: "Meerkeuzevraag", icon: ListChecks },
  qcm_multi: { label: "QCM (réponses multiples)", labelNl: "Meerkeuzevraag (meerdere antwoorden)", icon: CheckSquare },
  vrai_faux: { label: "Vrai / Faux", labelNl: "Waar / Onwaar", icon: ToggleLeft },
  ouverte: { label: "Question ouverte", labelNl: "Open vraag", icon: AlignLeft },
  point: { label: "Cliquer & pointer", labelNl: "Klikken & aanwijzen", icon: MapPin },
  relier: { label: "Relier", labelNl: "Verbinden", icon: Link2 },
  legende: { label: "Légender une image", labelNl: "Een afbeelding labelen", icon: ListOrdered },
  action_reaction: { label: "Action / Réaction", labelNl: "Action / Réaction", icon: GitBranch },
  ordre: { label: "Mettre dans l'ordre", labelNl: "In de juiste volgorde zetten", icon: ArrowUpDown },
};
export function typeLabel(type, lang) { return (lang === "nl" ? TYPE_META[type]?.labelNl : TYPE_META[type]?.label) || TYPE_META[type]?.label || type; }

// Couleurs et libellés des 3 types de nœuds d'un scénario Action/Réaction.
export const AR_COLOR = { evenement: C.teal, action: C.navy2, resultat: C.green };
export const AR_LABEL = { evenement: "Événement", action: "Action", resultat: "Résultat" };
