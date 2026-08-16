import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { STATIONS } from "../data/stations.js";
import { Btn, Badge } from "./atoms.jsx";

// Jeu des stations : associer numéro et nom de station STIB, en mode
// libre ou chronométré (60 secondes).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function stationName(station, langue) { return langue === "nl" ? station.nl : station.fr; }
export function pickDistractors(correctStation, count) {
  const pool = STATIONS.filter(s => s.numero !== correctStation.numero);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
export function generateStationQuestion() {
  const correct = STATIONS[Math.floor(Math.random() * STATIONS.length)];
  const direction = Math.random() < 0.5 ? "numToName" : "nameToNum";
  const displayLang = Math.random() < 0.5 ? "fr" : "nl";
  const optionStations = [correct, ...pickDistractors(correct, 3)].sort(() => Math.random() - 0.5);
  return { direction, displayLang, correct, options: optionStations, correctIndex: optionStations.findIndex(s => s.numero === correct.numero) };
}
export const CHRONO_DUREE = 60;
export function StationGame({ user, users, setUsers, dtmRecord, onExit }) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState(null); // null | "libre" | "chrono"
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, selectedIndex } | null
  const [timeLeft, setTimeLeft] = useState(CHRONO_DUREE);
  const [finished, setFinished] = useState(false);
  const meilleurScore = user.jeuStationsMeilleurScore || 0;
  const dtmBest = dtmRecord ? dtmRecord.score : 0;
  const RecordBanner = () => (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18, fontSize: 12.5 }}>
      <span style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{meilleurScore}</strong></span>
      <span style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBest}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</span>
    </div>
  );

  const startMode = (m) => { setMode(m); setScore(0); setTotal(0); setFinished(false); setFeedback(null); setTimeLeft(CHRONO_DUREE); setQuestion(generateStationQuestion()); };

  useEffect(() => {
    if (mode !== "chrono" || finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      if (score > meilleurScore) supabase.rpc("update_my_station_score", { new_score: score }).then(({ error }) => { if (!error) setUsers(); });
      return;
    }
    const id = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [mode, timeLeft, finished]);

  const answer = (i) => {
    if (feedback) return;
    const correct = i === question.correctIndex;
    setFeedback({ correct, selectedIndex: i });
    setTotal(t => t + 1);
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      setFeedback(null);
      if (mode === "chrono" && timeLeft <= 1) return; // le minuteur gère la fin
      setQuestion(generateStationQuestion());
    }, 550);
  };

  const stopLibre = () => setFinished(true);

  if (!mode) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{t("jeu_stations_titre")}</div>
        </div>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12, textAlign: "center" }}>{t("jeu_stations_intro")}</div>
          <RecordBanner />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <button onClick={() => startMode("libre")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_libre_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_libre_desc")}</div>
          </button>
          <button onClick={() => startMode("chrono")} style={{ background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_desc", { n: CHRONO_DUREE })}</div>
          </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const isNewBest = mode === "chrono" && score > meilleurScore;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <RecordBanner />
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("resultats_titre")}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: C.gold, margin: "14px 0" }}>{score}/{total}</div>
          {isNewBest && <Badge color={C.gold} bg={C.goldSoft}>{t("nouveau_record_badge")}</Badge>}
          {mode === "chrono" && !isNewBest && meilleurScore > 0 && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>{t("meilleur_score_badge", { n: meilleurScore })}</div>}
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
          {mode === "chrono" && <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: timeLeft <= 10 ? C.red : C.navy }}>{timeLeft}s</span>}
          {mode === "libre" && <Btn variant="subtle" onClick={stopLibre} style={{ padding: "5px 10px", fontSize: 12 }}>{t("terminer_btn")}</Btn>}
        </div>
      </div>
      <RecordBanner />
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10, textAlign: "center" }}>
          {question.direction === "numToName" ? t("question_num_to_name") : t("question_name_to_num")}
        </div>
        <div style={{ fontSize: question.direction === "numToName" ? 40 : 22, fontWeight: 700, color: C.navy, textAlign: "center", marginBottom: 24, fontFamily: question.direction === "numToName" ? FONT_MONO : FONT_DISPLAY }}>
          {question.direction === "numToName" ? question.correct.numero : stationName(question.correct, question.displayLang)}
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
                style={{ background: bg, border: `2px solid ${border}`, color, borderRadius: 12, padding: "14px 10px", fontSize: question.direction === "numToName" ? 14 : 18, fontWeight: 700, fontFamily: question.direction === "numToName" ? FONT_BODY : FONT_MONO, cursor: feedback ? "default" : "pointer", textAlign: "center" }}>
                {question.direction === "numToName" ? stationName(opt, question.displayLang) : opt.numero}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
