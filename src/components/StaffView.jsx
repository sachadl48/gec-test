import { useState, useEffect } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { Home, Users, BookCheck, HelpCircle, ClipboardList, ClipboardCheck, ShieldCheck, Lock, Eye, Gamepad2 } from "lucide-react";
import { C, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { computeCategoryStats } from "../utils/scoring.js";
import { Btn, SectionTitle, EmptyState, Header, SaveErrorBanner, StatCard, GameButton } from "./atoms.jsx";
import { GestionProfils } from "./GestionProfils.jsx";
import { fetchNotesObligatoiresStatut } from "./profileShared.jsx";
import { CarnetsEleves } from "./Carnet.jsx";
import { GestionQuestions } from "./GestionQuestions.jsx";
import { GestionQuestionnaires, AnalysisView } from "./GestionQuestionnaires.jsx";
import { GestionComptes, AdminPage } from "./GestionComptes.jsx";
import { MaTeamView } from "./MaTeamView.jsx";
import { StationGame } from "./StationGame.jsx";
import { PhoneGame } from "./PhoneGame.jsx";
import { AbbreviationGame } from "./AbbreviationGame.jsx";
import { TranslationGame } from "./TranslationGame.jsx";

// Page d'accueil du staff (aperçu général avec la file d'attente de
// correction), et l'orchestrateur principal qui affiche le bon onglet
// (profils, carnets, questions, questionnaires, comptes, admin, ma team).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function StaffView({ user, users, setUsers, questions, setQuestions, questionnaires, setQuestionnaires, categories, setCategories, categoryConfig, setCategoryConfig, onLogout, saveError, requestPrint, onImportQuestions, onRenameCategory, refreshQuestionnaires }) {
  const { t } = useLang();
  const [tab, setTab] = useState("apercu");
  const isAdmin = user.role === "admin";
  const isSuperAdmin = user.superAdmin === true;
  const tabs = [
    { key: "apercu", label: t("nav_overview"), icon: Home },
    { key: "profils", label: t("nav_profiles"), icon: Users },
    { key: "carnets", label: t("nav_carnets"), icon: BookCheck },
    { key: "questions", label: t("nav_questions"), icon: HelpCircle },
    { key: "questionnaires", label: t("nav_questionnaires"), icon: ClipboardList },
    ...(isAdmin ? [{ key: "comptes", label: t("nav_accounts"), icon: ShieldCheck }] : []),
    ...(user.responsableTeam ? [{ key: "maTeam", label: t("nav_ma_team"), icon: ShieldCheck }] : []),
    ...(isSuperAdmin ? [{ key: "admin", label: t("nav_admin_page"), icon: Lock }] : []),
  ];
  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: 640, borderRadius: 16, overflow: "hidden" }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
        <div style={{ background: "#fff", borderRight: `1px solid ${C.line}`, padding: "20px 12px", minHeight: 580 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".05em", padding: "0 10px 10px" }}>{isAdmin ? t("nav_admin") : t("nav_staff")}</div>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 3, background: tab === tb.key ? C.navy : "transparent", color: tab === tb.key ? "#fff" : C.ink, fontSize: 13.5, fontWeight: 600 }}><tb.icon size={16} /> {tb.label}</button>
          ))}
        </div>
        <div style={{ padding: "24px 28px", minWidth: 0 }}>
          <SaveErrorBanner visible={saveError} />
          {tab === "apercu" && <Apercu users={users} setUsers={setUsers} questions={questions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} currentUser={user} />}
          {tab === "profils" && <GestionProfils users={users} setUsers={setUsers} questionnaires={questionnaires} questions={questions} categories={categories} categoryConfig={categoryConfig} isAdmin={isAdmin} currentUser={user} onPrint={async (eleve) => {
            const notesEleve = await fetchNotesObligatoiresStatut(eleve, questionnaires, categoryConfig);
            requestPrint({ type: "profile", eleve, questionnaires, categories, notesEleve });
          }} />}
          {tab === "carnets" && <CarnetsEleves users={users} setUsers={setUsers} questionnaires={questionnaires} questions={questions} categories={categories} categoryConfig={categoryConfig} isAdmin={isAdmin} currentUser={user} />}
          {tab === "questions" && <GestionQuestions questions={questions} setQuestions={setQuestions} categories={categories} setCategories={setCategories} categoryConfig={categoryConfig} setCategoryConfig={setCategoryConfig} isAdmin={isAdmin} onImportQuestions={onImportQuestions} onRenameCategory={onRenameCategory} questionnaires={questionnaires} users={users} currentUser={user} />}
          {tab === "questionnaires" && <GestionQuestionnaires users={users} questions={questions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} categoryConfig={categoryConfig} requestPrint={requestPrint} currentUser={user} />}
          {tab === "comptes" && isAdmin && <GestionComptes users={users} setUsers={setUsers} currentUser={user} />}
          {tab === "admin" && isSuperAdmin && <AdminPage refreshQuestionnaires={refreshQuestionnaires} />}
          {tab === "maTeam" && user.responsableTeam && <MaTeamView currentUser={user} users={users} setUsers={setUsers} questionnaires={questionnaires} questions={questions} categories={categories} categoryConfig={categoryConfig} requestPrint={requestPrint} />}
        </div>
      </div>
    </div>
  );
}

export function Apercu({ users, setUsers, questions, questionnaires, setQuestionnaires, categories, currentUser }) {
  const { t } = useLang();
  const [reviewing, setReviewing] = useState(null);
  const [showGame, setShowGame] = useState(false);
  const [showPhoneGame, setShowPhoneGame] = useState(false);
  const [showAbrevGame, setShowAbrevGame] = useState(false);
  const [showTradGame, setShowTradGame] = useState(false);
  const [dtmRecord, setDtmRecord] = useState(null);
  const [dtmRecordHard, setDtmRecordHard] = useState(null);
  const [dtmRecordTel, setDtmRecordTel] = useState(null);
  const [dtmRecordTelHard, setDtmRecordTelHard] = useState(null);
  const refreshLeaderboards = () => {
    supabase.rpc("get_station_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecord(data[0]); });
    supabase.rpc("get_station_game_leaderboard", { hard: true }).then(({ data }) => { if (data && data[0]) setDtmRecordHard(data[0]); });
    supabase.rpc("get_phone_game_leaderboard").then(({ data }) => { if (data && data[0]) setDtmRecordTel(data[0]); });
    supabase.rpc("get_phone_game_leaderboard", { hard: true }).then(({ data }) => { if (data && data[0]) setDtmRecordTelHard(data[0]); });
  };
  useEffect(() => {
    refreshLeaderboards();
    const id = setInterval(refreshLeaderboards, 20000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line
  const eleves = users.filter(u => u.role === "eleve");
  const aValider = questionnaires.filter(q => q.statut === "en attente de validation");
  const gradedAll = questionnaires.filter(q => q.statut === "validé" && !q.supprime);
  const catStats = computeCategoryStats(gradedAll, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));

  if (showGame) {
    return (
      <div>
        <StationGame user={currentUser} users={users} setUsers={setUsers} dtmRecord={dtmRecord} dtmRecordHard={dtmRecordHard} onExit={() => setShowGame(false)} refreshLeaderboards={refreshLeaderboards} />
      </div>
    );
  }
  if (showPhoneGame) {
    return (
      <div>
        <PhoneGame user={currentUser} users={users} setUsers={setUsers} dtmRecord={dtmRecordTel} dtmRecordHard={dtmRecordTelHard} onExit={() => setShowPhoneGame(false)} refreshLeaderboards={refreshLeaderboards} />
      </div>
    );
  }
  if (showAbrevGame) {
    return (
      <div>
        <AbbreviationGame onExit={() => setShowAbrevGame(false)} />
      </div>
    );
  }
  if (showTradGame) {
    return (
      <div>
        <TranslationGame onExit={() => setShowTradGame(false)} />
      </div>
    );
  }

  if (reviewing) {
    return (
      <AnalysisView questionnaire={reviewing} eleve={users.find(u => u.id === reviewing.eleveId)} questions={questions} categories={categories}
        onClose={() => setReviewing(null)}
        onValidate={(reponsesFinal, scoreParCategorie, scoreGlobal, remarks, manualGrades, overrides, categorieCounts) => {
          setQuestionnaires(questionnaires.map(q => q.id === reviewing.id ? {
            ...q, statut: "validé", reponses: reponsesFinal, scoreParCategorie, scoreGlobal, categorieCounts,
            remarques: remarks, manualGrades, overrides, correcteurId: currentUser?.id || null,
            dateValidation: new Date().toISOString().slice(0, 10),
          } : q));
          setReviewing(null);
        }} />
    );
  }
  return (
    <div>
      <SectionTitle>{t("apercu_title")}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 16, marginBottom: 24 }}>
        <StatCard label={t("stat_eleves_suivis")} value={eleves.length} />
        <StatCard label={t("stat_questions_banque")} value={questions.length} />
        <StatCard label={t("stat_qn_attribues")} value={questionnaires.length} />
        <StatCard label={t("stat_a_valider")} value={aValider.length} accent={aValider.length ? C.gold : C.navy} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <GameButton onClick={() => setShowGame(true)} title={t("jeu_stations_titre")} stats={[
          { label: t("mode_chrono_titre"), rows: [
            <span key="d">{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecord ? dtmRecord.score : 0}</strong></span>,
            dtmRecord && <span key="n">{dtmRecord.prenom} {dtmRecord.nom}</span>,
          ].filter(Boolean) },
          { label: t("difficulte_hard"), rows: [
            <span key="d">{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordHard ? dtmRecordHard.score : 0}</strong></span>,
            dtmRecordHard && <span key="n">{dtmRecordHard.prenom} {dtmRecordHard.nom}</span>,
          ].filter(Boolean) },
        ]} />
        <GameButton onClick={() => setShowPhoneGame(true)} title={t("jeu_telephones_titre")} stats={[
          { label: t("mode_chrono_titre"), rows: [
            <span key="d">{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordTel ? dtmRecordTel.score : 0}</strong></span>,
            dtmRecordTel && <span key="n">{dtmRecordTel.prenom} {dtmRecordTel.nom}</span>,
          ].filter(Boolean) },
          { label: t("difficulte_hard"), rows: [
            <span key="d">{t("record_dtm_label")} <strong style={{ color: C.gold, fontFamily: FONT_MONO }}>{dtmRecordTelHard ? dtmRecordTelHard.score : 0}</strong></span>,
            dtmRecordTelHard && <span key="n">{dtmRecordTelHard.prenom} {dtmRecordTelHard.nom}</span>,
          ].filter(Boolean) },
        ]} />
        <GameButton onClick={() => setShowAbrevGame(true)} title={t("jeu_abreviations_titre")} />
        <GameButton onClick={() => setShowTradGame(true)} title={t("jeu_traductions_titre")} />
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <SectionTitle>{t("reussite_globale_titre")}</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 8 }}>{t("reussite_globale_sub")}</div>
        {gradedAll.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("pas_de_donnees_body")} /> : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                <Radar dataKey="score" stroke={C.navy} fill={C.navy} fillOpacity={0.3} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("qn_attente_titre")}</SectionTitle>
        {aValider.length === 0 ? <EmptyState icon={ClipboardCheck} title={t("rien_a_valider_titre")} body={t("rien_a_valider_body")} /> : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {aValider.map(q => { const e = users.find(u => u.id === q.eleveId); return <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5 }}><span><strong>{q.titre}</strong> — {e?.prenom} {e?.nom}</span><Btn variant="gold" icon={Eye} onClick={() => setReviewing(q)} style={{ padding: "5px 12px", fontSize: 12.5 }}>{t("analyser_btn")}</Btn></div>; })}
          </div>
        )}
      </div>
    </div>
  );
}
