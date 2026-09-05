import { useState, useEffect } from "react";
import { PlayCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { Btn, EmptyState } from "./atoms.jsx";

// Jeu des traductions : associer un terme STIB à sa traduction FR <-> NL.
// Pas de suivi de score ni de classement (contrairement aux jeux des
// stations/téléphones) — un simple outil d'entraînement. Les termes sont
// chargés depuis la base (table game_traductions, modifiable depuis
// "Gestion des jeux"), reçus en prop.

const GLOSSAIRE_URL = "https://stibmivb.sharepoint.com/sites/PUB_OPS-BUM_ReferenceLibrary/Lists/GlossaireBUM/All%20Items%20Prod.aspx";

export function pickTraductionDistractors(traductions, correct, count) {
  const pool = traductions.filter(t => t.fr !== correct.fr);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

export function generateTraductionQuestion(traductions) {
  const correct = traductions[Math.floor(Math.random() * traductions.length)];
  const direction = Math.random() < 0.5 ? "frToNl" : "nlToFr";
  const options = [correct, ...pickTraductionDistractors(traductions, correct, 3)].sort(() => Math.random() - 0.5);
  return { direction, correct, options, correctIndex: options.findIndex(o => o.fr === correct.fr) };
}

export const CHRONO_DUREE = 60;

export function TranslationGame({ traductions, onExit }) {
  const { t } = useLang();
  const [mode, setMode] = useState(null); // null | "normale" | "chrono"
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(CHRONO_DUREE);
  const [finished, setFinished] = useState(false);
  const isChrono = mode === "chrono";

  const startMode = (m) => { setMode(m); setScore(0); setTotal(0); setFinished(false); setFeedback(null); setTimeLeft(CHRONO_DUREE); setQuestion(generateTraductionQuestion(traductions)); };

  useEffect(() => {
    if (!isChrono || finished) return;
    if (timeLeft <= 0) { setFinished(true); return; }
    const id = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [mode, timeLeft, finished]); // eslint-disable-line

  const answer = (i) => {
    if (feedback) return;
    const correct = i === question.correctIndex;
    setFeedback({ correct, selectedIndex: i });
    setTotal(t => t + 1);
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (isChrono && timeLeft <= 1) return;
      setQuestion(generateTraductionQuestion(traductions));
    }, 550);
  };

  const stopLibre = () => setFinished(true);

  if (!traductions || traductions.length === 0) {
    return (
      <div>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <EmptyState icon={AlertTriangle} title={t("jeu_donnees_vides_titre")} body={t("jeu_donnees_vides_body")} />
      </div>
    );
  }

  if (!mode) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{t("jeu_traductions_titre")}</div>
        </div>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20, textAlign: "center" }}>{t("jeu_traductions_intro")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => startMode("normale")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_normale_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_normale_desc_traductions")}</div>
            </button>
            <button onClick={() => startMode("chrono")} style={{ background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_desc", { n: CHRONO_DUREE })}</div>
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <a href={GLOSSAIRE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.navy, textDecoration: "none", fontWeight: 600 }}>
              {t("voir_glossaire_btn")} <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("resultats_titre")}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: C.gold, margin: "14px 0" }}>{score}/{total}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
            <Btn variant="ghost" onClick={() => setMode(null)}>{t("retour_btn")}</Btn>
            <Btn variant="gold" icon={PlayCircle} onClick={() => startMode(mode)}>{t("rejouer_btn")}</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.inkSoft }}>{t("score_label")} <strong style={{ color: C.navy }}>{score}/{total}</strong></span>
          {isChrono && <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: timeLeft <= 10 ? C.red : C.navy }}>{timeLeft}s</span>}
          {mode === "normale" && <Btn variant="subtle" onClick={stopLibre} style={{ padding: "5px 10px", fontSize: 12 }}>{t("terminer_btn")}</Btn>}
        </div>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10, textAlign: "center" }}>
          {question.direction === "frToNl" ? t("question_fr_to_nl") : t("question_nl_to_fr")}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, textAlign: "center", marginBottom: 24, fontFamily: FONT_DISPLAY }}>
          {question.direction === "frToNl" ? question.correct.fr : question.correct.nl}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            const isSelected = feedback?.selectedIndex === i;
            let bg = "#fff", border = C.line, color = C.ink;
            if (feedback) {
              if (isCorrect) { bg = C.greenSoft; border = C.green; color = C.green; }
              else if (isSelected) { bg = C.redSoft; border = C.red; color = C.red; }
            }
            return (
              <button key={i} disabled={!!feedback} onClick={() => answer(i)}
                style={{ background: bg, border: `2px solid ${border}`, color, borderRadius: 12, padding: "14px 10px", fontSize: 14, fontWeight: 700, fontFamily: FONT_BODY, cursor: feedback ? "default" : "pointer", textAlign: "center" }}>
                {question.direction === "frToNl" ? opt.nl : opt.fr}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
