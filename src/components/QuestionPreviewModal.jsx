import { useState } from "react";
import { Undo2, ChevronUp, ChevronDown } from "lucide-react";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { qText, qChoix, itemText } from "../utils/bilingual.js";
import { Modal, Btn, inputStyle, CategoryBadges } from "./atoms.jsx";
import { RelierQuestion, ActionReactionPlayer } from "./ExamMode.jsx";

// Fenêtre d'aperçu d'une question (comme la verrait un élève), avec
// sélecteur de langue local — utilisée depuis la banque de questions pour
// vérifier le rendu avant de l'utiliser dans un questionnaire.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function QuestionPreviewModal({ question: q, categories, onClose }) {
  const { t } = useLang();
  const [lang, setLang] = useState("fr");
  const [answer, setAnswer] = useState(null);

  const handleImageClick = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.changedTouches ? e.changedTouches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    const current = answer || [];
    if (current.length >= (q.cibles || []).length) return;
    setAnswer([...current, { x, y }]);
  };
  const resetPoints = () => setAnswer([]);

  return (
    <Modal title={t("previsualiser_titre")} onClose={onClose} width={640}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 8, padding: 3 }}>
          {["fr", "nl"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: lang === l ? "#fff" : "transparent", color: lang === l ? C.navy : C.inkSoft, fontWeight: 700, fontSize: 12.5, cursor: "pointer", boxShadow: lang === l ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "4px 10px" }}>Question #{q.numero}</span>}
            <CategoryBadges allCategories={categories} cats={q.categories} />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{q.points} pt{q.points > 1 ? "s" : ""}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.navy, lineHeight: 1.4, marginBottom: 20 }}>{qText(q, lang)}</div>

        {q.media?.type === "audio" && <audio controls src={q.media.url} style={{ width: "100%", marginBottom: 20 }} />}
        {q.media?.type === "video" && q.type !== "point" && <video controls src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 20, border: `1px solid ${C.line}` }} />}
        {q.media?.type === "image" && q.type !== "point" && q.type !== "legende" && <img src={q.media.url} style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 20, border: `1px solid ${C.line}` }} />}

        {(q.type === "qcm" || q.type === "vrai_faux") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qChoix(q, lang).map((c, ci) => (
              <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${answer === ci ? C.navy : C.line}`, background: answer === ci ? C.bg : "#fff", cursor: "pointer" }}>
                <input type="radio" name={`preview-${q.id}`} checked={answer === ci} onChange={() => setAnswer(ci)} />{c}
              </label>
            ))}
          </div>
        )}
        {q.type === "qcm_multi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Plusieurs réponses sont possibles.</div>
            {qChoix(q, lang).map((c, ci) => {
              const selected = Array.isArray(answer) && answer.includes(ci);
              return (
                <label key={ci} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "12px 16px", borderRadius: 10, border: `1px solid ${selected ? C.navy : C.line}`, background: selected ? C.bg : "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected} onChange={() => { const cur = Array.isArray(answer) ? answer : []; setAnswer(cur.includes(ci) ? cur.filter(x => x !== ci) : [...cur, ci]); }} />{c}
                </label>
              );
            })}
          </div>
        )}
        {q.type === "ouverte" && <textarea style={{ ...inputStyle, minHeight: 150, resize: "vertical", fontSize: 14 }} placeholder={t("write_answer_placeholder")} value={(answer && answer.text) || ""} onChange={e => setAnswer({ text: e.target.value })} />}
        {q.type === "point" && q.media?.url && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("click_on")} {(q.cibles || []).length} {t("locations")} — {(answer || []).length}/{(q.cibles || []).length} {t("select_count")}{(answer || []).length > 1 ? "s" : ""}</span>
              {(answer || []).length > 0 && <Btn variant="ghost" icon={Undo2} onClick={resetPoints} style={{ padding: "5px 10px", fontSize: 12 }}>{t("reset")}</Btn>}
            </div>
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
              <img src={q.media.url} onClick={handleImageClick} onTouchEnd={handleImageClick} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", display: "block", touchAction: "manipulation" }} />
              {(answer || []).map((pt, pi) => (
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
                  <input style={inputStyle} placeholder={`À quoi correspond le point ${mi + 1} ?`} value={(answer && answer[mi]) || ""} onChange={e => { const cur = Array.isArray(answer) ? [...answer] : Array((q.marqueurs || []).length).fill(""); cur[mi] = e.target.value; setAnswer(cur); }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {q.type === "relier" && <RelierQuestion q={q} value={answer} onChange={setAnswer} langue={lang} />}
        {q.type === "action_reaction" && <ActionReactionPlayer q={q} value={answer} onChange={setAnswer} langue={lang} />}
        {q.type === "ordre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: -2 }}>Utilisez les flèches pour remettre ces actions dans le bon ordre.</div>
            {(answer || (q.items || []).map(it => it.id)).map((itemId, i) => {
              const currentOrder = answer || (q.items || []).map(it => it.id);
              const item = (q.items || []).find(it => it.id === itemId);
              const moveOrder = (dir) => {
                const j = i + dir;
                if (j < 0 || j >= currentOrder.length) return;
                const next = [...currentOrder];
                [next[i], next[j]] = [next[j], next[i]];
                setAnswer(next);
              };
              return (
                <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff" }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, color: C.inkSoft, width: 20 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{item ? itemText(item, lang) : ""}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveOrder(-1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, display: "flex" }}><ChevronUp size={16} /></button>
                    <button onClick={() => moveOrder(1)} disabled={i === currentOrder.length - 1} style={{ background: "none", border: "none", cursor: i === currentOrder.length - 1 ? "default" : "pointer", opacity: i === currentOrder.length - 1 ? 0.3 : 1, display: "flex" }}><ChevronDown size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
