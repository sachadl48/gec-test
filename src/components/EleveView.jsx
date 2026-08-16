import { useState, useEffect } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { ClipboardList, Eye, Gamepad2, PlayCircle, TrendingDown, TrendingUp } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { fonctionColor } from "../data/fonctions.js";
import { supabase, callEdgeFunction } from "../lib/supabaseClient.js";
import { rowToQuestion } from "../lib/mappers.js";
import { initials, computeCategoryStats } from "../utils/scoring.js";
import {
  Btn, Badge, StatusBadge, SectionTitle, EmptyState, Header, LoadingScreen, SaveErrorBanner,
} from "./atoms.jsx";
import { ExamIntro } from "./ExamIntro.jsx";
import { ExamMode } from "./ExamMode.jsx";
import { StationGame } from "./StationGame.jsx";
import { AnalysisView } from "./GestionQuestionnaires.jsx";

// Vue "élève" (opérateur) : questionnaires en cours/à faire, points
// forts/faibles, accès au jeu des stations, passage d'examen et
// consultation de sa propre correction.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function EleveView({ user, users, setUsers, questionnaires, categories, onLogout, submitReponses, confirmRead, saveError }) {
  const { t } = useLang();
  const [playing, setPlaying] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [dtmRecord, setDtmRecord] = useState(null);
  useEffect(() => {
    supabase.rpc("get_station_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecord(data[0]); });
  }, []);
  const dtmBest = dtmRecord ? dtmRecord.score : 0;
  const mine = questionnaires.filter(q => q.eleveId === user.id && !q.supprime);
  const graded = mine.filter(q => q.statut === "validé");
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const scoreEntries = categories.map(cat => [cat, catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : null]);
  const strengths = scoreEntries.filter(([, v]) => v != null && v >= 75).sort((a, b) => b[1] - a[1]);
  const weaknesses = scoreEntries.filter(([, v]) => v != null && v < 60).sort((a, b) => a[1] - b[1]);

  // Va chercher les questions au bon moment : version sans les réponses pour
  // passer l'examen, version complète (autorisée par la base de données)
  // pour revoir une correction déjà validée.
  useEffect(() => {
    if (!playing && !viewing) { setActiveQuestions(null); return; }
    (async () => {
      setActiveQuestions(null); setFetchError("");
      try {
        if (playing) {
          const { questions: qs } = await callEdgeFunction("get-exam-questionnaire", { questionnaireId: playing.id });
          setActiveQuestions(qs.map(rowToQuestion));
        } else if (viewing) {
          const { questions: qs } = await callEdgeFunction("get-exam-questionnaire", { questionnaireId: viewing.id });
          const ordered = viewing.questionIds.map(id => qs.find(q => q.id === id)).filter(Boolean);
          setActiveQuestions(ordered.map(rowToQuestion));
        }
      } catch (e) { setFetchError(e.message || "Impossible de charger les questions."); }
    })();
  }, [playing?.id, viewing?.id]);

  if (playing && !examStarted) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        {!activeQuestions ? <LoadingScreen label={fetchError || "Préparation du questionnaire..."} /> : <ExamIntro questionnaire={playing} questions={activeQuestions} onStart={() => setExamStarted(true)} onExit={() => setPlaying(null)} />}
      </div>
    );
  }
  if (playing && examStarted) {
    const qFull = questionnaires.find(q => q.id === playing.id) || playing;
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        {!activeQuestions ? <LoadingScreen label="Chargement..." /> : <ExamMode questionnaire={qFull} questions={activeQuestions} categories={categories} questionLangues={qFull.questionLangues || qFull.questionIds.map(() => user.langue || "fr")} onExit={() => { setPlaying(null); setExamStarted(false); }} onSubmit={(reponses) => { submitReponses(qFull.id, reponses); setPlaying(null); setExamStarted(false); }} />}
      </div>
    );
  }
  if (viewing) {
    const qFull = questionnaires.find(q => q.id === viewing.id) || viewing;
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          {!activeQuestions ? <LoadingScreen label={fetchError || "Chargement de la correction..."} /> : (
            <AnalysisView questionnaire={qFull} eleve={user} questions={activeQuestions} categories={categories} onClose={() => setViewing(null)} readOnly showConfirmRead readConfirmed={!!qFull.luConfirme} onConfirmRead={() => confirmRead(qFull.id)} onValidate={() => {}} />
          )}
        </div>
      </div>
    );
  }
  if (showGame) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          <StationGame user={user} users={users} setUsers={setUsers} dtmRecord={dtmRecord} onExit={() => setShowGame(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ padding: "24px 28px" }}>
        <SaveErrorBanner visible={saveError} />
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22, height: "fit-content" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{initials(user.prenom, user.nom)}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.navy }}>{user.prenom} {user.nom}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{t("agent_number")} : {user.numeroAgent}</div>
            <div style={{ marginTop: 14 }}><Badge {...fonctionColor(user.fonction)}>{user.fonction || t("student_badge")}</Badge></div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4 }}>{t("questionnaires_done")}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, color: C.navy }}>{graded.length}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <button onClick={() => setShowGame(true)} style={{ background: C.navy, borderRadius: 14, border: "none", padding: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Gamepad2 size={20} color={C.gold} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: "#fff" }}>{t("jeu_stations_titre")}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScore || 0}</strong></span>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBest}</strong>{dtmRecord && <span> ({dtmRecord.prenom} {dtmRecord.nom})</span>}</span>
                </div>
              </div>
            </button>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22 }}>
              <SectionTitle>{t("strengths_weaknesses")}</SectionTitle>
              {graded.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 10 }}>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke={C.line} />
                        <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 10.5, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                        <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.green, fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}><TrendingUp size={14} /> {t("strengths")}</div>
                      {strengths.length ? strengths.map(([cat, v]) => <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}><span>{cat}</span><span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{v}%</span></div>) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("no_strength_yet")}</div>}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.red, fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}><TrendingDown size={14} /> {t("weaknesses")}</div>
                      {weaknesses.length ? weaknesses.map(([cat, v]) => <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.line}` }}><span>{cat}</span><span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>{v}%</span></div>) : <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("no_weakness_yet")}</div>}
                    </div>
                  </div>
                </div>
              ) : <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("no_results_body")} />}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22 }}>
              <SectionTitle>{t("my_questionnaires")}</SectionTitle>
              {mine.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_qn_title")} body={t("no_qn_body")} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {mine.slice().reverse().map(q => (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: C.navy }}>{q.titre}</div>
                        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{q.dateAttribution} · {q.categories.join(", ")} · {q.nbQuestions} questions</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {q.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 14, color: C.navy }}>{q.scoreGlobal}%</span>}
                        {q.statut === "en cours" ? <Btn variant="gold" icon={PlayCircle} onClick={() => setPlaying(q)}>{t("start")}</Btn>
                          : q.statut === "validé" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {!q.luConfirme && <Badge color={C.gold} bg={C.goldSoft}>À lire</Badge>}
                              <Btn variant="subtle" icon={Eye} onClick={() => setViewing(q)}>Voir ma correction</Btn>
                            </div>
                          ) : <StatusBadge statut={q.statut} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
