import { useState } from "react";
import { AlertTriangle, Timer, Undo2, MessageSquare, PlayCircle } from "lucide-react";
import { C, FONT_DISPLAY } from "../theme.js";
import { useLang } from "../lang.jsx";
import { TYPE_META, typeLabel } from "../data/questionTypes.js";
import { Btn, SectionTitle } from "./atoms.jsx";

// Écran d'introduction avant de démarrer un examen : types de questions
// présents, avertissements (chrono, pénalités, navigation verrouillée) à
// accuser réception avant de pouvoir commencer.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

const TYPE_DESC = {
  qcm: { fr: "Choisissez une seule réponse parmi les propositions.", nl: "Kies één antwoord uit de voorstellen." },
  qcm_multi: { fr: "Cochez toutes les réponses correctes — plusieurs sont possibles.", nl: "Vink alle juiste antwoorden aan — er zijn er meerdere mogelijk." },
  vrai_faux: { fr: "Indiquez si l'affirmation est vraie ou fausse.", nl: "Geef aan of de bewering waar of onwaar is." },
  ouverte: { fr: "Rédigez une réponse libre en texte.", nl: "Schrijf een vrij antwoord in tekst." },
  point: { fr: "Cliquez directement sur l'image aux endroits demandés.", nl: "Klik rechtstreeks op de gevraagde plaatsen op de afbeelding." },
  legende: { fr: "Associez un texte à chaque point numéroté sur l'image.", nl: "Koppel een tekst aan elk genummerd punt op de afbeelding." },
  relier: { fr: "Reliez chaque élément de gauche à son correspondant de droite.", nl: "Verbind elk element links met het overeenkomstige element rechts." },
  action_reaction: { fr: "Faites des choix successifs jusqu'à atteindre un résultat final (aucun retour en arrière possible).", nl: "Faites des choix successifs jusqu'à atteindre un résultat final (aucun retour en arrière possible)." },
  ordre: { fr: "Remettez les actions dans le bon ordre à l'aide des flèches.", nl: "Zet de acties met de pijltjes in de juiste volgorde." },
};
export function typeDesc(type, lang) { return (lang === "nl" ? TYPE_DESC[type]?.nl : TYPE_DESC[type]?.fr) || TYPE_DESC[type]?.fr || ""; }
export function ExamIntro({ questionnaire, questions, onStart, onExit }) {
  const { t, lang } = useLang();
  const qs = questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
  const typesPresent = [...new Set(qs.map(q => q.type))];
  const hasTimer = qs.some(q => q.dureeSecondes);
  const hasActionReaction = qs.some(q => q.type === "action_reaction");
  const hasLockedTypes = hasTimer || hasActionReaction;
  const hasPenaltyTypes = qs.some(q => q.type === "qcm_multi" || q.type === "point");
  const [ackTypes, setAckTypes] = useState(false);
  const [ackPenalty, setAckPenalty] = useState(false);
  const [ackNav, setAckNav] = useState(false);
  const [ackReport, setAckReport] = useState(false);
  const canStart = ackTypes && (!hasPenaltyTypes || ackPenalty) && ackNav && ackReport;
  const ackLabelStyle = { display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12.5, fontWeight: 600, color: C.navy, cursor: "pointer" };
  return (
    <div style={{ padding: "24px 28px", maxWidth: 640 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{questionnaire.titre}</div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 24 }}>{t("exam_intro_subtitle")}</div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <SectionTitle>{t("types_exercices_titre")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {typesPresent.map(type => {
            const meta = TYPE_META[type]; if (!meta) return null; const Icon = meta.icon;
            return (
              <div key={type} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} color={C.navy} /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy }}>{typeLabel(type, lang)}</div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft }}>{typeDesc(type, lang)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackTypes} onChange={e => setAckTypes(e.target.checked)} />
          {t("ack_types")}
        </label>
      </div>

      {hasPenaltyTypes && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: C.ink }}>{t("penalty_warning")}</div>
          </div>
          <label style={ackLabelStyle}>
            <input type="checkbox" checked={ackPenalty} onChange={e => setAckPenalty(e.target.checked)} />
            {t("ack_penalty")}
          </label>
        </div>
      )}

      <div style={{ background: hasLockedTypes ? C.goldSoft : C.tealSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {hasLockedTypes ? <Timer size={20} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} /> : <Undo2 size={20} color={C.teal} style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ fontSize: 13, color: C.ink }}>
            {hasLockedTypes ? (
              <>
                {t("nav_locked_text")} {hasActionReaction && <>{t("nav_locked_ar")} </>}{t("nav_locked_suffix")}{hasActionReaction && <> {t("nav_locked_ar_suffix")}</>}.
              </>
            ) : t("nav_free_text")}
          </div>
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackNav} onChange={e => setAckNav(e.target.checked)} />
          {t("ack_nav")}
        </label>
      </div>

      <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <MessageSquare size={20} color={C.navy} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: C.ink }}>{t("numero_info_text")}</div>
        </div>
        <label style={ackLabelStyle}>
          <input type="checkbox" checked={ackReport} onChange={e => setAckReport(e.target.checked)} />
          {t("ack_report")}
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <Btn variant="primary" icon={PlayCircle} onClick={onStart} disabled={!canStart}>{t("commencer_qn")}</Btn>
      </div>
    </div>
  );
}

