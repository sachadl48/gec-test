import { useState, useEffect } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { ClipboardList, Eye, FileDown, Gamepad2, PlayCircle, TrendingDown, TrendingUp } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { fonctionColor } from "../data/fonctions.js";
import { supabase, callEdgeFunction } from "../lib/supabaseClient.js";
import { rowToQuestion } from "../lib/mappers.js";
import { initials, computeCategoryStats, statutNoteObligatoire } from "../utils/scoring.js";
import {
  Btn, Badge, StatusBadge, SectionTitle, EmptyState, Header, LoadingScreen, SaveErrorBanner,
} from "./atoms.jsx";
import { ExamIntro } from "./ExamIntro.jsx";
import { ExamMode } from "./ExamMode.jsx";
import { StationGame } from "./StationGame.jsx";
import { PhoneGame } from "./PhoneGame.jsx";
import { AnalysisView } from "./GestionQuestionnaires.jsx";

// Vue "élève" (opérateur) : questionnaires en cours/à faire, points
// forts/faibles, accès au jeu des stations, passage d'examen et
// consultation de sa propre correction.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function EleveView({ user, users, setUsers, questionnaires, refreshQuestionnaires, categories, categoryConfig, onLogout, submitReponses, confirmRead, saveError }) {
  const { t } = useLang();
  const [playing, setPlaying] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [showPhoneGame, setShowPhoneGame] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [dtmRecord, setDtmRecord] = useState(null);
  const [dtmRecordHard, setDtmRecordHard] = useState(null);
  const [dtmRecordTel, setDtmRecordTel] = useState(null);
  const [dtmRecordTelHard, setDtmRecordTelHard] = useState(null);
  const [notesObligatoires, setNotesObligatoires] = useState([]);
  const [readingNote, setReadingNote] = useState(null); // { note, url } | null
  const [noteError, setNoteError] = useState("");
  const [startingNote, setStartingNote] = useState(false);

  const filiereNotes = user.fonction === "Élève régulateur" || user.fonction === "Élève dispatcheur" ? user.fonction : null;
  useEffect(() => {
    if (!filiereNotes) { setNotesObligatoires([]); return; }
    let cancelled = false;
    supabase.from("notes_obligatoires").select("*").eq("filiere", filiereNotes).order("ordre", { ascending: true })
      .then(({ data }) => { if (!cancelled) setNotesObligatoires(data || []); });
    return () => { cancelled = true; };
  }, [filiereNotes]);

  const ouvrirNote = async (note) => {
    setNoteError("");
    try {
      const path = user.langue === "nl" ? note.pdf_nl_path : note.pdf_fr_path;
      const { data, error } = await supabase.storage.from("notes-pdf").createSignedUrl(path, 3600);
      if (error) throw error;
      setReadingNote({ note, url: data.signedUrl });
    } catch (e) { setNoteError(e?.message || "Impossible d'ouvrir le PDF."); }
  };

  const demarrerQuestionnaireNote = async () => {
    if (!readingNote) return;
    setNoteError("");
    setStartingNote(true);
    try {
      // Si une tentative est déjà en cours (non terminée) pour cette note,
      // on la reprend plutôt que d'en créer une nouvelle en double.
      const enCours = mine.find(q => q.noteId === readingNote.note.id && q.statut === "en cours");
      if (enCours) {
        setPlaying(enCours);
      } else {
        const { id } = await callEdgeFunction("start-note-questionnaire", { noteId: readingNote.note.id });
        await refreshQuestionnaires();
        setPlaying({ id, eleveId: user.id, titre: readingNote.note.titre, questionIds: readingNote.note.question_ids, statut: "en cours" });
      }
      setReadingNote(null);
    } catch (e) { setNoteError(e?.message || "Impossible de démarrer le questionnaire."); }
    setStartingNote(false);
  };

  const refreshLeaderboards = () => {
    supabase.rpc("get_station_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecord(data[0]); });
    supabase.rpc("get_station_game_leaderboard", { hard: true }).then(({ data }) => { if (data && data[0]) setDtmRecordHard(data[0]); });
    supabase.rpc("get_phone_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecordTel(data[0]); });
    supabase.rpc("get_phone_game_leaderboard", { hard: true }).then(({ data }) => { if (data && data[0]) setDtmRecordTelHard(data[0]); });
  };
  useEffect(() => {
    refreshLeaderboards();
    // Rafraîchissement périodique pour voir rapidement si quelqu'un
    // d'autre vient de battre un record, sans devoir recharger la page.
    const id = setInterval(refreshLeaderboards, 20000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line
  const dtmBest = dtmRecord ? dtmRecord.score : 0;
  const dtmBestTel = dtmRecordTel ? dtmRecordTel.score : 0;
  const mine = questionnaires.filter(q => q.eleveId === user.id && !q.supprime);
  const graded = mine.filter(q => q.statut === "validé" && !q.supprime);
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

  if (readingNote) {
    const dejaReussie = statutNoteObligatoire(readingNote.note, questionnaires, user.id, categoryConfig).statut === true;
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          {noteError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{noteError}</div>}
          <SectionTitle>{readingNote.note.titre}</SectionTitle>
          <div style={{ height: 8 }} />
          <iframe src={`${readingNote.url}#toolbar=0`} title={readingNote.note.titre} style={{ width: "100%", height: "65vh", border: `1px solid ${C.line}`, borderRadius: 10, marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setReadingNote(null)}>{t("fermer_btn")}</Btn>
            {!dejaReussie && <Btn variant="primary" icon={PlayCircle} onClick={demarrerQuestionnaireNote} disabled={startingNote}>{startingNote ? t("chargement") + "…" : t("suivant_btn")}</Btn>}
          </div>
        </div>
      </div>
    );
  }

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
          <StationGame user={user} users={users} setUsers={setUsers} dtmRecord={dtmRecord} dtmRecordHard={dtmRecordHard} onExit={() => setShowGame(false)} refreshLeaderboards={refreshLeaderboards} />
        </div>
      </div>
    );
  }
  if (showPhoneGame) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
        <Header user={user} onLogout={onLogout} />
        <div style={{ padding: "24px 28px" }}>
          <PhoneGame user={user} users={users} setUsers={setUsers} dtmRecord={dtmRecordTel} dtmRecordHard={dtmRecordTelHard} onExit={() => setShowPhoneGame(false)} refreshLeaderboards={refreshLeaderboards} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            {notesObligatoires.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.line}`, padding: 22 }}>
                <SectionTitle>{t("notes_a_lire_titre")}</SectionTitle>
                {noteError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12, fontWeight: 600, padding: "8px 10px", borderRadius: 8, marginTop: 8 }}>{noteError}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {notesObligatoires.map(note => {
                    const { statut } = statutNoteObligatoire(note, questionnaires, user.id, categoryConfig);
                    const bg = statut === true ? C.greenSoft : statut === false ? C.redSoft : "#fff";
                    const border = statut === true ? C.green : statut === false ? C.red : C.line;
                    const color = statut === true ? C.green : statut === false ? C.red : C.inkSoft;
                    return (
                      <button key={note.id} onClick={() => ouvrirNote(note)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: bg, border: `1px solid ${border}`, borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%" }}>
                        <FileDown size={14} color={color} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{note.titre}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
                          {statut === true ? t("note_statut_reussie") : statut === false ? t("note_statut_a_relire") : t("note_statut_a_faire")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowGame(true)} style={{ flex: 1, background: C.navy, borderRadius: 14, border: "none", padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Gamepad2 size={18} color={C.gold} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{t("jeu_stations_titre")}</div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{t("mode_chrono_titre")}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScore || 0}</strong></div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBest}</strong></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{t("difficulte_hard")}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuStationsMeilleurScoreHard || 0}</strong></div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordHard ? dtmRecordHard.score : 0}</strong></div>
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => setShowPhoneGame(true)} style={{ flex: 1, background: C.navy, borderRadius: 14, border: "none", padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Gamepad2 size={18} color={C.gold} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{t("jeu_telephones_titre")}</div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{t("mode_chrono_titre")}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuTelephonesMeilleurScore || 0}</strong></div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmBestTel}</strong></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{t("difficulte_hard")}</div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_personnel_label")} <strong style={{ color: "#fff", fontFamily: FONT_MONO }}>{user.jeuTelephonesMeilleurScoreHard || 0}</strong></div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.65)" }}>{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordTelHard ? dtmRecordTelHard.score : 0}</strong></div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
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
