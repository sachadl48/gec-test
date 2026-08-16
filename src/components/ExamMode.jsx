import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronRight, CheckCircle2, AlertTriangle, Lock, Timer, Undo2, ChevronUp, ChevronDown, BadgeCheck,
} from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { AR_COLOR, AR_LABEL } from "../data/questionTypes.js";
import { shuffle, getResultReached, walkTrail } from "../utils/scoring.js";
import { qText, qChoix, itemText, paireText, arNodeText } from "../utils/bilingual.js";
import { Btn, ConfirmDialog, inputStyle, CategoryBadges } from "./atoms.jsx";
import { PALETTE } from "../theme.js";

// Écran de passage d'examen (élève) : minuteur, navigation entre questions,
// et affichage de chaque type de question (dont les deux composants
// spécifiques "Relier" et "Action/Réaction", aussi réutilisés ailleurs
// pour l'aperçu et la correction).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function formatTime(s) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }

export function ActionReactionPlayer({ q, value, onChange, langue }) {
  const path = Array.isArray(value) ? value : [];
  const trail = walkTrail(q.arbre, path);
  const last = trail[trail.length - 1];
  const awaitingChoice = last && last.type === "evenement";
  const finished = last && last.type === "resultat";
  const choose = (actionId) => { if (!awaitingChoice) return; onChange([...path, actionId]); };

  const NodeBox = ({ node, clickable, onClick }) => (
    <div onClick={clickable ? onClick : undefined} style={{
      background: "#fff", border: `2px solid ${AR_COLOR[node.type]}`, borderRadius: 10, padding: "12px 14px", width: 220, flexShrink: 0,
      cursor: clickable ? "pointer" : "default", boxShadow: clickable ? "0 2px 6px rgba(22,35,63,0.08)" : "none",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: AR_COLOR[node.type], textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 5 }}>
        {AR_LABEL[node.type]}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{arNodeText(node, langue)}</div>
      {clickable && <div style={{ marginTop: 8, fontSize: 11.5, color: C.navy, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>Choisir <ChevronRight size={12} /></div>}
    </div>
  );
  const Connector = () => <div style={{ width: 2, height: 18, background: C.line, flexShrink: 0 }} />;

  return (
    <div style={{ overflowX: "auto", padding: "6px 4px 10px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "fit-content", margin: "0 auto" }}>
        {trail.map((node, i) => (
          <React.Fragment key={node.id}>
            <NodeBox node={node} />
            {i < trail.length - 1 && <Connector />}
          </React.Fragment>
        ))}
        {awaitingChoice && (
          <>
            <Connector />
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Que faites-vous ?</div>
            <div style={{ display: "flex", gap: 16 }}>
              {(last.enfants || []).map(action => <NodeBox key={action.id} node={action} clickable onClick={() => choose(action.id)} />)}
            </div>
          </>
        )}
        {finished && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, color: C.green, fontSize: 13, fontWeight: 600 }}><CheckCircle2 size={16} /> Fin du scénario — vos choix sont définitifs.</div>
        )}
      </div>
    </div>
  );
}

export function RelierQuestion({ q, value, onChange, langue }) {
  const shuffledRight = useMemo(() => shuffle(q.paires), [q.id]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const answer = value && value.length === q.paires.length ? value : Array(q.paires.length).fill(null);
  const colorFor = (i) => PALETTE[i % PALETTE.length];

  const clickLeft = (i) => {
    if (answer[i]) { const next = [...answer]; next[i] = null; onChange(next); setSelectedLeft(null); return; }
    setSelectedLeft(selectedLeft === i ? null : i);
  };
  const clickRight = (pairId) => {
    const usedAt = answer.findIndex(a => a === pairId);
    if (selectedLeft === null) { if (usedAt !== -1) { const next = [...answer]; next[usedAt] = null; onChange(next); } return; }
    const next = [...answer];
    if (usedAt !== -1) next[usedAt] = null;
    next[selectedLeft] = pairId;
    onChange(next);
    setSelectedLeft(null);
  };

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>Cliquez un élément à gauche, puis son correspondant à droite pour les relier.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.paires.map((p, i) => {
            const linked = answer[i];
            return (
              <button key={p.id} onClick={() => clickLeft(i)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${selectedLeft === i ? C.navy : linked ? colorFor(i) : C.line}`, background: selectedLeft === i ? C.bg : "#fff", cursor: "pointer", fontSize: 13.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: linked ? colorFor(i) : C.bg, color: linked ? "#fff" : C.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                {paireText(p, "gauche", langue)}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shuffledRight.map((p) => {
            const leftIdx = answer.findIndex(a => a === p.id);
            const linked = leftIdx !== -1;
            return (
              <button key={p.id} onClick={() => clickRight(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${linked ? colorFor(leftIdx) : C.line}`, background: "#fff", cursor: "pointer", fontSize: 13.5 }}>
                {linked && <span style={{ width: 20, height: 20, borderRadius: "50%", background: colorFor(leftIdx), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{leftIdx + 1}</span>}
                {paireText(p, "droite", langue)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ExamMode({ questionnaire, questions, categories, questionLangues, onExit, onSubmit }) {
  const { t } = useLang();
  const qs = useMemo(() => questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean), [questionnaire, questions]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(() => qs.map(q => (q.type === "ouverte" ? { text: "" } : q.type === "legende" ? Array((q.marqueurs || []).length).fill("") : q.type === "action_reaction" ? [] : q.type === "ordre" ? shuffle((q.items || []).map(it => it.id)) : null)));
  const [qSecondsLeft, setQSecondsLeft] = useState(qs[0]?.dureeSecondes || null);
  const [locked, setLocked] = useState(() => qs.map(() => false));
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const prevIdxRef = useRef(idx);
  const q = qs[idx];
  const langFor = (i) => (questionLangues && questionLangues[i]) || "fr";

  // Avertit avant de fermer/rafraîchir l'onglet : les réponses ne sont
  // envoyées qu'au clic final sur "Envoyer mes réponses", donc fermer la
  // page en plein examen ferait perdre tout ce qui a déjà été répondu.
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const prev = prevIdxRef.current;
    if (prev !== idx && (qs[prev]?.dureeSecondes || qs[prev]?.type === "action_reaction")) {
      setLocked(l => { const n = [...l]; n[prev] = true; return n; });
    }
    prevIdxRef.current = idx;
    setQSecondsLeft(qs[idx]?.dureeSecondes || null);
    // eslint-disable-next-line
  }, [idx]);

  useEffect(() => {
    if (qSecondsLeft === null) return;
    if (qSecondsLeft <= 0) {
      if (idx < qs.length - 1) setIdx(i => i + 1); else onSubmit(answers);
      return;
    }
    const timerId = setTimeout(() => setQSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line
  }, [qSecondsLeft]);

  if (!q) {
    return (
      <div style={{ padding: "24px 28px" }}>
        <div style={{ background: C.redSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: "flex", gap: 12 }}>
          <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>Impossible d'afficher ce questionnaire</div>
            <div style={{ fontSize: 13, color: C.ink }}>Aucune question n'a pu être chargée. Contactez un moniteur ou un administrateur si le problème persiste.</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={onExit} style={{ marginTop: 16 }}>{t("previous")}</Btn>
      </div>
    );
  }

  const setAnswer = (val) => { const a = [...answers]; a[idx] = val; setAnswers(a); };
  const isAnswered = (i) => {
    const a = answers[i]; const type = qs[i].type;
    if (type === "ouverte") return !!(a && a.text && a.text.trim().length > 0);
    if (type === "point") return Array.isArray(a) && a.length === (qs[i].cibles || []).length;
    if (type === "relier") return Array.isArray(a) && a.length === (qs[i].paires || []).length && a.every(v => v !== null && v !== undefined);
    if (type === "qcm_multi") return Array.isArray(a) && a.length > 0;
    if (type === "legende") return Array.isArray(a) && a.length === (qs[i].marqueurs || []).length && a.every(v => typeof v === "string" && v.trim().length > 0);
    if (type === "action_reaction") return !!getResultReached(qs[i].arbre, Array.isArray(a) ? a : []);
    if (type === "ordre") return Array.isArray(a) && a.length === (qs[i].items || []).length;
    return a !== null && a !== undefined;
  };
  const answeredCount = answers.filter((_, i) => isAnswered(i)).length;
  const isResolved = (i) => isAnswered(i) || locked[i];
  const allAnswered = qs.every((_, i) => isResolved(i));
  const goTo = (i) => { if (locked[i]) return; if (q.type === "action_reaction" && !isAnswered(idx) && i !== idx) return; setIdx(i); };

  const handleImageClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    const current = answers[idx] || [];
    if (current.length >= (q.cibles || []).length) return;
    setAnswer([...current, { x, y }]);
  };
  const resetPoints = () => setAnswer([]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{questionnaire.titre}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{answeredCount} / {qs.length} {t("question_word")}{qs.length > 1 ? "s" : ""} {t("answered_word")}{answeredCount > 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn variant="ghost" onClick={onExit}>{t("continue_later")}</Btn>
        </div>
      </div>
      <div style={{ height: 6, background: "#fff", borderRadius: 4, overflow: "hidden", marginBottom: 16, border: `1px solid ${C.line}` }}>
        <div style={{ width: `${(answeredCount / qs.length) * 100}%`, height: "100%", background: C.gold, transition: "width .2s" }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {qs.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} disabled={locked[i]} title={locked[i] ? "Question chronométrée : retour impossible une fois quittée" : undefined} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${locked[i] ? C.line : i === idx ? C.navy : isAnswered(i) ? C.gold : C.line}`, background: locked[i] ? C.bg : i === idx ? C.navy : isAnswered(i) ? C.goldSoft : "#fff", color: locked[i] ? C.inkSoft : i === idx ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: locked[i] ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: locked[i] ? 0.6 : 1 }}>
            {locked[i] ? <Lock size={12} /> : i + 1}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32, minHeight: 320 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "5px 12px" }}>Question #{q.numero}</span>}
            <CategoryBadges allCategories={categories} cats={q.categories} />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{q.points} pt{q.points > 1 ? "s" : ""}</span>
        </div>
        {qSecondsLeft !== null && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 20px", borderRadius: 14, background: qSecondsLeft <= 10 ? C.redSoft : C.goldSoft, color: qSecondsLeft <= 10 ? C.red : C.navy, marginBottom: 22 }}>
            <Timer size={26} />
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 34, letterSpacing: ".02em" }}>{formatTime(qSecondsLeft)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>temps restant pour cette question</span>
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 600, color: C.navy, lineHeight: 1.4, marginBottom: 22 }}>{qText(q, langFor(idx))}</div>

        {q.media?.type === "audio" && <audio controls src={q.media.url} style={{ width: "100%", marginBottom: 22 }} />}
        {q.media?.type === "video" && q.type !== "point" && <video controls src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 22, border: `1px solid ${C.line}` }} />}
        {q.media?.type === "image" && q.type !== "point" && q.type !== "legende" && <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 22, border: `1px solid ${C.line}` }} />}

        {(q.type === "qcm" || q.type === "vrai_faux") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qChoix(q, langFor(idx)).map((c, ci) => (
              <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${answers[idx] === ci ? C.navy : C.line}`, background: answers[idx] === ci ? C.bg : "#fff", cursor: "pointer" }}>
                <input type="radio" name={`q-${q.id}`} checked={answers[idx] === ci} onChange={() => setAnswer(ci)} />{c}
              </label>
            ))}
          </div>
        )}
        {q.type === "qcm_multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Plusieurs réponses sont possibles.</div>
            {qChoix(q, langFor(idx)).map((c, ci) => {
              const selected = Array.isArray(answers[idx]) && answers[idx].includes(ci);
              return (
                <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${selected ? C.navy : C.line}`, background: selected ? C.bg : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected} onChange={() => { const cur = Array.isArray(answers[idx]) ? answers[idx] : []; setAnswer(cur.includes(ci) ? cur.filter(x => x !== ci) : [...cur, ci]); }} />{c}
                </label>
              );
            })}
          </div>
        )}
        {q.type === "ouverte" && <textarea style={{ ...inputStyle, minHeight: 150, resize: "vertical", fontSize: 14 }} placeholder={t("write_answer_placeholder")} value={(answers[idx] && answers[idx].text) || ""} onChange={e => setAnswer({ text: e.target.value })} />}
        {q.type === "point" && q.media?.url && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("click_on")} {(q.cibles || []).length} {t("locations")} — {(answers[idx] || []).length}/{(q.cibles || []).length} {t("select_count")}{(answers[idx] || []).length > 1 ? "s" : ""}</span>
              {(answers[idx] || []).length > 0 && <Btn variant="ghost" icon={Undo2} onClick={resetPoints} style={{ padding: "5px 10px", fontSize: 12 }}>{t("reset")}</Btn>}
            </div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
              <img src={q.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
              {(answers[idx] || []).map((pt, pi) => (
                <div key={pi} style={{ position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`, width: 22, height: 22, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{pi + 1}</div>
              ))}
            </div>
          </div>
        )}
        {q.type === "legende" && q.media?.url && (
          <div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", marginBottom: 16 }}>
              <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, display: "block" }} />
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 26, height: 26, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{mi + 1}</div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(q.marqueurs || []).map((m, mi) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.goldSoft, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{mi + 1}</span>
                  <input style={inputStyle} placeholder={`À quoi correspond le point ${mi + 1} ?`} value={(answers[idx] && answers[idx][mi]) || ""} onChange={e => { const cur = Array.isArray(answers[idx]) ? [...answers[idx]] : Array((q.marqueurs || []).length).fill(""); cur[mi] = e.target.value; setAnswer(cur); }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {q.type === "relier" && <RelierQuestion q={q} value={answers[idx]} onChange={setAnswer} langue={(questionLangues && questionLangues[idx]) || "fr"} />}
        {q.type === "action_reaction" && <ActionReactionPlayer q={q} value={answers[idx]} onChange={setAnswer} langue={(questionLangues && questionLangues[idx]) || "fr"} />}
        {q.type === "ordre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Utilisez les flèches pour remettre ces actions dans le bon ordre.</div>
            {(answers[idx] || []).map((itemId, i) => {
              const item = (q.items || []).find(it => it.id === itemId);
              const order = answers[idx];
              const moveOrder = (dir) => {
                const j = i + dir;
                if (j < 0 || j >= order.length) return;
                const next = [...order];
                [next[i], next[j]] = [next[j], next[i]];
                setAnswer(next);
              };
              return (
                <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.bg, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, flex: 1 }}>{itemText(item, langFor(idx))}</span>
                  <Btn variant="ghost" icon={ChevronUp} onClick={() => moveOrder(-1)} style={{ padding: "6px 8px" }} disabled={i === 0} />
                  <Btn variant="ghost" icon={ChevronDown} onClick={() => moveOrder(1)} style={{ padding: "6px 8px" }} disabled={i === order.length - 1} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <Btn variant="ghost" onClick={() => goTo(Math.max(0, idx - 1))} disabled={idx === 0 || locked[idx - 1] || (q.type === "action_reaction" && !isAnswered(idx))}>{t("previous")}</Btn>
        {idx < qs.length - 1
          ? <Btn variant="primary" onClick={() => setIdx(Math.min(qs.length - 1, idx + 1))} disabled={q.type === "action_reaction" && !isAnswered(idx)}>{t("next")}</Btn>
          : <Btn variant="primary" icon={BadgeCheck} disabled={!allAnswered} onClick={() => setConfirmSubmit(true)}>{t("submit_answers")}</Btn>}
      </div>
      {confirmSubmit && (
        <ConfirmDialog title={t("confirm_envoi_titre") || "Envoyer vos réponses ?"} message={t("confirm_envoi_msg") || "Une fois envoyées, vos réponses ne pourront plus être modifiées."} confirmLabel={t("submit_answers")}
          onConfirm={() => { setConfirmSubmit(false); onSubmit(answers); }} onCancel={() => setConfirmSubmit(false)} />
      )}
    </div>
  );
}
