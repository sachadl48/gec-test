import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { STATIONS } from "../data/stations.js";
import { Btn, Badge } from "./atoms.jsx";

// Jeu des stations : associer numéro et nom de station STIB. Menu à 3
// modes (Normal / Chrono / Chrono Hard), identique visuellement au jeu
// des téléphones.

export function stationName(station, langue) { return langue === "nl" ? station.nl : station.fr; }
export function pickDistractors(correctStation, count) {
  const pool = STATIONS.filter(s => s.numero !== correctStation.numero);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
// Mode "Hard" : les mauvaises réponses sont les stations dont le numéro
// est le plus proche du bon — beaucoup plus difficile à deviner par
// élimination que des numéros pris au hasard dans tout le réseau.
export function pickDistractorsProches(correctStation, count) {
  const pool = STATIONS.filter(s => s.numero !== correctStation.numero);
  return [...pool]
    .sort((a, b) => Math.abs(a.numero - correctStation.numero) - Math.abs(b.numero - correctStation.numero))
    .slice(0, count);
}
export function generateStationQuestion(hard = false) {
  const correct = STATIONS[Math.floor(Math.random() * STATIONS.length)];
  const direction = Math.random() < 0.5 ? "numToName" : "nameToNum";
  const displayLang = Math.random() < 0.5 ? "fr" : "nl";
  const distractors = hard ? pickDistractorsProches(correct, 3) : pickDistractors(correct, 3);
  const optionStations = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { direction, displayLang, correct, options: optionStations, correctIndex: optionStations.findIndex(s => s.numero === correct.numero) };
}
export const CHRONO_DUREE = 60;

export function StationGame({ user, users, setUsers, dtmRecord, dtmRecordHard, onExit, refreshLeaderboards }) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState(null); // null | "normale" | "chrono" | "chrono_hard"
  const [showListe, setShowListe] = useState(false);
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(CHRONO_DUREE);
  const [finished, setFinished] = useState(false);
  const isChrono = mode === "chrono" || mode === "chrono_hard";
  const isHard = mode === "chrono_hard";
  const meilleurScore = (isHard ? user.jeuStationsMeilleurScoreHard : user.jeuStationsMeilleurScore) || 0;
  const currentDtmRecord = isHard ? dtmRecordHard : dtmRecord;

  const RecordBanner = () => (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 18, fontSize: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("mode_chrono_titre")}</div>
        <div style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScore || 0}</strong></div>
        <div style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecord ? dtmRecord.score : 0}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("difficulte_hard")}</div>
        <div style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScoreHard || 0}</strong></div>
        <div style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordHard ? dtmRecordHard.score : 0}</strong>{dtmRecordHard && <span> ({dtmRecordHard.prenom} {dtmRecordHard.nom})</span>}</div>
      </div>
    </div>
  );

  const startMode = (m) => { setMode(m); setScore(0); setTotal(0); setFinished(false); setFeedback(null); setTimeLeft(CHRONO_DUREE); setQuestion(generateStationQuestion(m === "chrono_hard")); };
  const backToMenu = () => { setMode(null); if (refreshLeaderboards) refreshLeaderboards(); };

  useEffect(() => {
    if (!isChrono || finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      if (score > meilleurScore) supabase.rpc("update_my_station_score", { new_score: score, hard: isHard }).then(({ error }) => { if (!error) { setUsers(); if (refreshLeaderboards) refreshLeaderboards(); } });
      return;
    }
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
      setQuestion(generateStationQuestion(isHard));
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => startMode("normale")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_normale_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_normale_desc_stations")}</div>
            </button>
            <button onClick={() => startMode("chrono")} style={{ background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_desc", { n: CHRONO_DUREE })}</div>
            </button>
            <button onClick={() => startMode("chrono_hard")} style={{ background: "#fff", border: `1px solid ${C.red}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_hard_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_hard_desc_stations", { n: CHRONO_DUREE })}</div>
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <Btn variant="ghost" onClick={() => setShowListe(s => !s)}>{showListe ? t("masquer_liste_btn") : t("voir_liste_stations_btn")}</Btn>
          </div>
          {showListe && (
            <div style={{ marginTop: 14, maxHeight: 320, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead style={{ position: "sticky", top: 0, background: C.bg }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: C.inkSoft, fontWeight: 600 }}>{t("numero_word")}</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: C.inkSoft, fontWeight: 600 }}>FR</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: C.inkSoft, fontWeight: 600 }}>NL</th>
                  </tr>
                </thead>
                <tbody>
                  {[...STATIONS].sort((a, b) => a.numero - b.numero).map(s => (
                    <tr key={s.numero} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "6px 12px", fontFamily: FONT_MONO, fontWeight: 700, color: C.navy }}>{s.numero}</td>
                      <td style={{ padding: "6px 12px" }}>{s.fr}</td>
                      <td style={{ padding: "6px 12px", color: C.inkSoft }}>{s.nl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (finished) {
    const isNewBest = isChrono && score > meilleurScore;
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <RecordBanner />
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("resultats_titre")}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700, color: C.gold, margin: "14px 0" }}>{score}/{total}</div>
          {isNewBest && <Badge color={C.gold} bg={C.goldSoft}>{t("nouveau_record_badge")}</Badge>}
          {isChrono && !isNewBest && meilleurScore > 0 && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 6 }}>{t("meilleur_score_badge", { n: meilleurScore })}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
            <Btn variant="ghost" onClick={backToMenu}>{t("retour_btn")}</Btn>
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
