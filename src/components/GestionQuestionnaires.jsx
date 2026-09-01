import { useState, useEffect, useMemo } from "react";
import {
  BadgeCheck, Ban, BookCheck, CheckCircle2, CheckSquare, ClipboardCheck, ClipboardList,
  ExternalLink, Eye, FileDown, Filter, Globe, MessageSquare, Shuffle, Square, Tag, Timer,
  X, XCircle, ListChecks as ListChecksIcon,
} from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang, LANGS } from "../lang.jsx";
import { AR_COLOR, AR_LABEL } from "../data/questionTypes.js";
import { FONCTIONS, fonctionLabel } from "../data/fonctions.js";
import { genId } from "../utils/id.js";
import { qText, qChoix, itemText, paireText, arNodeText, mediaFor, ciblesFor, marqueursFor } from "../utils/bilingual.js";
import { normalizeText } from "../utils/userAccount.js";
import { shuffle, getResultReached, walkTrail, scoreQcmMulti, scoreOrdre, scorePoint, computeLegendePoints } from "../utils/scoring.js";
import {
  Btn, Field, inputStyle, Badge, StatusBadge, CategoryBadges, TypeBadge, Modal, EmptyState, SectionTitle, pillStyle,
} from "./atoms.jsx";
import { ReseauDrawing } from "./ReseauDrawing.jsx";

// Toute la gestion des questionnaires côté staff : attribution à un ou
// plusieurs élèves (avec choix de langue par question), liste avec filtres
// et historique, et AnalysisView — l'écran de correction/révision détaillé,
// utilisé ici mais aussi par l'élève (sa propre correction), l'aperçu
// général et Ma Team.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function GestionQuestionnaires({ users, questions, questionnaires, setQuestionnaires, categories, categoryConfig, requestPrint, currentUser }) {
  const { t } = useLang();
  const [subtab, setSubtab] = useState("attribuer");
  const eleves = users.filter(u => u.role === "eleve");
  return (
    <div>
      <SectionTitle>{t("nav_questionnaires")}</SectionTitle>
      <div style={{ display: "flex", gap: 8, margin: "14px 0 18px" }}>
        <button onClick={() => setSubtab("attribuer")} style={pillStyle(subtab === "attribuer")}>{t("attribuer_qn")}</button>
        <button onClick={() => setSubtab("liste")} style={pillStyle(subtab === "liste")}>{t("analyser_valider")}</button>
      </div>
      {subtab === "attribuer" ? <AttribuerQuestionnaire eleves={eleves} questions={questions} setQuestionnaires={setQuestionnaires} questionnaires={questionnaires} categories={categories} categoryConfig={categoryConfig} /> : <ListeQuestionnaires users={users} questions={questions} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} categories={categories} requestPrint={requestPrint} currentUser={currentUser} />}
    </div>
  );
}

function resolveQuestionLangues(mode, eleveLangue, count) {
  const base = eleveLangue === "nl" ? "nl" : "fr";
  const opp = base === "fr" ? "nl" : "fr";
  if (mode === "inverse") return Array(count).fill(opp);
  if (mode === "5050") return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? "fr" : "nl"));
  return Array(count).fill(base);
}
export function AttribuerQuestionnaire({ eleves, questions, setQuestionnaires, questionnaires, categories, categoryConfig }) {
  const { t, lang } = useLang();
  const [eleveId, setEleveId] = useState(eleves[0]?.id || "");
  const [selectionType, setSelectionType] = useState("aleatoire"); // "aleatoire" | "categories" | "questions"
  const mode = selectionType === "aleatoire" ? "aleatoire" : "cible"; // valeur réellement enregistrée en base (contrainte : seules "aleatoire"/"cible" sont acceptées)
  const [langueMode, setLangueMode] = useState("eleve");
  const [cats, setCats] = useState([]);
  const [nb, setNb] = useState(8);
  const [titre, setTitre] = useState("");
  const [preview, setPreview] = useState(null);
  const [avoidRepeats, setAvoidRepeats] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [rechercheQuestion, setRechercheQuestion] = useState("");
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);
  const toggleCat = (c) => setCats(cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c]);
  const askedQuestionIds = useMemo(() => new Set(questionnaires.filter(q => q.eleveId === eleveId).flatMap(q => q.questionIds || [])), [questionnaires, eleveId]);
  const alreadyAskedCount = askedQuestionIds.size;
  const selectedEleve = eleves.find(e => e.id === eleveId);
  const eleveFonction = selectedEleve?.fonction || "Élève régulateur";
  const allowedCats = useMemo(() => categories.filter(c => (categoryConfig[c]?.fonctions || FONCTIONS).includes(eleveFonction)), [categories, categoryConfig, eleveFonction]);
  useEffect(() => { setCats(c => c.filter(x => allowedCats.includes(x))); }, [eleveId]); // eslint-disable-line
  const questionsSelectionnables = useMemo(() => {
    const term = rechercheQuestion.trim().toLowerCase();
    return questions
      .filter(q => q.statut !== "suspendue" && (q.categories || []).some(c => allowedCats.includes(c)))
      .filter(q => !term || qText(q, lang).toLowerCase().includes(term) || String(q.numero || "").includes(term))
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));
  }, [questions, allowedCats, rechercheQuestion, lang]);
  const pool = useMemo(() => {
    if (selectionType === "questions") return questions.filter(q => selectedQuestionIds.includes(q.id));
    let base = selectionType === "aleatoire" || cats.length === 0
      ? questions.filter(q => q.statut !== "suspendue" && (q.categories || []).some(c => allowedCats.includes(c)))
      : questions.filter(q => q.statut !== "suspendue" && (q.categories || []).some(c => cats.includes(c) && allowedCats.includes(c)));
    if (avoidRepeats) base = base.filter(q => !askedQuestionIds.has(q.id));
    return base;
  }, [selectionType, cats, questions, avoidRepeats, askedQuestionIds, allowedCats, selectedQuestionIds]);
  const genererApercu = () => {
    if (selectionType === "questions") { setPreview(pool); return; }
    const n = Math.min(nb, pool.length); setPreview(shuffle(pool).slice(0, n));
  };
  const previewLangues = useMemo(() => preview ? resolveQuestionLangues(langueMode, selectedEleve?.langue || "fr", preview.length) : [], [preview, langueMode, selectedEleve]);
  const attribuer = () => {
    if (!eleveId || pool.length === 0) return;
    const chosen = preview || (selectionType === "questions" ? pool : shuffle(pool).slice(0, Math.min(nb, pool.length)));
    const categoriesUtilisees = selectionType === "questions"
      ? Array.from(new Set(chosen.flatMap(q => q.categories || [])))
      : (selectionType === "aleatoire" || cats.length === 0 ? allowedCats : cats);
    const now = new Date();
    const finalTitre = titre.trim() || `Questionnaire du ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const questionLangues = resolveQuestionLangues(langueMode, selectedEleve?.langue || "fr", chosen.length);
    setQuestionnaires([...questionnaires, { id: genId("qn"), eleveId, titre: finalTitre, categories: categoriesUtilisees, mode, nbQuestions: chosen.length, questionIds: chosen.map(q => q.id), questionLangues, langueMode, dateAttribution: new Date().toISOString().slice(0, 10), statut: "en cours", reponses: null, scoreParCategorie: null, scoreGlobal: null, luConfirme: false }]);
    const eleve = eleves.find(e => e.id === eleveId);
    setSuccessMsg(t("qn_attribue_msg", { titre: finalTitre, nom: `${eleve?.prenom} ${eleve?.nom}` }));
    setPreview(null); setTitre(""); setSelectedQuestionIds([]);
  };
  return (
    <div>
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: C.greenSoft, color: C.green, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 10, marginBottom: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={16} /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, display: "flex" }}><X size={15} /></button>
        </div>
      )}
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <Field label={t("eleve_concerne")}><select style={inputStyle} value={eleveId} onChange={e => setEleveId(e.target.value)}>{eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.numeroAgent} ({fonctionLabel(e.fonction, lang) || t("role_eleve")})</option>)}</select></Field>
        <Field label={t("titre_qn_label")} hint={t("titre_qn_hint")}><input style={inputStyle} placeholder={t("titre_qn_placeholder")} value={titre} onChange={e => setTitre(e.target.value)} /></Field>
        <Field label={t("langue_qn_label")} hint={t("langue_qn_hint")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "eleve" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "eleve" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "eleve"} onChange={() => setLangueMode("eleve")} /><Globe size={14} /> {t("langue_evalue")} {selectedEleve && <span style={{ color: C.inkSoft }}>({selectedEleve.langue === "nl" ? "Nederlands" : "Français"})</span>}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "inverse" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "inverse" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "inverse"} onChange={() => setLangueMode("inverse")} /><Globe size={14} /> {t("langue_inverse_evalue")} {selectedEleve && <span style={{ color: C.inkSoft }}>({selectedEleve.langue === "nl" ? "Français" : "Nederlands"})</span>}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${langueMode === "5050" ? C.navy : C.line}`, borderRadius: 8, background: langueMode === "5050" ? C.bg : "#fff", cursor: "pointer" }}><input type="radio" checked={langueMode === "5050"} onChange={() => setLangueMode("5050")} /><Globe size={14} /> {t("langue_5050")}</label>
          </div>
        </Field>
        <Field label={t("selection_categories_label")} hint={t("categories_role_hint", { role: fonctionLabel(eleveFonction, lang) })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${selectionType === "aleatoire" ? C.gold : C.line}`, borderRadius: 8, background: selectionType === "aleatoire" ? C.goldSoft : "#fff", cursor: "pointer" }}><input type="radio" checked={selectionType === "aleatoire"} onChange={() => { setSelectionType("aleatoire"); setCats([]); setSelectedQuestionIds([]); }} /><Shuffle size={14} /> {t("mode_aleatoire")}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${selectionType === "categories" ? C.navy : C.line}`, borderRadius: 8, cursor: "pointer" }}><input type="radio" checked={selectionType === "categories"} onChange={() => { setSelectionType("categories"); setSelectedQuestionIds([]); }} /><Filter size={14} /> {t("mode_cible")}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", border: `1px solid ${selectionType === "questions" ? C.navy : C.line}`, borderRadius: 8, cursor: "pointer" }}><input type="radio" checked={selectionType === "questions"} onChange={() => { setSelectionType("questions"); setCats([]); }} /><ListChecksIcon size={14} /> {t("mode_questions_ciblees")}</label>
          </div>
          {selectionType === "categories" && (
            allowedCats.length === 0
              ? <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{t("aucune_categorie_role", { role: fonctionLabel(eleveFonction, lang) })}</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{allowedCats.map(c => <button key={c} type="button" onClick={() => toggleCat(c)} style={{ padding: "5px 11px", borderRadius: 16, border: `1px solid ${cats.includes(c) ? C.navy : C.line}`, background: cats.includes(c) ? C.navy : "#fff", color: cats.includes(c) ? "#fff" : C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}</div>
          )}
          {selectionType === "questions" && (
            <div style={{ marginTop: 10 }}>
              <input style={{ ...inputStyle, marginBottom: 8 }} placeholder={t("rechercher_question_placeholder")} value={rechercheQuestion} onChange={e => setRechercheQuestion(e.target.value)} />
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, border: `1px solid ${C.line}`, borderRadius: 8, padding: 6 }}>
                {questionsSelectionnables.length === 0 && <div style={{ fontSize: 12.5, color: C.inkSoft, padding: 8 }}>{t("aucune_question_trouvee")}</div>}
                {questionsSelectionnables.map(q => (
                  <label key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: selectedQuestionIds.includes(q.id) ? C.bg : "transparent" }}>
                    <input type="checkbox" checked={selectedQuestionIds.includes(q.id)} onChange={() => setSelectedQuestionIds(ids => ids.includes(q.id) ? ids.filter(x => x !== q.id) : [...ids, q.id])} />
                    {typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 700, color: "#fff", background: C.navy2, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>#{q.numero}</span>}
                    <span style={{ flex: 1 }}>{qText(q, lang)}</span>
                  </label>
                ))}
              </div>
              {selectedQuestionIds.length > 0 && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{t("questions_selectionnees_n", { n: selectedQuestionIds.length })}</div>}
            </div>
          )}
        </Field>
        <Field label={t("repetitions_label")} hint={eleveId ? t("deja_attribuees_hint", { n: alreadyAskedCount }) : null}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={avoidRepeats} onChange={e => setAvoidRepeats(e.target.checked)} disabled={!eleveId} /> {t("ne_pas_reattribuer")}
          </label>
        </Field>
        {selectionType !== "questions" && <Field label={t("nb_questions_label", { n: pool.length })}><input type="number" min={1} max={pool.length || 1} style={inputStyle} value={nb} onChange={e => setNb(Number(e.target.value))} /></Field>}
        <Btn variant="ghost" icon={Eye} onClick={genererApercu} style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} disabled={pool.length === 0}>{t("generer_apercu")}</Btn>
        <Btn variant="primary" icon={BadgeCheck} onClick={attribuer} style={{ width: "100%", justifyContent: "center" }} disabled={!eleveId || pool.length === 0}>{t("attribuer_eleve")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("apercu_tirage_titre")}</SectionTitle>
        {!preview ? <EmptyState icon={Shuffle} title={t("aucun_apercu_titre")} body={t("aucun_apercu_body")} /> : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {preview.map((q, i) => (
              <div key={q.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 9 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft, minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: "#fff", background: C.navy2, borderRadius: 6, padding: "2px 7px" }}>#{q.numero}</span>}<CategoryBadges allCategories={categories} cats={q.categories} /><TypeBadge type={q.type} />{!!q.dureeSecondes && <Badge color={C.gold} bg={C.goldSoft}><Timer size={10} />{Math.floor(q.dureeSecondes / 60)}:{String(q.dureeSecondes % 60).padStart(2, "0")}</Badge>}<Badge color={previewLangues[i] === "nl" ? C.teal : C.navy2} bg={previewLangues[i] === "nl" ? C.tealSoft : C.bg}>{previewLangues[i] === "nl" ? "NL" : "FR"}</Badge></div><div style={{ fontSize: 13.5, marginTop: 6 }}>{qText(q, previewLangues[i])}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export function ListeQuestionnaires({ users, questions, questionnaires, setQuestionnaires, categories, requestPrint, currentUser }) {
  const { t } = useLang();
  const [reviewing, setReviewing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [histFilter, setHistFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteJustification, setDeleteJustification] = useState("");
  const eleves = users.filter(u => u.role === "eleve");
  const resolveCorrecteur = (q) => (q.correcteurId ? users.find(u => u.id === q.correcteurId) : null);
  const toReview = questionnaires.filter(q => q.statut === "en attente de validation");
  const others = questionnaires
    .filter(q => q.statut !== "en attente de validation" && (!histFilter || q.eleveId === histFilter) && (showDeleted || !q.supprime))
    .slice()
    .sort((a, b) => (b.dateAttribution || "").localeCompare(a.dateAttribution || ""));
  const othersDisplayed = displayCount === "tout" ? others : others.slice(0, displayCount);
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exportSelection = () => {
    const items = others.filter(q => selected.has(q.id)).map(q => ({ questionnaire: q, eleve: users.find(u => u.id === q.eleveId) }));
    if (items.length) requestPrint({ type: "questionnaires", items, questions, categories });
  };
  const confirmDelete = () => {
    if (!deleteJustification.trim() || !deleteTarget) return;
    setQuestionnaires(questionnaires.map(q => q.id === deleteTarget.id ? {
      ...q, supprime: true, justificationSuppression: deleteJustification.trim(),
      supprimePar: currentUser ? { prenom: currentUser.prenom, nom: currentUser.nom } : null,
      dateSuppression: new Date().toISOString().slice(0, 10),
    } : q));
    setDeleteTarget(null); setDeleteJustification("");
  };

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
  if (viewing) {
    return <AnalysisView questionnaire={{ ...viewing, correcteur: resolveCorrecteur(viewing) }} eleve={users.find(u => u.id === viewing.eleveId)} questions={questions} categories={categories} onClose={() => setViewing(null)} readOnly onValidate={() => {}} />;
  }

  return (
    <div>
      <SectionTitle>{t("a_analyser_valider")}</SectionTitle>
      {toReview.length === 0 ? <div style={{ marginTop: 12 }}><EmptyState icon={ClipboardCheck} title={t("rien_en_attente_titre")} body={t("rien_en_attente_body")} /></div> : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {toReview.map(q => { const e = users.find(u => u.id === q.eleveId); return <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px" }}><div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{q.titre}</div><div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{e?.prenom} {e?.nom} · {q.nbQuestions} {t("question_word")}{q.nbQuestions > 1 ? "s" : ""} · {t("attribue_le")} {q.dateAttribution}</div></div><Btn variant="gold" icon={Eye} onClick={() => setReviewing(q)}>{t("analyser_btn")}</Btn></div>; })}
        </div>
      )}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <SectionTitle>{t("historique_titre")}</SectionTitle>
            {others.length > 0 && <span style={{ fontSize: 12, color: C.inkSoft }}>{t("nb_sur_total", { n: othersDisplayed.length, total: others.length })}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {selected.size > 0 && <Btn variant="gold" icon={FileDown} onClick={exportSelection}>{t("exporter_selection", { n: selected.size })}</Btn>}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.inkSoft, cursor: "pointer" }}>
              <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
              {t("afficher_supprimes")}
            </label>
            <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={displayCount} onChange={e => setDisplayCount(e.target.value === "tout" ? "tout" : Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value="tout">{t("tout_afficher")}</option>
            </select>
            <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={histFilter} onChange={e => setHistFilter(e.target.value)}>
              <option value="">{t("tous_les_eleves")}</option>
              {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {othersDisplayed.length === 0 && <EmptyState icon={ClipboardList} title={t("aucun_resultat_titre")} body={t("aucun_resultat_body")} />}
          {othersDisplayed.map(q => { const e = users.find(u => u.id === q.eleveId); const isValide = q.statut === "validé"; const correcteur = resolveCorrecteur(q); const isSupprime = !!q.supprime; return (
            <div key={q.id} style={{ display: "flex", flexDirection: "column", background: isSupprime ? C.redSoft : "#fff", border: `1px solid ${isSupprime ? C.red : selected.has(q.id) ? C.gold : C.line}`, borderRadius: 10, padding: "10px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isValide && !isSupprime && <button onClick={() => toggleSelect(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(q.id) ? C.gold : C.inkSoft, display: "flex" }}>{selected.has(q.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button>}
                  <span style={{ fontSize: 13, textDecoration: isSupprime ? "line-through" : "none", color: isSupprime ? C.red : C.ink }}>
                    {q.titre} — {e?.prenom} {e?.nom} <span style={{ color: isSupprime ? C.red : C.inkSoft }}>· {q.dateAttribution}</span>
                    {isValide && correcteur && <span style={{ color: isSupprime ? C.red : C.inkSoft }}>{t("corrige_par")}{correcteur.prenom} {correcteur.nom}</span>}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {q.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, textDecoration: isSupprime ? "line-through" : "none", color: isSupprime ? C.red : C.ink }}>{q.scoreGlobal}%</span>}
                  <StatusBadge statut={q.statut} />
                  {isValide && !isSupprime && <Btn variant="subtle" icon={ExternalLink} onClick={() => setViewing(q)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("voir_btn")}</Btn>}
                  {!isSupprime && <Btn variant="danger" icon={Ban} onClick={() => setDeleteTarget(q)} style={{ padding: "5px 10px", fontSize: 12 }} title="Supprimer ce questionnaire (justificatif requis)" />}
                </div>
              </div>
              {isSupprime && (
                <div style={{ fontSize: 12.5, color: C.red, fontWeight: 600, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.red}30` }}>
                  Supprimé{q.supprimePar ? ` par ${q.supprimePar.prenom} ${q.supprimePar.nom}` : ""}{q.dateSuppression ? ` le ${q.dateSuppression}` : ""} — {q.justificationSuppression}
                </div>
              )}
            </div>
          ); })}
        </div>
      </div>
      {deleteTarget && (
        <Modal title="Supprimer ce questionnaire" onClose={() => { setDeleteTarget(null); setDeleteJustification(""); }}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>
            « {deleteTarget.titre} » de {users.find(u => u.id === deleteTarget.eleveId)?.prenom} {users.find(u => u.id === deleteTarget.eleveId)?.nom} restera visible dans l'historique, affiché barré, avec le justificatif ci-dessous. Cette action n'est pas réversible.
          </div>
          <Field label="Justificatif (obligatoire)">
            <textarea autoFocus style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="Expliquez pourquoi ce questionnaire est supprimé..." value={deleteJustification} onChange={e => setDeleteJustification(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteJustification(""); }}>{t("cancel")}</Btn>
            <Btn variant="danger" icon={Ban} onClick={confirmDelete} disabled={!deleteJustification.trim()}>Supprimer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AnalysisView({ questionnaire, eleve, questions, categories, onClose, onValidate, readOnly = false, showConfirmRead = false, readConfirmed = false, onConfirmRead }) {
  const { t } = useLang();
  const qs = questionnaire.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
  const langFor = (i) => (questionnaire.questionLangues && questionnaire.questionLangues[i]) || eleve?.langue || "fr";
  const initialAnswers = questionnaire.reponses || [];
  const [grades, setGrades] = useState(() => qs.map((q, i) => { if (q.type !== "ouverte" && q.type !== "dessin_reseau") return null; const a = initialAnswers[i]; return (a && typeof a.points === "number") ? a.points : null; }));
  // Pour chaque question "légender une image", un tableau (un booléen par
  // repère) initialisé sur la comparaison automatique texte-à-texte —
  // ajustable ensuite au cas par cas via les boutons ✓/✗ (accent oublié,
  // orthographe jugée correcte malgré tout, etc.).
  const [legendeOverrides, setLegendeOverrides] = useState(() => qs.map((q, i) => {
    if (q.type !== "legende") return null;
    const a = initialAnswers[i];
    return marqueursFor(q, langFor(i)).map((m, mi) => normalizeText(a ? a[mi] : "") === normalizeText(m.reponse));
  }));
  const [legendeGrades, setLegendeGrades] = useState(() => qs.map((q, i) => {
    if (q.type !== "legende") return null;
    const saved = questionnaire.manualGrades?.[i];
    if (typeof saved === "number") return saved;
    // Pas encore corrigé : les points partent directement de la
    // comparaison automatique, proportionnellement au nombre de bonnes
    // réponses — ajustés ensuite en direct à chaque clic sur ✓/✗.
    return computeLegendePoints(legendeOverrides[i], q.points);
  }));
  const toggleLegendeMarker = (qi, mi, value) => {
    const arr = [...(legendeOverrides[qi] || [])];
    arr[mi] = value;
    const nextOverrides = [...legendeOverrides]; nextOverrides[qi] = arr;
    setLegendeOverrides(nextOverrides);
    const nextGrades = [...legendeGrades]; nextGrades[qi] = computeLegendePoints(arr, qs[qi].points);
    setLegendeGrades(nextGrades);
  };
  const [remarks, setRemarks] = useState(() => qs.map((q, i) => (questionnaire.remarques && questionnaire.remarques[i]) || ""));
  const [overrides, setOverrides] = useState(() => qs.map((q, i) => questionnaire.overrides?.[i] || null));
  const setOverride = (i, patch) => { const next = [...overrides]; next[i] = patch === null ? null : { ...(next[i] || { points: 0, justification: "" }), ...patch }; setOverrides(next); };

  const matchedIndexes = (q, clicks) => {
    const used = new Set(); const matched = [];
    (q.cibles || []).forEach(cible => {
      let matchIdx = -1;
      clicks.forEach((c, idx) => { if (used.has(idx) || matchIdx !== -1) return; const d = Math.hypot(c.x - cible.x, c.y - cible.y); if (d <= cible.rayon) matchIdx = idx; });
      if (matchIdx >= 0) { used.add(matchIdx); matched.push(matchIdx); }
    });
    return matched;
  };
  const autoEarnedFor = (q, i) => {
    const raw = initialAnswers[i];
    const a = q.type === "point" ? (Array.isArray(raw) ? raw : (raw ? [raw] : [])) : raw;
    if (q.type === "qcm" || q.type === "vrai_faux") return a === q.bonneReponse ? q.points : 0;
    if (q.type === "qcm_multi") return scoreQcmMulti(q, a);
    if (q.type === "point") return scorePoint(q, a);
    if (q.type === "legende") return legendeGrades[i];
    if (q.type === "relier") { const total = (q.paires || []).length || 1; const correctCount = (q.paires || []).filter((p, li) => a && a[li] === p.id).length; return Math.round((q.points * correctCount) / total); }
    if (q.type === "action_reaction") { const result = getResultReached(q.arbre, Array.isArray(a) ? a : []); return result ? Math.round((q.points * result.pourcentage) / 100) : 0; }
    if (q.type === "ordre") return scoreOrdre(q, a);
    if (q.type === "ouverte" || q.type === "dessin_reseau") return grades[i];
    return 0;
  };
  const earnedFor = (q, i) => (overrides[i] ? overrides[i].points : autoEarnedFor(q, i));
  const allGraded = qs.every((q, i) => ((q.type !== "ouverte" && q.type !== "dessin_reseau") || (grades[i] !== null && grades[i] !== undefined)) && (q.type !== "legende" || (legendeGrades[i] !== null && legendeGrades[i] !== undefined)))
    && overrides.every(o => !o || (o.justification && o.justification.trim().length > 0));
  const totalPoints = qs.reduce((s, q) => s + q.points, 0);
  const earnedPoints = qs.reduce((s, q, i) => s + (earnedFor(q, i) || 0), 0);
  const scoreGlobal = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const scoreParCategorie = {};
  const categorieCounts = {};
  categories.forEach(cat => {
    const catQs = qs.map((q, i) => ({ q, i })).filter(o => (o.q.categories || []).includes(cat));
    if (!catQs.length) return;
    const tot = catQs.reduce((s, o) => s + o.q.points, 0);
    const earn = catQs.reduce((s, o) => s + (earnedFor(o.q, o.i) || 0), 0);
    scoreParCategorie[cat] = tot ? Math.round((earn / tot) * 100) : 0;
    const correctCount = catQs.filter(o => (earnedFor(o.q, o.i) || 0) === o.q.points).length;
    categorieCounts[cat] = { correct: correctCount, total: catQs.length };
  });
  const handleValidate = () => {
    const reponsesFinal = qs.map((q, i) => (q.type === "ouverte" || q.type === "dessin_reseau") ? { ...initialAnswers[i], points: grades[i] } : initialAnswers[i]);
    const manualGrades = qs.map((q, i) => q.type === "legende" ? legendeGrades[i] : (questionnaire.manualGrades?.[i] ?? null));
    onValidate(reponsesFinal, scoreParCategorie, scoreGlobal, remarks, manualGrades, overrides, categorieCounts);
  };
  const title = !readOnly ? t("analyse_titre") : showConfirmRead ? t("ma_correction_titre") : t("consultation_titre");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{title} — {questionnaire.titre}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{eleve?.prenom} {eleve?.nom} · {qs.length} {t("question_word")}{qs.length > 1 ? "s" : ""} · {earnedPoints}/{totalPoints} {t("points_short")}s</div>
        </div>
        <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "16px 20px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: C.inkSoft }}>{readOnly ? (questionnaire.correcteur ? t("qn_deja_valide_par", { nom: `${questionnaire.correcteur.prenom} ${questionnaire.correcteur.nom}` }) : t("qn_deja_valide")) : t("qn_en_attente_validation")}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: scoreGlobal >= 60 ? C.green : C.red }}>{scoreGlobal}%</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {qs.map((q, i) => {
          const a = initialAnswers[i];
          const earned = earnedFor(q, i);
          const isManual = q.type === "ouverte" || q.type === "legende" || q.type === "dessin_reseau";
          const correct = !isManual && earned === q.points;
          return (
            <div key={q.id} style={{ background: "#fff", padding: "20px 24px", border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <div style={{ fontSize: 14, flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>{typeof q.numero === "number" && <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: C.navy, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 7, padding: "4px 10px" }}>#{q.numero}</span>}<CategoryBadges allCategories={categories} cats={q.categories} /><TypeBadge type={q.type} /></div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 8 }}>{qText(q, langFor(i))}</div>
                  {mediaFor(q, langFor(i)) && q.type !== "point" && q.type !== "legende" && (
                    <div style={{ marginBottom: 12, maxWidth: 360 }}>
                      {mediaFor(q, langFor(i)).type === "image" && <img src={mediaFor(q, langFor(i)).url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />}
                      {mediaFor(q, langFor(i)).type === "video" && <video src={mediaFor(q, langFor(i)).url} controls style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />}
                      {mediaFor(q, langFor(i)).type === "audio" && <audio src={mediaFor(q, langFor(i)).url} controls style={{ width: "100%" }} />}
                    </div>
                  )}
                  {(q.type === "qcm" || q.type === "vrai_faux") && (
                    <div style={{ marginTop: 6, fontSize: 13.5, color: correct ? C.green : C.red }}>{t("reponse_eleve")}{a !== undefined && a !== null ? qChoix(q, langFor(i))[a] : t("sans_reponse")}</div>
                  )}
                  {q.type === "qcm_multi" && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      {qChoix(q, langFor(i)).map((c, ci) => {
                        const selected = Array.isArray(a) && a.includes(ci);
                        const shouldBeSelected = (q.bonnesReponses || []).includes(ci);
                        if (!selected && !shouldBeSelected) return null;
                        const ok = selected === shouldBeSelected;
                        return <div key={ci} style={{ fontSize: 12.5, color: ok ? C.green : C.red }}>{selected ? "☑" : "☐"} {c} {shouldBeSelected && !selected ? t("attendu_parens") : ""}</div>;
                      })}
                      {!(Array.isArray(a) && a.length) && <div style={{ fontSize: 13, color: C.red }}>{t("sans_reponse")}</div>}
                    </div>
                  )}
                  {!isManual && !correct && q.type !== "point" && q.type !== "relier" && q.type !== "qcm_multi" && q.type !== "action_reaction" && q.type !== "ordre" && <div style={{ fontSize: 13, color: C.inkSoft }}>{t("bonne_reponse_colon")}{qChoix(q, langFor(i))[q.bonneReponse]}</div>}
                  {q.type === "legende" && mediaFor(q, langFor(i)) && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ position: "relative", display: "inline-block", maxWidth: 340, marginBottom: 10 }}>
                        <img src={mediaFor(q, langFor(i)).url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />
                        {marqueursFor(q, langFor(i)).map((m, mi) => <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, width: 22, height: 22, borderRadius: "50%", background: C.gold, border: "2px solid #fff", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.navy, fontFamily: FONT_MONO }}>{mi + 1}</div>)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                        {marqueursFor(q, langFor(i)).map((m, mi) => {
                          const given = a ? a[mi] : "";
                          const ok = (legendeOverrides[i] || [])[mi];
                          return (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "5px 8px", background: ok ? C.greenSoft : C.redSoft, borderRadius: 6 }}>
                              <strong>{mi + 1}.</strong> {given && given.trim() ? given : <em>{t("sans_reponse_italic")}</em>} {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_deux_points", { v: m.reponse })}</span>}
                              <span style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
                                <button type="button" disabled={readOnly} onClick={() => toggleLegendeMarker(i, mi, true)}
                                  style={{ background: ok ? C.green : "#fff", color: ok ? "#fff" : C.green, border: `1px solid ${C.green}`, borderRadius: 5, width: 24, height: 24, cursor: readOnly ? "default" : "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</button>
                                <button type="button" disabled={readOnly} onClick={() => toggleLegendeMarker(i, mi, false)}
                                  style={{ background: !ok ? C.red : "#fff", color: !ok ? "#fff" : C.red, border: `1px solid ${C.red}`, borderRadius: 5, width: 24, height: 24, cursor: readOnly ? "default" : "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✗</button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6, fontStyle: "italic" }}>{t("legende_correction_aide")}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("points_attribues")}</span>
                        <strong style={{ fontSize: 13, color: C.navy }}>{legendeGrades[i] ?? 0}</strong>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>/ {q.points}</span>
                      </div>
                    </div>
                  )}
                  {q.type === "point" && mediaFor(q, langFor(i)) && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ position: "relative", display: "inline-block", maxWidth: 340 }}>
                        <img src={mediaFor(q, langFor(i)).url} style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.line}`, display: "block" }} />
                        {ciblesFor(q, langFor(i)).map((c, ci) => <div key={ci} style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.rayon * 2}%`, paddingBottom: `${c.rayon * 2}%`, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `2px solid ${C.green}`, background: "rgba(62,142,87,0.15)" }} />)}
                        {(Array.isArray(a) ? a : (a ? [a] : [])).map((pt, pi) => <div key={pi} style={{ position: "absolute", left: `${pt.x}%`, top: `${pt.y}%`, width: 12, height: 12, borderRadius: "50%", background: C.red, border: "2px solid #fff", transform: "translate(-50%,-50%)" }} />)}
                      </div>
                      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{t("zones_vertes_cibles")}</div>
                    </div>
                  )}
                  {q.type === "relier" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(q.paires || []).map((p, li) => {
                        const chosenId = a ? a[li] : null;
                        const chosen = (q.paires || []).find(pp => pp.id === chosenId);
                        const ok = chosenId === p.id;
                        return (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 10px", background: ok ? C.greenSoft : C.redSoft, borderRadius: 6 }}>
                            {ok ? <CheckCircle2 size={13} color={C.green} /> : <XCircle size={13} color={C.red} />}
                            <span style={{ fontWeight: 600 }}>{paireText(p, "gauche", langFor(i))}</span> → <span>{chosen ? paireText(chosen, "droite", langFor(i)) : t("sans_reponse")}</span>
                            {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_deux_points", { v: paireText(p, "droite", langFor(i)) })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "action_reaction" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {walkTrail(q.arbre, Array.isArray(a) ? a : []).map(node => (
                        <div key={node.id} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, background: node.type === "resultat" ? (node.pourcentage === 100 ? C.greenSoft : node.pourcentage === 0 ? C.redSoft : C.goldSoft) : C.bg }}>
                          <strong style={{ textTransform: "uppercase", fontSize: 10.5, letterSpacing: ".03em", color: AR_COLOR[node.type] }}>{AR_LABEL[node.type]}</strong> — {arNodeText(node, langFor(i))}{node.type === "resultat" && ` (${node.pourcentage}%)`}
                        </div>
                      ))}
                      {!getResultReached(q.arbre, Array.isArray(a) ? a : []) && <div style={{ fontSize: 12.5, color: C.red }}>{t("parcours_inacheve")}</div>}
                    </div>
                  )}
                  {q.type === "ordre" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(Array.isArray(a) ? a : []).map((itemId, posIdx) => {
                        const item = (q.items || []).find(it => it.id === itemId);
                        const ok = (q.items || [])[posIdx]?.id === itemId;
                        return (
                          <div key={itemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, fontSize: 12.5, background: ok ? C.greenSoft : C.redSoft }}>
                            {ok ? <CheckCircle2 size={12} color={C.green} /> : <XCircle size={12} color={C.red} />}
                            <strong>{posIdx + 1}.</strong> {itemText(item, langFor(i))}
                            {!ok && <span style={{ color: C.inkSoft }}>{t("attendu_place", { v: itemText((q.items || [])[posIdx], langFor(i)) })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === "ouverte" && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, marginBottom: 8 }}>{a?.text?.trim() ? a.text : <em>{t("sans_reponse_italic")}</em>}</div>
                      {q.reponseAttendue && <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic", marginBottom: 8 }}>{t("ouverte_attendu")}{q.reponseAttendue}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("points_attribues")}</span>
                        <input type="number" min={0} max={q.points} disabled={readOnly} style={{ ...inputStyle, width: 70, padding: "6px 8px" }} value={grades[i] ?? ""} onChange={e => { const v = e.target.value === "" ? null : Math.max(0, Math.min(q.points, Number(e.target.value))); const g = [...grades]; g[i] = v; setGrades(g); }} />
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>/ {q.points}</span>
                      </div>
                    </div>
                  )}
                  {q.type === "dessin_reseau" && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ marginBottom: 8, maxWidth: 480 }}>
                        <ReseauDrawing value={a || { carres: [], traits: [] }} readOnly />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{t("points_attribues")}</span>
                        <input type="number" min={0} max={q.points} disabled={readOnly} style={{ ...inputStyle, width: 70, padding: "6px 8px" }} value={grades[i] ?? ""} onChange={e => { const v = e.target.value === "" ? null : Math.max(0, Math.min(q.points, Number(e.target.value))); const g = [...grades]; g[i] = v; setGrades(g); }} />
                        <span style={{ fontSize: 12.5, color: C.inkSoft }}>/ {q.points}</span>
                      </div>
                    </div>
                  )}
                  {q.reference && (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6, background: C.goldSoft, borderRadius: 8, padding: "8px 10px" }}>
                      <Tag size={13} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12.5, color: C.ink }}><strong>{t("reference_colon")}</strong>{q.reference}</span>
                    </div>
                  )}
                  {!isManual && (
                    !readOnly ? (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.inkSoft, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!overrides[i]} onChange={e => setOverride(i, e.target.checked ? { points: earned, justification: "" } : null)} />
                          {t("modifier_note_auto")}
                        </label>
                        {overrides[i] && (
                          <div style={{ marginTop: 8, padding: "10px 12px", background: C.goldSoft, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: C.inkSoft }}>{t("nouvelle_note")}</span>
                              <input type="number" min={0} max={q.points} value={overrides[i].points} onChange={e => setOverride(i, { points: Math.max(0, Math.min(q.points, Number(e.target.value))) })} style={{ ...inputStyle, width: 64, padding: "5px 8px" }} />
                              <span style={{ fontSize: 12, color: C.inkSoft }}>/ {q.points} {t("note_auto_parens", { v: autoEarnedFor(q, i) })}</span>
                            </div>
                            <textarea placeholder={t("justification_placeholder")} value={overrides[i].justification} onChange={e => setOverride(i, { justification: e.target.value })} style={{ ...inputStyle, minHeight: 44, fontSize: 12.5, resize: "vertical" }} />
                            {!overrides[i].justification.trim() && <div style={{ fontSize: 11, color: C.red }}>{t("justification_requise")}</div>}
                          </div>
                        )}
                      </div>
                    ) : overrides[i] && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: C.goldSoft, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 4 }}>{t("note_modifiee_manuellement", { points: overrides[i].points, total: q.points })}</div>
                        <div style={{ fontSize: 12.5, color: C.ink }}>{overrides[i].justification}</div>
                      </div>
                    )
                  )}
                  {!readOnly ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}><MessageSquare size={12} color={C.inkSoft} /><span style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".02em" }}>{t("remarque_label")}</span></div>
                      <textarea style={{ ...inputStyle, minHeight: 44, fontSize: 12.5, resize: "vertical" }} placeholder={t("remarque_placeholder")} value={remarks[i]} onChange={e => { const r = [...remarks]; r[i] = e.target.value; setRemarks(r); }} />
                    </div>
                  ) : (remarks[i] && remarks[i].trim() ? (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6, background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <MessageSquare size={13} color={C.inkSoft} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12.5, color: C.ink }}>{remarks[i]}</span>
                    </div>
                  ) : null)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {!isManual && (correct ? <CheckCircle2 size={20} color={C.green} /> : <XCircle size={20} color={C.red} />)}
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft }}>{earned ?? 0}/{q.points} {t("pt_short")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {readOnly && showConfirmRead ? (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20 }}>
          {readConfirmed ? (
            <>
              <Badge color={C.green} bg={C.greenSoft}><BookCheck size={11} /> {t("correction_lue")}</Badge>
              <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={onClose}>{t("fermer_sans_confirmer")}</Btn>
              <Btn variant="gold" icon={BookCheck} onClick={() => { onConfirmRead(); onClose(); }}>{t("pris_connaissance_correction")}</Btn>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>{t("close")}</Btn>
          {!readOnly && <Btn variant="primary" icon={BadgeCheck} disabled={!allGraded} onClick={handleValidate}>{t("valider_questionnaire")}</Btn>}
        </div>
      )}
    </div>
  );
}
