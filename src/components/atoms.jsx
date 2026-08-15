import { useState } from "react";
import {
  X, AlertTriangle, CheckCircle2, LogOut, Loader2, Trash2, Upload, Music, Video,
} from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { TYPE_META, typeLabel } from "../data/questionTypes.js";
import { catColor } from "../utils/categoryColor.js";

// Petits composants réutilisables dans toute l'application (boutons,
// badges, fenêtres modales, états vides...).
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function Btn({ children, onClick, variant = "ghost", icon: Icon, style, disabled }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", border: "1px solid transparent", transition: "all .15s", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary: { background: C.navy, color: "#fff" }, gold: { background: C.gold, color: C.navy },
    ghost: { background: "transparent", color: C.navy, border: `1px solid ${C.line}` },
    danger: { background: C.redSoft, color: C.red }, subtle: { background: C.bg, color: C.inkSoft },
    success: { background: C.greenSoft, color: C.green },
  };
  return <button type="button" onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{Icon && <Icon size={15} />}{children}</button>;
}
export function Field({ label, children, hint }) {
  return (
    <div style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.inkSoft, marginBottom: 6, letterSpacing: ".02em", textTransform: "uppercase" }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11.5, color: C.inkSoft, marginTop: 5 }}>{hint}</span>}
    </div>
  );
}
export const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 14, color: C.ink, background: "#fff", outline: "none" };
export function Badge({ children, color, bg }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: ".03em", padding: "3px 9px", borderRadius: 5, color, background: bg }}>{children}</span>; }
export function StatusBadge({ statut }) {
  const { t } = useLang();
  const map = { "validé": { color: C.green, bg: C.greenSoft, label: t("status_validated") }, "en attente de validation": { color: C.gold, bg: C.goldSoft, label: t("status_pending") }, "en cours": { color: C.inkSoft, bg: C.bg, label: t("status_progress") } };
  const s = map[statut] || map["en cours"];
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}
export function CategoryBadges({ allCategories, cats }) {
  return <>{(cats || []).map(c => <Badge key={c} color={catColor(allCategories, c)} bg={C.bg}>{c}</Badge>)}</>;
}
export function TypeBadge({ type }) {
  const { lang } = useLang();
  const meta = TYPE_META[type]; if (!meta) return null; const Icon = meta.icon;
  return <Badge color={C.inkSoft} bg={C.bg}><Icon size={11} />{typeLabel(type, lang)}</Badge>;
}
export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", zIndex: 50, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 14, width, maxWidth: "100%", maxHeight: "85%", overflowY: "auto", boxShadow: "0 20px 60px rgba(22,35,63,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: C.navy }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
export function EmptyState({ icon: Icon, title, body }) {
  return <div style={{ textAlign: "center", padding: "48px 20px", color: C.inkSoft }}><Icon size={26} style={{ marginBottom: 10, opacity: 0.5 }} /><p style={{ margin: 0, fontWeight: 600, color: C.ink, fontSize: 14 }}>{title}</p><p style={{ margin: "4px 0 0", fontSize: 13 }}>{body}</p></div>;
}
export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Supprimer", tone = "danger" }) {
  const toneColor = tone === "success" ? C.green : C.red;
  const toneBg = tone === "success" ? C.greenSoft : C.redSoft;
  const ToneIcon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 360, boxShadow: "0 20px 60px rgba(22,35,63,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: toneBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ToneIcon size={16} color={toneColor} /></div>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: C.navy }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
          <Btn variant={tone === "success" ? "success" : "danger"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}
export function InfoDialog({ title, message, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,63,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 380, boxShadow: "0 20px 60px rgba(22,35,63,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AlertTriangle size={16} color={C.gold} /></div>
          <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, color: C.navy }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 20px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn variant="primary" onClick={onClose}>Compris</Btn>
        </div>
      </div>
    </div>
  );
}
export function SectionTitle({ children }) { return <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 15.5, fontWeight: 600, color: C.navy }}>{children}</h3>; }
export function Header({ user, onLogout }) {
  const { t } = useLang();
  return (
    <div style={{ background: C.navy, color: "#fff", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1.4px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold }} /></div>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: ".04em" }}>G.E.C.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#C7CEE0" }}>{user.prenom} {user.nom}</span>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, padding: "7px 12px", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><LogOut size={13} /> {t("logout")}</button>
      </div>
    </div>
  );
}
export function LoadingScreen({ label }) {
  return <div style={{ minHeight: 640, background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 16 }}><Loader2 size={24} color={C.gold} style={{ animation: "visee-spin 1s linear infinite" }} /><div style={{ color: "#C7CEE0", fontSize: 13, marginTop: 12, fontFamily: FONT_BODY }}>{label}</div></div>;
}
export function SaveErrorBanner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, marginBottom: 14 }}>
      <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>Échec de l'enregistrement. <span style={{ fontWeight: 400, fontFamily: FONT_MONO, fontSize: 11.5 }}>({visible})</span></span>
    </div>
  );
}
export function MediaField({ media, onChange, imageOnly = false }) {
  const [error, setError] = useState("");
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) { setError("Fichier trop volumineux (max 8 Mo)."); e.target.value = ""; return; }
    const kind = file.type.startsWith("audio") ? "audio" : file.type.startsWith("video") ? "video" : "image";
    const reader = new FileReader();
    reader.onload = () => onChange({ type: kind, url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };
  if (media) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {media.type === "image"
          ? <img src={media.url} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.line}` }} />
          : <div style={{ width: 52, height: 52, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{media.type === "audio" ? <Music size={18} color={C.inkSoft} /> : <Video size={18} color={C.inkSoft} />}</div>}
        <span style={{ fontSize: 12.5, color: C.inkSoft, flex: 1 }}>{media.name}</span>
        <Btn variant="danger" icon={Trash2} onClick={() => onChange(null)} style={{ padding: "6px 10px" }} />
      </div>
    );
  }
  return (
    <div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", border: `1px dashed ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.inkSoft }}>
        <Upload size={15} /> {imageOnly ? "Ajouter une image" : "Ajouter une image, un audio ou une vidéo"}
        <input type="file" accept={imageOnly ? "image/*" : "image/*,audio/*,video/*"} style={{ display: "none" }} onChange={handleFile} />
      </label>
      {error && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
