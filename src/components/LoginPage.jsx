import { useState } from "react";
import { UserCircle2, Lock } from "lucide-react";
import { C, FONT_BODY, FONT_DISPLAY } from "../theme.js";
import { useLang } from "../lang.jsx";
import { Field, inputStyle, Btn } from "./atoms.jsx";

// Écran de connexion.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function LoginPage({ onLogin }) {
  const { t } = useLang();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const attemptLogin = async () => {
    if (!pseudo.trim() || !password || busy) return;
    setBusy(true); setError("");
    const result = await onLogin(pseudo, password);
    setBusy(false);
    if (result?.error) setError(result.error);
  };
  const onKeyDown = (e) => { if (e.key === "Enter") attemptLogin(); };

  return (
    <div style={{ minHeight: 640, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", borderRadius: 16, fontFamily: FONT_BODY }}>
      <svg width="520" height="520" viewBox="0 0 520 520" style={{ position: "absolute", right: -140, top: -80, opacity: 0.18 }}>
        {[240, 190, 140, 90, 40].map((r, i) => <circle key={r} cx="260" cy="260" r={r} fill="none" stroke={i % 2 === 0 ? C.gold : "#4C5C82"} strokeWidth="1.4" />)}
        <circle cx="260" cy="260" r="6" fill={C.gold} />
      </svg>
      <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: "absolute", left: -110, bottom: -110, opacity: 0.12 }}>
        {[160, 120, 80, 40].map((r) => <circle key={r} cx="180" cy="180" r={r} fill="none" stroke="#4C5C82" strokeWidth="1.2" />)}
      </svg>
      <div style={{ position: "relative", width: 380, maxWidth: "90%" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} /></div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: ".04em" }}>G.E.C.</div>
          <div style={{ fontSize: 12.5, color: "#9AA6C0", marginTop: 4, letterSpacing: ".03em" }}>{t("login_subtitle")}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <Field label={t("login_id")}>
            <div style={{ position: "relative" }}><UserCircle2 size={16} style={{ position: "absolute", left: 12, top: 12, color: C.inkSoft }} /><input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="ex. rousseauc" value={pseudo} onChange={e => setPseudo(e.target.value)} onKeyDown={onKeyDown} /></div>
          </Field>
          <Field label={t("login_pwd")}>
            <div style={{ position: "relative" }}><Lock size={16} style={{ position: "absolute", left: 12, top: 12, color: C.inkSoft }} /><input type="password" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} /></div>
          </Field>
          {error && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 12, fontWeight: 600 }}>{error}</div>}
          <Btn variant="primary" onClick={attemptLogin} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 16px" }}>{busy ? "Connexion..." : t("login_btn")}</Btn>
        </div>
      </div>
    </div>
  );
}
