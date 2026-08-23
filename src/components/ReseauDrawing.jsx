import { useState, useRef } from "react";
import { Square, Slash, Trash2 } from "lucide-react";
import { C, FONT_MONO, FONT_BODY } from "../theme.js";
import { useLang } from "../lang.jsx";
import { Btn, inputStyle } from "./atoms.jsx";
import { genId } from "../utils/id.js";

// Zone de dessin libre pour l'exercice "Dessine le réseau" : l'élève pose
// des stations (carré + numéro tapé) et trace des traits (voies,
// aiguillages) à main levée. Pas de correction automatique possible pour
// un dessin libre (voir la conversation avec Sacha) — cet outil ne fait
// que capturer le dessin, la notation reste manuelle, exactement comme
// pour une question ouverte.
//
// value : { carres: [{ id, x, y, label, nom }], traits: [{ id, x1, y1, x2, y2 }] }
// En lecture seule (readOnly), aucune interaction : juste l'affichage du
// dessin final soumis par l'élève, pour que le moniteur le consulte.

const VIEWBOX_W = 900;
const VIEWBOX_H = 420;
const CARRE_TAILLE = 44;

function svgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}
function eventXY(e) {
  const point = e.changedTouches ? e.changedTouches[0] : e;
  return { clientX: point.clientX, clientY: point.clientY };
}

export function ReseauDrawing({ value, onChange, readOnly }) {
  const { t } = useLang();
  const svgRef = useRef(null);
  const [mode, setMode] = useState("select"); // "select" | "add-carre" | "add-trait"
  const [selected, setSelected] = useState(null); // { type: "carre"|"trait", id }
  const [dragging, setDragging] = useState(null); // { id } — carré en cours de déplacement
  const [drawingTrait, setDrawingTrait] = useState(null); // { x1, y1, x2, y2 } — trait en cours de tracé

  const carres = value?.carres || [];
  const traits = value?.traits || [];

  const update = (patch) => onChange({ carres, traits, ...patch });

  const handleSvgClick = (e) => {
    if (readOnly) return;
    if (mode === "add-carre") {
      const svg = svgRef.current;
      const { clientX, clientY } = eventXY(e);
      const { x, y } = svgPoint(svg, clientX, clientY);
      const id = genId("cr");
      update({ carres: [...carres, { id, x: x - CARRE_TAILLE / 2, y: y - CARRE_TAILLE / 2, label: "", nom: "" }] });
      setSelected({ type: "carre", id });
      // Volontairement pas de retour à "select" ici : l'élève peut ainsi
      // poser plusieurs stations d'affilée sans recliquer sur le bouton
      // "Ajouter une station" à chaque fois.
      return;
    }
    // Clic dans le vide en mode sélection : désélectionne.
    if (e.target === svgRef.current) setSelected(null);
  };

  const handleSvgMouseDown = (e) => {
    if (readOnly || mode !== "add-trait") return;
    const svg = svgRef.current;
    const { clientX, clientY } = eventXY(e);
    const { x, y } = svgPoint(svg, clientX, clientY);
    setDrawingTrait({ x1: x, y1: y, x2: x, y2: y });
  };
  const handleSvgMouseMove = (e) => {
    if (readOnly) return;
    const svg = svgRef.current;
    const { clientX, clientY } = eventXY(e);
    const { x, y } = svgPoint(svg, clientX, clientY);
    if (drawingTrait) { setDrawingTrait({ ...drawingTrait, x2: x, y2: y }); return; }
    if (dragging) {
      update({ carres: carres.map(c => c.id === dragging.id ? { ...c, x: x - CARRE_TAILLE / 2, y: y - CARRE_TAILLE / 2 } : c) });
    }
  };
  const handleSvgMouseUp = () => {
    if (readOnly) return;
    if (drawingTrait) {
      const dist = Math.hypot(drawingTrait.x2 - drawingTrait.x1, drawingTrait.y2 - drawingTrait.y1);
      if (dist > 4) { // ignore un simple clic sans glissement
        const id = genId("tr");
        update({ traits: [...traits, { id, ...drawingTrait }] });
        setSelected({ type: "trait", id });
      }
      setDrawingTrait(null);
      // Volontairement pas de retour à "select" ici non plus : l'élève
      // peut ainsi tracer plusieurs traits d'affilée sans recliquer sur
      // le bouton "Tracer un trait" à chaque fois.
    }
    setDragging(null);
  };

  const startDragCarre = (e, id) => {
    if (readOnly || mode !== "select") return;
    e.stopPropagation();
    setSelected({ type: "carre", id });
    setDragging({ id });
  };
  const selectTrait = (e, id) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelected({ type: "trait", id });
  };

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.type === "carre") update({ carres: carres.filter(c => c.id !== selected.id) });
    else update({ traits: traits.filter(tr => tr.id !== selected.id) });
    setSelected(null);
  };
  const updateSelectedLabel = (label) => {
    if (!selected || selected.type !== "carre") return;
    update({ carres: carres.map(c => c.id === selected.id ? { ...c, label } : c) });
  };
  const updateSelectedNom = (nom) => {
    if (!selected || selected.type !== "carre") return;
    update({ carres: carres.map(c => c.id === selected.id ? { ...c, nom } : c) });
  };

  const selectedCarre = selected?.type === "carre" ? carres.find(c => c.id === selected.id) : null;

  return (
    <div>
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <Btn variant={mode === "add-carre" ? "primary" : "ghost"} icon={Square} onClick={() => { setMode(mode === "add-carre" ? "select" : "add-carre"); setSelected(null); }}>{t("reseau_ajouter_station")}</Btn>
          <Btn variant={mode === "add-trait" ? "primary" : "ghost"} icon={Slash} onClick={() => { setMode(mode === "add-trait" ? "select" : "add-trait"); setSelected(null); }}>{t("reseau_tracer_trait")}</Btn>
          {selectedCarre && (
            <>
              <input style={{ ...inputStyle, width: 100 }} autoFocus placeholder={t("reseau_numero_station_placeholder")} value={selectedCarre.label} onChange={e => updateSelectedLabel(e.target.value)} />
              <input style={{ ...inputStyle, width: 160 }} placeholder={t("reseau_nom_station_placeholder")} value={selectedCarre.nom || ""} onChange={e => updateSelectedNom(e.target.value)} />
            </>
          )}
          {selected && <Btn variant="danger" icon={Trash2} onClick={deleteSelected}>{t("delete")}</Btn>}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        onClick={handleSvgClick}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
        onTouchStart={handleSvgMouseDown}
        onTouchMove={handleSvgMouseMove}
        onTouchEnd={handleSvgMouseUp}
        style={{ width: "100%", height: "auto", aspectRatio: `${VIEWBOX_W}/${VIEWBOX_H}`, background: "#fbfbf8", border: `1px solid ${C.line}`, borderRadius: 10, touchAction: "none", cursor: readOnly ? "default" : (mode === "select" ? "default" : "crosshair") }}
      >
        {traits.map(tr => (
          <line key={tr.id} x1={tr.x1} y1={tr.y1} x2={tr.x2} y2={tr.y2}
            stroke={selected?.type === "trait" && selected.id === tr.id ? C.red : C.navy}
            strokeWidth={selected?.type === "trait" && selected.id === tr.id ? 4 : 2.5}
            style={{ cursor: readOnly ? "default" : "pointer" }}
            onClick={(e) => selectTrait(e, tr.id)} />
        ))}
        {drawingTrait && <line x1={drawingTrait.x1} y1={drawingTrait.y1} x2={drawingTrait.x2} y2={drawingTrait.y2} stroke={C.navy} strokeWidth={2.5} strokeDasharray="5,4" />}
        {carres.map(c => (
          <g key={c.id} onMouseDown={(e) => startDragCarre(e, c.id)} onTouchStart={(e) => startDragCarre(e, c.id)} style={{ cursor: readOnly ? "default" : "grab" }}>
            <rect x={c.x} y={c.y} width={CARRE_TAILLE} height={CARRE_TAILLE} rx={4}
              fill="#fff" stroke={selected?.type === "carre" && selected.id === c.id ? C.red : C.navy}
              strokeWidth={selected?.type === "carre" && selected.id === c.id ? 3 : 2} />
            <text x={c.x + CARRE_TAILLE / 2} y={c.y + CARRE_TAILLE / 2 + 4} textAnchor="middle" fontSize={13} fontFamily={FONT_MONO} fontWeight={700} fill={C.navy}>{c.label}</text>
            {c.nom && <text x={c.x + CARRE_TAILLE / 2} y={c.y + CARRE_TAILLE + 13} textAnchor="middle" fontSize={11} fontFamily={FONT_BODY} fill={C.ink}>{c.nom}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
