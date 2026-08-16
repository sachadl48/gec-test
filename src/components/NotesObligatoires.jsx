import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, FileDown, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { logActivity } from "../utils/activityLog.js";
import { Btn, Field, inputStyle, Modal, SectionTitle, EmptyState, ConfirmDialog } from "./atoms.jsx";

// Page "Notes obligatoires" (sous-section de Formations) : gestion des
// documents PDF (FR/NL) que les élèves doivent lire en début de filière,
// chacun associé à un questionnaire de vérification de compréhension
// (questions piochées dans la banque existante par leur numéro).
//
// Le PDF est stocké dans le bucket privé "notes-pdf" de Supabase Storage
// (jamais en base64 en base de données — les PDF peuvent être volumineux,
// et il y en a deux par note). L'affichage se fait via une URL signée à
// durée limitée, régénérée à chaque consultation.

const FILIERES = ["Élève régulateur", "Élève dispatcheur"];

async function getSignedUrl(path) {
  const { data, error } = await supabase.storage.from("notes-pdf").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function NotesObligatoires({ questions, currentUser }) {
  const { t, lang } = useLang();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | {} (nouvelle) | note (édition)
  const [modalFiliere, setModalFiliere] = useState(null); // filière pré-sélectionnée pour une nouvelle note
  const [previewing, setPreviewing] = useState(null); // { note, langue }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.from("notes_obligatoires").select("*").order("ordre", { ascending: true });
    if (err) setError(err.message);
    else setNotes(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    setError("");
    try {
      let pdfFrPath = form.pdfFrPath;
      let pdfNlPath = form.pdfNlPath;
      const baseId = form.id || crypto.randomUUID();

      if (form.pdfFrFile) {
        pdfFrPath = `${baseId}/fr-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("notes-pdf").upload(pdfFrPath, form.pdfFrFile, { upsert: true });
        if (upErr) throw upErr;
      }
      if (form.pdfNlFile) {
        pdfNlPath = `${baseId}/nl-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("notes-pdf").upload(pdfNlPath, form.pdfNlFile, { upsert: true });
        if (upErr) throw upErr;
      }
      if (!pdfFrPath || !pdfNlPath) throw new Error(t("notes_pdf_manquant_erreur"));

      const row = {
        filiere: form.filiere,
        titre: form.titre,
        pdf_fr_path: pdfFrPath,
        pdf_nl_path: pdfNlPath,
        question_ids: form.questionIds,
        notification_texte_fr: form.filiere === "Élève dispatcheur" ? (form.notifTexteFr || null) : null,
        notification_texte_nl: form.filiere === "Élève dispatcheur" ? (form.notifTexteNl || null) : null,
      };

      if (form.id) {
        const { error: err } = await supabase.from("notes_obligatoires").update(row).eq("id", form.id);
        if (err) throw err;
        logActivity("Note obligatoire", [{ action: "modification", description: form.titre }], auteurLog);
      } else {
        const { error: err } = await supabase.from("notes_obligatoires").insert({ id: baseId, ...row, ordre: notes.length });
        if (err) throw err;
        logActivity("Note obligatoire", [{ action: "creation", description: form.titre }], auteurLog);
      }
      setModal(null);
      await load();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
  };

  const remove = async (note) => {
    setError("");
    try {
      await supabase.storage.from("notes-pdf").remove([note.pdf_fr_path, note.pdf_nl_path]);
      const { error: err } = await supabase.from("notes_obligatoires").delete().eq("id", note.id);
      if (err) throw err;
      logActivity("Note obligatoire", [{ action: "suppression", description: note.titre }], auteurLog);
      await load();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmDelete(null);
  };

  const openPreview = async (note, langue) => {
    setError("");
    try {
      const url = await getSignedUrl(langue === "nl" ? note.pdf_nl_path : note.pdf_fr_path);
      setPreviewing({ note, url });
    } catch (e) { setError(e?.message || "Erreur lors de l'ouverture du PDF."); }
  };

  const renderSection = (filiere) => {
    const liste = notes.filter(n => n.filiere === filiere);
    return (
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>{filiere}</SectionTitle>
        <div style={{ height: 8 }} />
        {liste.length === 0 ? (
          <EmptyState icon={FileDown} title={t("aucune_note_titre")} body={t("aucune_note_body")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {liste.map(note => (
              <div key={note.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{note.titre}</span>
                <span style={{ fontSize: 11.5, color: C.inkSoft, fontFamily: FONT_MONO }}>{(note.question_ids || []).length} {t("questions_suffixe")}</span>
                <Btn variant="subtle" icon={Eye} onClick={() => openPreview(note, lang)} style={{ padding: "6px 8px" }} />
                <Btn variant="subtle" icon={Edit2} onClick={() => setModal(note)} style={{ padding: "6px 8px" }} />
                <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDelete(note)} style={{ padding: "6px 8px" }} />
              </div>
            ))}
          </div>
        )}
        <Btn variant="ghost" icon={Plus} onClick={() => { setModalFiliere(filiere); setModal({}); }}>{t("ajouter_note_btn")}</Btn>
      </div>
    );
  };

  return (
    <div>
      <SectionTitle>{t("notes_obligatoires_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 20 }}>{t("notes_obligatoires_sub")}</div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}

      {loading ? <div style={{ color: C.inkSoft, fontSize: 13 }}>{t("chargement")}…</div> : (
        <>
          {renderSection("Élève régulateur")}
          {renderSection("Élève dispatcheur")}
        </>
      )}

      {modal && (
        <NoteModal
          initial={modal}
          filiereDefault={modal.filiere || modalFiliere}
          questions={questions}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}

      {previewing && (
        <Modal title={previewing.note.titre} onClose={() => setPreviewing(null)} width={760}>
          <iframe src={`${previewing.url}#toolbar=0`} style={{ width: "100%", height: "70vh", border: `1px solid ${C.line}`, borderRadius: 8 }} title={previewing.note.titre} />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog tone="danger" title={t("supprimer_note_title")} message={t("supprimer_note_msg", { titre: confirmDelete.titre })}
          confirmLabel={t("delete")} onConfirm={() => remove(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}

function NoteModal({ initial, filiereDefault, questions, onClose, onSave }) {
  const { t } = useLang();
  const [titre, setTitre] = useState(initial.titre || "");
  const [filiere, setFiliere] = useState(filiereDefault || FILIERES[0]);
  const [pdfFrFile, setPdfFrFile] = useState(null);
  const [pdfNlFile, setPdfNlFile] = useState(null);
  const [numerosText, setNumerosText] = useState((initial.question_ids || []).map(id => questions.find(q => q.id === id)?.numero).filter(n => n != null).join(", "));
  const [notifTexteFr, setNotifTexteFr] = useState(initial.notification_texte_fr || "");
  const [notifTexteNl, setNotifTexteNl] = useState(initial.notification_texte_nl || "");
  const [saving, setSaving] = useState(false);

  // Résolution des numéros saisis (séparés par virgule/espace) vers de
  // vrais identifiants de questions, avec repérage des numéros introuvables
  // pour prévenir d'une faute de frappe avant l'enregistrement.
  const numeros = numerosText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean).map(Number);
  const resolved = numeros.map(n => ({ numero: n, question: questions.find(q => q.numero === n) }));
  const notFound = resolved.filter(r => !r.question).map(r => r.numero);
  const questionIds = resolved.filter(r => r.question).map(r => r.question.id);

  const canSave = titre.trim() && filiere && questionIds.length > 0 && notFound.length === 0
    && (initial.id ? true : (pdfFrFile && pdfNlFile));

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      id: initial.id, titre: titre.trim(), filiere, pdfFrFile, pdfNlFile,
      pdfFrPath: initial.pdf_fr_path, pdfNlPath: initial.pdf_nl_path,
      questionIds, notifTexteFr, notifTexteNl,
    });
    setSaving(false);
  };

  return (
    <Modal title={initial.id ? t("modifier_note") : t("ajouter_note_btn")} onClose={onClose} width={560}>
      <Field label={t("titre_note_label")}><input style={inputStyle} value={titre} onChange={e => setTitre(e.target.value)} /></Field>

      <Field label={t("filiere_label")}>
        <select style={inputStyle} value={filiere} onChange={e => setFiliere(e.target.value)}>
          {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      <Field label={t("pdf_fr_label")} hint={initial.id ? t("pdf_remplacer_hint") : undefined}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px dashed ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.inkSoft }}>
          <FileDown size={15} /> {pdfFrFile ? pdfFrFile.name : (initial.pdf_fr_path ? t("pdf_deja_present") : t("choisir_fichier"))}
          <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => setPdfFrFile(e.target.files[0] || null)} />
        </label>
      </Field>

      <Field label={t("pdf_nl_label")} hint={initial.id ? t("pdf_remplacer_hint") : undefined}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px dashed ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.inkSoft }}>
          <FileDown size={15} /> {pdfNlFile ? pdfNlFile.name : (initial.pdf_nl_path ? t("pdf_deja_present") : t("choisir_fichier"))}
          <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => setPdfNlFile(e.target.files[0] || null)} />
        </label>
      </Field>

      <Field label={t("numeros_questions_label")} hint={t("numeros_questions_hint")}>
        <input style={inputStyle} value={numerosText} onChange={e => setNumerosText(e.target.value)} placeholder="12, 45, 103" />
        {notFound.length > 0 && (
          <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{t("numeros_introuvables", { numeros: notFound.join(", ") })}</div>
        )}
        {questionIds.length > 0 && notFound.length === 0 && (
          <div style={{ color: C.green, fontSize: 12, marginTop: 6 }}>{t("numeros_questions_ok", { n: questionIds.length })}</div>
        )}
      </Field>

      {filiere === "Élève dispatcheur" && (
        <>
          <div style={{ fontSize: 12.5, color: C.inkSoft, background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            {t("notif_dispatcheur_explication")}
          </div>
          <Field label={t("notif_texte_fr_label")}>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={notifTexteFr} onChange={e => setNotifTexteFr(e.target.value)} />
          </Field>
          <Field label={t("notif_texte_nl_label")}>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={notifTexteNl} onChange={e => setNotifTexteNl(e.target.value)} />
          </Field>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={!canSave || saving}>{saving ? t("enregistrement_en_cours") : t("save")}</Btn>
      </div>
    </Modal>
  );
}
