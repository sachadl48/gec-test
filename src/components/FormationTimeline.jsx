import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { fonctionLabel } from "../data/fonctions.js";
import { computeFormationTimelineRows, computeBarPosition, formationTimelineWindow } from "../utils/formationTimeline.js";

// Ligne du temps des formations en cours et à venir (Aperçu admin) — de
// maintenant à +4 mois. Une ligne par élève actuellement en formation ;
// une formation déjà commencée part directement du bord gauche (point en
// anneau, pas de date affichée) ; une formation qui dépasse la fenêtre
// visible continue en pointillés, mais toujours contenus dans la piste
// (jamais au-delà du cadre). Un élève sans date de formation renseignée
// dans son carnet affiche un simple avertissement à la place d'une barre,
// plutôt que de disparaître silencieusement de la vue.
// Couleur fixe selon le rôle (pas une palette qui tourne) : vert pour
// régulateur, bleu pour dispatcheur — décidé avec Sacha après une
// itération sur une maquette dans un artefact.
function formatDateCourt(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function colorFor(fonction) {
  return fonction === "Élève dispatcheur" ? C.blue : C.green;
}

export function FormationTimeline({ users }) {
  const { t, lang } = useLang();
  const rows = computeFormationTimelineRows(users);
  if (rows.length === 0) return null;

  const { start: today, end: windowEnd } = formationTimelineWindow();

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px 24px 18px", marginBottom: 24, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map(row => {
          const pos = computeBarPosition(row.dateDebut, row.dateFin, today, windowEnd);
          const color = colorFor(row.fonction);
          const nomAffiche = `${row.prenom} ${(row.nom || "")[0] || ""}.`;
          const tooltip = pos ? `${fonctionLabel(row.fonction, lang)}\n${t("formation_fin_label")} ${formatDateCourt(row.dateFin)}` : t("formation_sans_date_tooltip");
          // La partie pleine s'arrête un peu avant la fin quand la
          // formation dépasse la fenêtre, pour laisser la place à un
          // segment en pointillés qui reste, lui aussi, dans les limites
          // de la piste (jamais au-delà de 100%).
          const dashStart = pos && pos.endsAfterWindow ? Math.max(pos.startPct, pos.endPct - 6) : pos?.endPct;
          return (
            <div key={row.id} style={{ position: "relative", height: 30 }}>
              {pos ? (
                <>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 19, height: 3, borderRadius: 2, background: C.line }} />
                  <div title={tooltip} style={{ position: "absolute", left: `${pos.startPct}%`, top: 0, fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", cursor: "default", display: "flex", alignItems: "baseline", gap: 5 }}>
                    {!pos.startsBeforeToday && <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, color }}>{formatDateCourt(row.dateDebut)}</span>}
                    <span>{nomAffiche}</span>
                  </div>
                  <div style={{ position: "absolute", left: `${pos.startPct}%`, width: `${Math.max(0, dashStart - pos.startPct)}%`, top: 17, height: 7, borderRadius: 4, background: color }} />
                  {pos.endsAfterWindow && (
                    <div style={{ position: "absolute", left: `${dashStart}%`, width: `${Math.max(0, pos.endPct - dashStart)}%`, top: 20, height: 0, borderTop: `3px dashed ${color}` }} />
                  )}
                  <div style={{ position: "absolute", left: `${pos.startPct}%`, top: 15.5, width: 10, height: 10, borderRadius: "50%", background: pos.startsBeforeToday ? "#fff" : color, border: `2px solid ${color}`, transform: "translateX(-5px)" }} />
                </>
              ) : (
                <div title={t("formation_sans_date_tooltip")} style={{ position: "absolute", left: 0, top: 10, display: "flex", alignItems: "center", gap: 7, cursor: "default" }}>
                  <span style={{ color: C.red, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>!</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{nomAffiche}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", marginTop: 16 }}>
        <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{t("formation_plus_4_mois")}</div>
        <div style={{ position: "relative", height: 2, background: C.navy }}>
          <div style={{ position: "absolute", left: 0, top: -6, width: 6, height: 14, background: C.navy }} />
        </div>
      </div>
    </div>
  );
}
