import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { TELEPHONES } from "../data/telephones.js";
import { Btn, Badge } from "./atoms.jsx";

// Jeu des téléphones : associer un service et son numéro interne, dans
// l'un des 2 systèmes (PAX, SISCO) — deux numérotations
// indépendantes, jamais comparables entre elles.
// Records séparés Normal/Hard, comme pour le jeu des stations (schéma 27).

export const TELEPHONE_TYPES = ["pax", "sisco"];
export const TYPE_LABELS = { pax: "PAX", sisco: "SISCO" };

export function serviceName(service, langue) { return langue === "nl" ? service.serviceNl : service.serviceFr; }

function pickServiceEtType() {
  let service, type, tries = 0;
  do {
    service = TELEPHONES[Math.floor(Math.random() * TELEPHONES.length)];
    type = TELEPHONE_TYPES[Math.floor(Math.random() * TELEPHONE_TYPES.length)];
    tries++;
  } while (!service[type] && tries < 200);
  return { service, type };
}

export function pickPhoneDistractors(service, type, count) {
  const pool = TELEPHONES.filter(s => s[type] && s.serviceFr !== service.serviceFr);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
// Mode Hard : les mauvaises réponses sont les numéros les plus proches du
// bon, DANS LE MÊME SYSTÈME uniquement (jamais un numéro PAX proposé
// comme distracteur d'un numéro SISCO — les échelles n'ont rien à voir).
export function pickPhoneDistractorsProches(service, type, count) {
  const pool = TELEPHONES.filter(s => s[type] && s.serviceFr !== service.serviceFr);
  const correctNum = parseInt(service[type], 10);
  return [...pool]
    .sort((a, b) => Math.abs(parseInt(a[type], 10) - correctNum) - Math.abs(parseInt(b[type], 10) - correctNum))
    .slice(0, count);
}

export function generatePhoneQuestion(hard = false) {
  const { service, type } = pickServiceEtType();
  // En mode Hard, on ne demande toujours que le numéro (jamais l'inverse).
  const direction = hard ? "serviceToNum" : (Math.random() < 0.5 ? "numToService" : "serviceToNum");
  const displayLang = Math.random() < 0.5 ? "fr" : "nl";
  const distractors = hard ? pickPhoneDistractorsProches(service, type, 3) : pickPhoneDistractors(service, type, 3);
  const optionServices = [service, ...distractors].sort(() => Math.random() - 0.5);
  return { direction, displayLang, type, correct: service, options: optionServices, correctIndex: optionServices.findIndex(s => s.serviceFr === service.serviceFr) };
}

export const CHRONO_DUREE = 60;

export function PhoneGame({ user, users, setUsers, dtmRecord, dtmRecordHard, onExit, refreshLeaderboards }) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState(null); // null | "normale" | "chrono" | "chrono_hard"
  const [question, setQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(CHRONO_DUREE);
  const [finished, setFinished] = useState(false);
  const [showListe, setShowListe] = useState(false);
  const isChrono = mode === "chrono" || mode === "chrono_hard";
  const isHard = mode === "chrono_hard";
  // Sur l'écran de choix (mode encore à null), rien n'est "hard" tant
  // qu'on n'a pas cliqué sur ce mode précis — pas de sélecteur à
  // refléter ici, contrairement au jeu des stations (les 3 boutons sont
  // déjà explicites).
  const meilleurScore = (isHard ? user.jeuTelephonesMeilleurScoreHard : user.jeuTelephonesMeilleurScore) || 0;
  const currentDtmRecord = isHard ? dtmRecordHard : dtmRecord;
  const dtmBest = currentDtmRecord ? currentDtmRecord.score : 0;

  const RecordBanner = () => (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 18, fontSize: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("mode_chrono_titre")}</div>
        <div style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{user.jeuTelephonesMeilleurScore || 0}</strong></div>
        <div style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecord ? dtmRecord.score : 0}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("difficulte_hard")}</div>
        <div style={{ color: C.inkSoft }}>{t("record_personnel_label")} <strong style={{ color: C.navy, fontFamily: FONT_MONO }}>{user.jeuTelephonesMeilleurScoreHard || 0}</strong></div>
        <div style={{ color: C.inkSoft }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordHard ? dtmRecordHard.score : 0}</strong>{dtmRecordHard && <span> ({dtmRecordHard.prenom} {dtmRecordHard.nom})</span>}</div>
      </div>
    </div>
  );

  const startMode = (m) => { setMode(m); setScore(0); setTotal(0); setFinished(false); setFeedback(null); setTimeLeft(CHRONO_DUREE); setQuestion(generatePhoneQuestion(m === "chrono_hard")); };
  const backToMenu = () => { setMode(null); if (refreshLeaderboards) refreshLeaderboards(); };

  useEffect(() => {
    if (!isChrono || finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      if (score > meilleurScore) supabase.rpc("update_my_phone_score", { new_score: score, hard: isHard }).then(({ error }) => { if (!error) { setUsers(); if (refreshLeaderboards) refreshLeaderboards(); } });
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
      setQuestion(generatePhoneQuestion(isHard));
    }, 550);
  };

  const stopLibre = () => setFinished(true);

  if (!mode) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{t("jeu_telephones_titre")}</div>
        </div>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12, textAlign: "center" }}>{t("jeu_telephones_intro")}</div>
          <RecordBanner />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => startMode("normale")} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_normale_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_normale_desc")}</div>
            </button>
            <button onClick={() => startMode("chrono")} style={{ background: "#fff", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_desc", { n: CHRONO_DUREE })}</div>
            </button>
            <button onClick={() => startMode("chrono_hard")} style={{ background: "#fff", border: `1px solid ${C.red}`, borderRadius: 14, padding: 22, textAlign: "left", cursor: "pointer" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{t("mode_chrono_hard_titre")}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("mode_chrono_hard_desc", { n: CHRONO_DUREE })}</div>
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <Btn variant="ghost" onClick={() => setShowListe(s => !s)}>{showListe ? t("masquer_liste_btn") : t("voir_liste_telephones_btn")}</Btn>
          </div>
          {showListe && (
            <div style={{ marginTop: 14, maxHeight: 320, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: C.bg }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkSoft, fontWeight: 600 }}>FR</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkSoft, fontWeight: 600 }}>NL</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkSoft, fontWeight: 600 }}>PAX</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.inkSoft, fontWeight: 600 }}>SISCO</th>
                  </tr>
                </thead>
                <tbody>
                  {TELEPHONES.map(s => (
                    <tr key={s.serviceFr} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "6px 10px" }}>{s.serviceFr}</td>
                      <td style={{ padding: "6px 10px", color: C.inkSoft }}>{s.serviceNl}</td>
                      <td style={{ padding: "6px 10px", fontFamily: FONT_MONO, color: s.pax ? C.navy : C.line }}>{s.pax || "—"}</td>
                      <td style={{ padding: "6px 10px", fontFamily: FONT_MONO, color: s.sisco ? C.navy : C.line }}>{s.sisco || "—"}</td>
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

  const typeLabel = TYPE_LABELS[question.type];
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
          {question.direction === "numToService" ? t("question_num_to_service_court") : t("question_service_to_num_court")}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: question.direction === "numToService" ? 30 : 22, fontWeight: 700, color: C.navy, fontFamily: question.direction === "numToService" ? FONT_MONO : FONT_DISPLAY }}>
            {question.direction === "numToService" ? question.correct[question.type] : serviceName(question.correct, question.displayLang)}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: C.navy, borderRadius: 7, padding: "4px 9px", fontFamily: FONT_MONO, flexShrink: 0 }}>{typeLabel}</span>
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
                style={{ background: bg, border: `2px solid ${border}`, color, borderRadius: 12, padding: "14px 10px", fontSize: question.direction === "numToService" ? 14 : 18, fontWeight: 700, fontFamily: question.direction === "numToService" ? FONT_BODY : FONT_MONO, cursor: feedback ? "default" : "pointer", textAlign: "center" }}>
                {question.direction === "numToService" ? serviceName(opt, question.displayLang) : opt[question.type]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
