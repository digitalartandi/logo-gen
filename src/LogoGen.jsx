import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Trash2, RotateCcw, Info, Download, Upload, AlertTriangle, MoreVertical } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Badge } from "./ui";

/* ------------ kleine Helfer ------------ */

const STORAGE_KEY = "aaa-logo-builder-state-v4";

// Dropdown: Branchen
const BRANCHEN = [
  "Software/Tech",
  "Finanzen/Jura",
  "Gesundheit/Medizin",
  "Bio-Lebensmittel",
  "Gastronomie/Hotel",
  "Einzelhandel/E-Commerce",
  "Bildung",
  "Sport/Fitness",
  "Mode/Beauty",
  "Architektur/Bau",
  "Immobilien",
  "Automotive/Mobilität",
  "Kreativ/Agentur",
  "Non-Profit",
  "Medien/Entertainment",
  "Reisen/Tourismus",
  "Industrie/Produktion",
  "Energie/GreenTech",
  "Logistik",
  "Sonstige (Freitext)",
];

// debounce
const debounce = (fn, wait = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// Farbe normalisieren: akzeptiert #RGB, #RRGGBB oder CSS-Namen -> #RRGGBB
const toHex6 = (val) => {
  const s = String(val || "").trim();
  if (!s) return null;
  const hex3 = /^#([0-9a-f]{3})$/i;
  const hex6 = /^#([0-9a-f]{6})$/i;
  if (hex6.test(s)) return s.toUpperCase();
  if (hex3.test(s)) {
    const m = s.match(hex3)[1];
    return ("#" + m[0] + m[0] + m[1] + m[1] + m[2] + m[2]).toUpperCase();
  }
  // CSS-Farbnamen -> Canvas-Trick
  try {
    const d = document.createElement("span");
    d.style.color = "#000";
    d.style.color = s;
    // wenn ungültig, bleibt "#000"
    const rgb = getComputedStyle(d).color; // rgb(r, g, b)
    const m2 = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!m2) return null;
    const r = Number(m2[1]), g = Number(m2[2]), b = Number(m2[3]);
    const to2 = (n) => n.toString(16).padStart(2, "0");
    return ("#" + to2(r) + to2(g) + to2(b)).toUpperCase();
  } catch {
    return null;
  }
};

// Kontrastrechner (gegen Weiß)
const hexToRgb = (hex) => {
  const c = (hex || "").replace("#", "");
  if (!c || (c.length !== 6 && c.length !== 3)) return { r: 0, g: 0, b: 0 };
  const norm = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const num = parseInt(norm, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
const relLuminance = ({ r, g, b }) => {
  const srgb = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};
const contrastWithWhite = (anyColor) => {
  try {
    const hex = toHex6(anyColor);
    if (!hex) return null;
    const L1 = relLuminance(hexToRgb(hex));
    const L2 = relLuminance({ r: 255, g: 255, b: 255 });
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (!isFinite(ratio)) return null;
    return Number(ratio.toFixed(2));
  } catch {
    return null;
  }
};

/* ------------ persistenter State ------------ */

const defaultState = {
  meta: { name: "", slogan: "", branche: "", brancheOther: "", beschreibung: "" },
  zielgruppe: { beschreibung: "", b2: "B2C", usecases: "" },
  wettbewerb: { competitor1: "", competitor2: "", differenzierung: "" },
  werte: { values: ["Vertrauen", "Qualität"], persoenlichkeit: ["modern", "freundlich"], botschaft: "" },
  story: { enabled: false, text: "" },
  stil: { logotyp: "Wort-Bild-Marke", adjektive: ["minimalistisch", "elegant"], referenzen: "" },
  farben: { primary: "#0F172A", secondary: "#22C55E", verbot: "" },
  typo: { stil: "serifenlos modern", details: "" },
};

function usePersistentState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState;
    } catch (_) {
      return defaultState;
    }
  });

  useEffect(() => {
    const save = debounce((s) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {}
    }, 450);
    save(state);
  }, [state]);

  const reset = () => setState(defaultState);
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  };
  return { state, setState, reset, clearStorage };
}

/* ------------ UI-Bausteine ------------ */

// Style-Konstanten
const MOSAIK_PRIMARY = "#6F00FF"; 
const MOSAIK_BACKGROUND = "#141414"; 
// Neu: Leicht dunklerer Card-Hintergrund für mehr Tiefe
const MOSAIK_CARD_BG_DARKER = "#1C1C1C"; 
// FIX 1: Subtiler lila-Rand für den Premium-Look
const MOSAIK_BORDER_COLOR = "rgba(111, 0, 255, 0.3)"; 

// FIX 5: SVG Logo
const MosaikLogo = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        xmlSpace="preserve" 
        viewBox="0 0 372.017 78.581" 
        style={{ width: '100px', height: '21px', verticalAlign: 'middle' }}
        role="img"
        aria-label="Mosaik Logo"
    >
        <defs>
            <linearGradient id="a" x1="0" x2="230" y1="180" y2="180" gradientTransform="matrix(.26458 0 0 .26458 -111.359 97.351)" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6F00FF"/>
                <stop offset=".5" stopColor="#6F00FF"/>
                <stop offset="1" stopColor="#FF1EFF"/>
            </linearGradient>
        </defs>
        <path fill="url(#a)" d="M-81.08 114.55h.292c.298 3.503 1.103 6.855 2.441 10.011l.007.017.008.017c1.778 4.052 4.183 7.602 7.18 10.6 3 2.997 6.548 5.403 10.6 7.181l.017.007.017.007c3.157 1.339 6.51 2.144 10.013 2.442v.292c-3.509.308-6.868 1.141-10.028 2.526-4.06 1.724-7.616 4.105-10.618 7.107-2.997 2.997-5.403 6.547-7.181 10.6l-.008.016-.007.017c-1.338 3.157-2.143 6.509-2.44 10.012h-.293c-.308-3.51-1.141-6.868-2.527-10.029l-.003-.006c-1.668-3.93-3.955-7.389-6.823-10.328l-.007-.007-.266-.27-.006-.006c-3.001-3-6.558-5.382-10.617-7.105l-.002-.001c-3.16-1.386-6.518-2.219-10.028-2.527v-.292c3.505-.297 6.856-1.103 10.013-2.441l.017-.007.018-.007c4.052-1.779 7.602-4.184 10.599-7.181 3-3.002 5.382-6.558 7.105-10.617 1.386-3.16 2.22-6.52 2.527-10.03z" style={{ fill: 'url(#a)', strokeWidth: '.264583' }} transform="translate(111.359 -114.02)"/>
        <path fill="#fff" d="M-6.769 114.02v23.733c1.905-2.222 5.398-4.445 11.113-4.445 10.636 0 17.938 8.89 17.938 20.955 0 12.065-7.302 20.876-17.938 20.876-5.795 0-9.684-2.382-11.827-5.239l-.556 4.445h-10.477V114.02zm8.255 29.527c-4.048 0-6.588 2.144-8.255 5.08V159.9c1.667 2.857 4.207 5 8.255 5 5.318 0 8.97-4.048 8.97-10.636 0-6.588-3.652-10.716-8.97-10.716zm50.834-10.239v11.668h-1.032c-4.683 0-7.7 2.302-10.001 5.318v24.051H29.539v-40.243h10.478l.714 5.318c1.984-3.334 5.953-6.112 11.589-6.112zm21.217 0c5.715 0 9.445 2.381 11.51 5.318l.555-4.524h10.557v40.243H85.602l-.556-4.445c-2.064 2.857-5.794 5.239-11.51 5.239-10.556 0-17.7-8.81-17.7-20.876 0-12.065 7.144-20.955 17.7-20.955zm2.857 10.24c-5.159 0-8.652 4.127-8.652 10.715 0 6.588 3.493 10.636 8.652 10.636 3.97 0 6.271-2.143 8.017-5v-11.35c-1.746-2.858-4.048-5.002-8.017-5.002zm51.883-10.24c9.842 0 15.16 6.985 15.16 17.86v23.177H131.69v-22.543c0-4.445-2.461-7.46-6.588-7.46-3.572 0-6.033 2.301-7.541 4.682v25.321h-11.748v-40.243h10.557l.556 4.445c1.984-2.937 5.874-5.239 11.35-5.239zm62.772-19.288v60.325h-10.556l-.556-4.445c-2.064 2.857-6.033 5.239-11.748 5.239-10.715 0-18.017-8.81-18.017-20.876 0-12.065 7.302-20.955 18.017-20.955 5.715 0 9.208 2.223 11.113 4.445V114.02zm-20.002 29.527c-5.318 0-8.97 4.128-8.97 10.716 0 6.588 3.652 10.636 8.97 10.636 3.969 0 6.509-2.143 8.255-5v-11.272c-1.746-2.936-4.286-5.08-8.255-5.08zm35.674-29.05c3.968 0 6.905 2.936 6.905 6.905 0 3.969-2.937 6.905-6.905 6.905-3.97 0-6.827-2.936-6.827-6.905 0-3.969 2.858-6.906 6.827-6.906zm5.873 19.605v40.243h-11.747v-40.243zm25.205-.794c5.715 0 9.683 2.381 11.747 5.318l.556-4.524h10.557v58.5H248.91v-21.908c-1.905 2.222-5.397 4.445-11.112 4.445-10.716 0-18.018-8.81-18.018-20.876 0-12.065 7.302-20.955 18.018-20.955zm2.857 10.24c-5.318 0-8.97 4.127-8.97 10.715s3.652 10.636 8.97 10.636c3.969 0 6.509-2.143 8.255-5v-11.35c-1.746-2.858-4.286-5.002-8.255-5.002z" style={{ strokeWidth: '.264583' }} transform="translate(111.359 -114.02)"/>
    </svg>
);


const StepHeader = ({ step, total, title, subtitle }) => (
  <div className="mb-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        Schritt {step} / {total}
      </div>
    </div>
    <div className="w-full h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
      <motion.div
        className="h-2"
        style={{ backgroundColor: MOSAIK_PRIMARY }}
        initial={{ width: 0 }}
        animate={{ width: `${(step / total) * 100}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      />
    </div>
  </div>
);

const Section = ({ title, children, info, danger }) => (
  // FIX 1: Premium Card Style - dunklerer Hintergrund, subtiler Rand, mehr Schatten
  <Card className={`mb-5 rounded-xl shadow-2xl border-2 ${danger ? "border-red-600" : ""}`} style={{backgroundColor: MOSAIK_CARD_BG_DARKER, borderColor: MOSAIK_BORDER_COLOR}}>
    <CardHeader className="py-4 px-5">
      <CardTitle className="text-base font-medium flex items-center gap-2 text-white">
        {title}
        {info && (
          <span className="text-gray-400 text-xs font-normal flex items-center gap-1">
            <Info size={14} aria-hidden="true" />
            {info}
          </span>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 pb-5 px-5">{children}</CardContent>
  </Card>
);

const Stepper = ({ step, setStep, labels, onKeyDown }) => (
  <div className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur border-b border-gray-800">
    <div className="max-w-xl mx-auto px-4 py-2 overflow-x-auto">
      <div className="flex gap-2 w-max" role="tablist" tabIndex={0} onKeyDown={onKeyDown}>
        {labels.map((label, idx) => {
          const s = idx + 1;
          const active = s === step;
          return (
            <button
              key={label}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${s}`}
              id={`tab-${s}`}
              onClick={() => setStep(s)}
              className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${
                active ? "border-transparent text-white" : "bg-gray-700/40 hover:bg-gray-700 text-gray-300 border-gray-700"
              }`}
              style={active ? { backgroundColor: MOSAIK_PRIMARY, borderColor: MOSAIK_PRIMARY } : {}}
            >
              {s}. {label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// ChipSelect mit echten Checkboxes (verlässlich tippbar)
const ChipSelect = ({ options, values, onChange, name = "chip" }) => {
  const selected = new Set(values || []);
  const toggle = useCallback(
    (val) => {
      const s = new Set(selected);
      s.has(val) ? s.delete(val) : s.add(val);
      onChange(Array.from(s));
    },
    [selected, onChange]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const checked = selected.has(o);
        const id = `${name}-${o}`;
        return (
          <label
            key={o}
            htmlFor={id}
            className={`px-3 py-2 rounded-2xl border text-sm cursor-pointer select-none transition-colors ${
              checked ? "text-white border-transparent" : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
            }`}
            style={checked ? { backgroundColor: MOSAIK_PRIMARY } : {}}
          >
            <input id={id} type="checkbox" checked={checked} onChange={() => toggle(o)} className="sr-only" />
            {o}
          </label>
        );
      })}
    </div>
  );
};

// Farbzeile mit Normalisierung & Vorschau
const ColorRow = ({ label, value, onChange, contrast }) => {
  // Wichtig: toHex6(value) liefert den korrekten Wert, auch wenn die Eingabe ungültig war,
  // solange sie zwischenzeitlich gültig war (z.B. durch Farbfeld)
  const normalized = useMemo(() => toHex6(value), [value]);
  const swatch = normalized || value || "#FFFFFF";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* FIX 1: Emojis entfernt */}
      <label className="text-sm w-36 text-gray-300">{label}</label>
      <Input
        type="color"
        // Wichtig: Farbfeld muss den normalisierten Wert erhalten, um richtig zu funktionieren.
        value={normalized || "#FFFFFF"}
        // FIX 3: Bei Änderung den normalisierten Wert an den State übergeben.
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 touch-manipulation" 
        aria-label={`${label} (Farbfeld)`}
        title="Farbfeld – klick zum Wählen"
      />
      <Input
        placeholder="#HEX oder Farbnamen (z. B. royalblue)"
        // Wichtig: Textfeld zeigt den aktuellen State-Wert an.
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          // Korrektur: Wir setzen den normalisierten Wert in den State, wenn er valide ist.
          // Das behebt das Problem, dass die Farbfeld-Wahl überschrieben wird.
          const norm = toHex6(raw);
          onChange(norm || raw); 
        }}
        aria-label={`${label} (Textfeld)`}
        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
      />
      <span
        className="inline-block w-7 h-7 rounded-lg border border-gray-600"
        style={{ background: swatch }}
        title={`Vorschau: ${swatch}`}
        aria-label={`Farbvorschau ${swatch}`}
      />
      {Number.isFinite(contrast) && (
        <Badge
          variant="default"
          className={`text-xs ${
            contrast >= 4.5
              ? "bg-green-600 text-white"
              : contrast >= 3
              ? "bg-yellow-600 text-black"
              : "bg-red-600 text-white"
          }`}
        >
          {contrast >= 4.5 ? 'WCAG AA' : 'Kontrast ⚠️'} {contrast}:1
        </Badge>
      )}
    </div>
  );
};

/* ------------ Promptbuilder ------------ */

function buildPrompt(s) {
  const parts = [];
  const name = s.meta.name?.trim() || "[Markenname]";
  const branche = (s.meta.branche === "Sonstige (Freitext)" ? s.meta.brancheOther : s.meta.branche) || "[Branche]";
  const slogan = s.meta.slogan?.trim();

  parts.push(`Erstelle ein professionelles, vektorähnliches Logo für "${name}" (Branche: ${branche}).`);
  if (slogan) parts.push(`Optionaler Claim/Slogan: "${slogan}".`);
  if (s.meta.beschreibung) parts.push(`Kurzbeschreibung: ${s.meta.beschreibung}`);

  if (s.zielgruppe.beschreibung || s.zielgruppe.b2 || s.zielgruppe.usecases) {
    const audience = [s.zielgruppe.b2, s.zielgruppe.beschreibung].filter(Boolean).join(", ");
    const usecases = s.zielgruppe.usecases ? `, Use-Cases: ${s.zielgruppe.usecases}` : "";
    parts.push(`Zielgruppe: ${audience}${usecases}.`);
  }

  // Wettbewerb ist jetzt Teil von Schritt 2
  if (s.wettbewerb.competitor1 || s.wettbewerb.competitor2 || s.wettbewerb.differenzierung) {
    const comps = [s.wettbewerb.competitor1, s.wettbewerb.competitor2].filter(Boolean).join(", ");
    if (comps) parts.push(`Wettbewerbsumfeld: ${comps}.`);
    if (s.wettbewerb.differenzierung) parts.push(`Positionierung/USP: ${s.wettbewerb.differenzierung}.`);
  }

  if (s.werte.values?.length || s.werte.persoenlichkeit?.length || s.werte.botschaft) {
    const vals = s.werte.values?.length ? `Werte: ${s.werte.values.join(", ")}.` : "";
    const pers = s.werte.persoenlichkeit?.length ? `Markenpersönlichkeit: ${s.werte.persoenlichkeit.join(", ")}.` : "";
    const msg = s.werte.botschaft ? `Zentrale Botschaft: ${s.werte.botschaft}.` : "";
    parts.push([vals, pers, msg].filter(Boolean).join(" "));
  }

  if (s.story.enabled && s.story.text) parts.push(`Brand Story (Kurzform, als Inspirationsquelle): ${s.story.text}`);

  if (s.stil.logotyp || s.stil.adjektive?.length || s.stil.referenzen) {
    const logotyp = s.stil.logotyp ? `Logo-Typ: ${s.stil.logotyp}.` : "";
    const adj = s.stil.adjektive?.length ? `Stil: ${s.stil.adjektive.join(", ")}.` : "";
    const ref = s.stil.referenzen ? `Visuelle Referenzen/Anmutung: ${s.stil.referenzen}.` : "";
    parts.push([logotyp, adj, ref].filter(Boolean).join(" "));
  }

  const farbBits = [];
  // Korrekte Verwendung von toHex6 für die Ausgabe
  if (s.farben.primary) farbBits.push(`Primärfarbe ${toHex6(s.farben.primary) || s.farben.primary}`);
  if (s.farben.secondary) farbBits.push(`Sekundärfarbe ${toHex6(s.farben.secondary) || s.farben.secondary}`);
  if (s.farben.verbot) farbBits.push(`Keine: ${s.farben.verbot}`);
  if (farbBits.length) parts.push(`Farbwelt: ${farbBits.join(", ")}.`);

  if (s.typo.stil || s.typo.details) parts.push(`Typografie: ${[s.typo.stil, s.typo.details].filter(Boolean).join("; ")}.`);

  parts.push("Anforderungen: minimalistisch, klar erkennbar, skalierbar, zeitlos, hohe Lesbarkeit. Vermeide übermäßige Details; setze auf klare geometrische Formen und flache Farben.");
  parts.push("Ausgabe auf weißem Hintergrund (rein weiß). Liefere 1–3 Varianten mit geringfügigen Stil- oder Kompositionsunterschieden.");
  parts.push("Wenn Text enthalten ist: korrekte Schreibweise des Markennamens, keine Fantasyschrift nur der Optik wegen.");

  const text = parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter((p) => p.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return text;
}

/* ------------ Hauptkomponente ------------ */

export default function App() {
  const { state, setState, reset, clearStorage } = usePersistentState();
  const [step, setStep] = useState(1);
  const [copyMsg, setCopyMsg] = useState("");
  const [showMenu, setShowMenu] = useState(false); 
  const fileInputRef = useRef(null);

  const labels = ["Basis", "Zielgruppe & Wettbewerb", "Werte", "Story", "Stil", "Farben", "Typo/Prompt"];
  const total = labels.length;

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStep((s) => Math.min(labels.length, s + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(1, s - 1));
      }
    },
    [labels.length]
  );

  const next = () => setStep((s) => Math.min(total, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const handleReset = useCallback(() => {
    setShowMenu(false); 
    if (confirm("Entwurf wirklich auf Standard zurücksetzen?")) reset();
  }, [reset]);

  const handleClear = useCallback(() => {
    setShowMenu(false); 
    const c = prompt("ALLE lokalen Daten löschen? Tippe LÖSCHEN zur Bestätigung.");
    if ((c || "").trim().toUpperCase() === "LÖSCHEN") {
      clearStorage();
    }
  }, [clearStorage]);

  const handleImportClick = () => {
    setShowMenu(false); 
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    setShowMenu(false); 
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aaa-logo-entwurf-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setState(data);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {}
    };
    reader.readAsText(file);
  };

  const prompt = useMemo(() => buildPrompt(state), [state]);
  const compactPrompt = useMemo(() => {
    const lines = prompt.split("\n");
    const head = lines.slice(0, 5).join("\n");
    return lines.length > 5 ? head + "\n…" : head;
  }, [prompt]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      // FIX 1: Emojis entfernt
      setCopyMsg("Prompt kopiert!");
    } catch {
      setCopyMsg("Kopieren fehlgeschlagen – bitte manuell markieren");
    }
    setTimeout(() => setCopyMsg(""), 1800);
  };

  const canContinue = useMemo(() => {
    if (step === 1) {
      const brancheOk =
        state.meta.branche && (state.meta.branche !== "Sonstige (Freitext)" || state.meta.brancheOther.trim().length > 0);
      return state.meta.name.trim().length > 1 && brancheOk;
    }
    return true;
  }, [step, state]);

  // Kontrast mit normalisierten Farben
  const contrastPrimary = useMemo(() => contrastWithWhite(state.farben.primary), [state.farben.primary]);
  const contrastSecondary = useMemo(() => contrastWithWhite(state.farben.secondary), [state.farben.secondary]);

  return (
    // FIX 2: Poppins Font simuliert (muss im globalen CSS existieren)
    <div className="min-h-screen text-white font-poppins" style={{ backgroundColor: MOSAIK_BACKGROUND }}>
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="py-3 px-4 flex items-center justify-between gap-2">
          {/* FIX 5: Mosaik Logo SVG */}
          <div className="flex items-center gap-2">
            <MosaikLogo />
            <span className="sr-only">Logo Prompt Builder</span>
          </div>
          {/* FIX 3: Menü-Button und Dropdown */}
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setShowMenu(p => !p)} className="bg-gray-800 hover:bg-gray-700 border-gray-700" aria-label="Weitere Optionen">
              <MoreVertical className="h-5 w-5 text-white" />
            </Button>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                transition={{ type: "tween", duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-gray-800 border border-gray-700 z-30 overflow-hidden origin-top-right"
              >
                <div className="p-2 space-y-1">
                  <Button variant="ghost" size="sm" onClick={handleExport} className="w-full justify-start text-gray-300 hover:bg-gray-700">
                    <Download className="h-4 w-4 mr-2" />
                    Export (JSON)
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleImportClick} className="w-full justify-start text-gray-300 hover:bg-gray-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Import (JSON)
                  </Button>
                  <div className="h-px bg-gray-700 my-1"></div>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="w-full justify-start text-red-400 hover:bg-red-900/50">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Zurücksetzen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear} className="w-full justify-start text-red-400 hover:bg-red-900/50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Lokal Löschen
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => importJSON(e.target.files?.[0])}
          />
        </div>
        <Stepper step={step} setStep={setStep} labels={labels} onKeyDown={onKeyDown} />
      </header>

      <main className="max-w-xl mx-auto p-4 pb-32">
        <AnimatePresence mode="popLayout">
          {/* Schritt 1 */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={1} total={total} title="Markenbasis" subtitle="Name, Slogan, Branche, Kurzbeschreibung" />
              
              <Section title="Grunddaten" info="Pflichtfelder sind mit * gekennzeichnet">
                <div className="grid gap-3">
                  <div>
                    <label htmlFor="brand-name" className="text-sm text-gray-300">
                      Marken-/Firmenname*
                    </label>
                    <Input
                      id="brand-name"
                      placeholder="z. B. LogoGen"
                      value={state.meta.name}
                      onChange={(e) => setState((p) => ({ ...p, meta: { ...p.meta, name: e.target.value } }))}
                      aria-describedby={!state.meta.name || state.meta.name.trim().length < 2 ? "brand-name-err" : undefined}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                    />
                    {(!state.meta.name || state.meta.name.trim().length < 2) && (
                      <p id="brand-name-err" className="text-xs text-red-600 mt-1">
                        Bitte einen gültigen Markennamen angeben.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="brand-claim" className="text-sm text-gray-300">
                      Claim/Slogan (optional)
                    </label>
                    <Input
                      id="brand-claim"
                      placeholder="z. B. Die Zukunft des Designs"
                      value={state.meta.slogan}
                      onChange={(e) => setState((p) => ({ ...p, meta: { ...p.meta, slogan: e.target.value } }))}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  {/* Branche: Dropdown + optional Freitext */}
                  <div className="grid gap-2">
                    <label htmlFor="brand-branche" className="text-sm text-gray-300">
                      Branche*
                    </label>
                    <select
                      id="brand-branche"
                      className="w-full rounded-md border px-3 py-2 text-sm bg-gray-900 border-gray-700 text-white"
                      value={state.meta.branche}
                      onChange={(e) => setState((p) => ({ ...p, meta: { ...p.meta, branche: e.target.value } }))}
                    >
                      <option value="" disabled className="text-gray-500">
                        Bitte wählen …
                      </option>
                      {BRANCHEN.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    {state.meta.branche === "Sonstige (Freitext)" && (
                      <Input
                        placeholder="Eigene Branche"
                        value={state.meta.brancheOther}
                        onChange={(e) => setState((p) => ({ ...p, meta: { ...p.meta, brancheOther: e.target.value } }))}
                        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    )}

                    {!state.meta.branche && (
                      <p id="brand-branche-err" className="text-xs text-red-600">
                        Branche ist erforderlich.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="brand-desc" className="text-sm text-gray-300">
                      Kurzbeschreibung
                    </label>
                    <Textarea
                      id="brand-desc"
                      placeholder="1–2 Sätze über das Angebot/den Nutzen"
                      value={state.meta.beschreibung}
                      onChange={(e) => setState((p) => ({ ...p, meta: { ...p.meta, beschreibung: e.target.value } }))}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    Tipp: Beschreibe Nutzen statt Features – z. B. „hilft Teams, Projekte schneller zu liefern“.
                  </p>
                </div>
              </Section>
            </motion.div>
          )}

          {/* Schritt 2 (jetzt mit Wettbewerb) */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={2} total={total} title="Zielgruppe & Wettbewerb" subtitle="Wen sprechen wir an? In welchen Kontexten? Wer sind die Konurrenten?" />
              
              <Section
                title="Zielgruppe"
                info={
                  <>
                    Segment & Merkmale (z. B. B2B KMU in DACH; 25–45; tech-affin)
                  </>
                }
              >
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={state.zielgruppe.b2 === "B2C" ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, zielgruppe: { ...p.zielgruppe, b2: "B2C" } }))}
                      title="B2C = Endkundenmarkt (Privatpersonen)"
                      className={state.zielgruppe.b2 === "B2C" ? "text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
                      style={state.zielgruppe.b2 === "B2C" ? { backgroundColor: MOSAIK_PRIMARY } : {}}
                    >
                      B2C
                    </Button>
                    <Button
                      variant={state.zielgruppe.b2 === "B2B" ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, zielgruppe: { ...p.zielgruppe, b2: "B2B" } }))}
                      title="B2B = Geschäftskunden (z. B. KMU = kleine & mittlere Unternehmen)"
                      className={state.zielgruppe.b2 === "B2B" ? "text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
                      style={state.zielgruppe.b2 === "B2B" ? { backgroundColor: MOSAIK_PRIMARY } : {}}
                    >
                      B2B
                    </Button>
                    <Info
                      size={16}
                      className="ml-1 text-gray-400"
                      aria-label="B2C/B2B Erklärung"
                      title="B2C: Endkunden (Privatpersonen). B2B: Firmenkunden; KMU = kleine & mittlere Unternehmen."
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    B2C: Endkundenmarkt. B2B: Geschäftskunden. <strong>KMU</strong> = kleine & mittlere Unternehmen (bis ca. 250 MA).
                  </p>
                  <Textarea
                    placeholder="Zielgruppenbeschreibung (z. B. Alter, Branche, Interessen)"
                    value={state.zielgruppe.beschreibung}
                    onChange={(e) => setState((p) => ({ ...p, zielgruppe: { ...p.zielgruppe, beschreibung: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <Textarea
                    placeholder="Use-Cases (z. B. Website, App-Icon, Verpackung, Schild)"
                    value={state.zielgruppe.usecases}
                    onChange={(e) => setState((p) => ({ ...p, zielgruppe: { ...p.zielgruppe, usecases: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </Section>

              <Section title="Wettbewerb & USP" info="Nenne 1–3 Wettbewerber und den Unterschied deiner Marke">
                <div className="grid gap-3">
                  <Input
                    placeholder="Wettbewerber 1 (optional)"
                    value={state.wettbewerb.competitor1}
                    onChange={(e) => setState((p) => ({ ...p, wettbewerb: { ...p.wettbewerb, competitor1: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <Input
                    placeholder="Wettbewerber 2 (optional)"
                    value={state.wettbewerb.competitor2}
                    onChange={(e) => setState((p) => ({ ...p, wettbewerb: { ...p.wettbewerb, competitor2: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <Textarea
                    placeholder="Positionierung/USP – was unterscheidet euch?"
                    value={state.wettbewerb.differenzierung}
                    onChange={(e) => setState((p) => ({ ...p, wettbewerb: { ...p.wettbewerb, differenzierung: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </Section>
            </motion.div>
          )}

          {/* Schritt 3 (Werte) */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={3} total={total} title="Markenwerte & Persönlichkeit" subtitle="Wofür steht die Marke?" />
              <Section title="Kernwerte" info="Wähle 2–5 Werte">
                <ChipSelect
                  name="werte"
                  options={[
                    "Vertrauen",
                    "Qualität",
                    "Innovation",
                    "Nachhaltigkeit",
                    "Premium",
                    "Zuverlässigkeit",
                    "Mut",
                    "Transparenz",
                    "Schnelligkeit",
                    "Kundenfokus",
                    "Tradition",
                    "Leidenschaft",
                  ]}
                  values={state.werte.values}
                  onChange={(values) => setState((p) => ({ ...p, werte: { ...p.werte, values } }))}
                />
              </Section>
              <Section title="Markenpersönlichkeit" info="Ton & Auftreten">
                <ChipSelect
                  name="persoenlichkeit"
                  options={[
                    "modern",
                    "freundlich",
                    "seriös",
                    "verspielt",
                    "elegant",
                    "mutig",
                    "technisch",
                    "warm",
                    "minimalistisch",
                    "luxuriös",
                    "bodenständig",
                    "kreativ",
                  ]}
                  values={state.werte.persoenlichkeit}
                  onChange={(persoenlichkeit) => setState((p) => ({ ...p, werte: { ...p.werte, persoenlichkeit } }))}
                />
              </Section>
              <Section title="Zentrale Botschaft (optional)">
                <Textarea
                  placeholder="Welche Botschaft soll das Logo transportieren?"
                  value={state.werte.botschaft}
                  onChange={(e) => setState((p) => ({ ...p, werte: { ...p.werte, botschaft: e.target.value } }))}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
              </Section>
            </motion.div>
          )}

          {/* Schritt 4 (Story) */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={4} total={total} title="Brand Story (optional)" subtitle="Hintergrund & Motivation" />
              <Section title="Story aktivieren">
                <div className="flex items-center gap-3 text-gray-300">
                  <input
                    id="story-enabled"
                    type="checkbox"
                    checked={state.story.enabled}
                    onChange={(e) => setState((p) => ({ ...p, story: { ...p.story, enabled: e.target.checked } }))}
                    className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded" 
                    style={{ color: MOSAIK_PRIMARY }}
                  />
                  <label htmlFor="story-enabled" className="text-sm">
                    Eigene Brand Story als Inspirationsquelle einbeziehen
                  </label>
                </div>
              </Section>
              {state.story.enabled && (
                <Section title="Brand Story (Kurzform)">
                  <Textarea
                    rows={5}
                    placeholder="Warum gibt es die Marke? Welche Vision? 2–5 Sätze."
                    value={state.story.text}
                    onChange={(e) => setState((p) => ({ ...p, story: { ...p.story, text: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </Section>
              )}
            </motion.div>
          )}

          {/* Schritt 5 (Stil) */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={5} total={total} title="Logo-Stil" subtitle="Logo-Typ & Stiladjektive" />
              <Section title="Logo-Typ">
                <div className="flex flex-wrap gap-2">
                  {["Wortmarke", "Bildmarke", "Wort-Bild-Marke", "Emblem", "Abstrakt"].map((t) => (
                    <Button
                      key={t}
                      variant={state.stil.logotyp === t ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, stil: { ...p.stil, logotyp: t } }))}
                      className={state.stil.logotyp === t ? "text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
                      style={state.stil.logotyp === t ? { backgroundColor: MOSAIK_PRIMARY } : {}}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </Section>
              <Section title="Stiladjektive" info="Wähle 2–5 Adjektive">
                <ChipSelect
                  name="adjektive"
                  options={[
                    "minimalistisch",
                    "elegant",
                    "verspielt",
                    "futuristisch",
                    "vintage",
                    "technisch",
                    "organisch",
                    "geometrisch",
                    "freundlich",
                    "professionell",
                    "exklusiv",
                    "dynamisch",
                  ]}
                  values={state.stil.adjektive}
                  onChange={(adjektive) => setState((p) => ({ ...p, stil: { ...p.stil, adjektive } }))}
                />
              </Section>
              <Section title="Referenzen/Anmutung (optional)">
                <Input
                  placeholder="z. B. ‚ähnlich simple Formen wie Apple Logo‘"
                  value={state.stil.referenzen}
                  onChange={(e) => setState((p) => ({ ...p, stil: { ...p.stil, referenzen: e.target.value } }))}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
              </Section>
            </motion.div>
          )}

          {/* Schritt 6 (Farben) */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={6} total={total} title="Farben" subtitle="Primär-/Sekundärfarbe & Verbote" />
              <Section title="Farbwahl" info="Logo muss auf Weiß funktionieren; SW-Tauglichkeit beachten">
                <div className="grid gap-3">
                  <ColorRow
                    label="Primärfarbe"
                    value={state.farben.primary}
                    onChange={(v) => setState((p) => ({ ...p, farben: { ...p.farben, primary: v } }))}
                    contrast={contrastPrimary}
                  />
                  <ColorRow
                    label="Sekundärfarbe"
                    value={state.farben.secondary}
                    onChange={(v) => setState((p) => ({ ...p, farben: { ...p.farben, secondary: v } }))}
                    contrast={contrastSecondary}
                  />
                  <Input
                    placeholder="Ausschlüsse (z. B. kein Pink, kein Neon)"
                    value={state.farben.verbot}
                    onChange={(e) => setState((p) => ({ ...p, farben: { ...p.farben, verbot: e.target.value } }))}
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Hinweis: Für Fließtext gilt WCAG AA ≈ 4.5:1. Für Logos ist Lesbarkeit ebenfalls wichtig, auch wenn WCAG formell nicht greift.
                </p>
              </Section>
            </motion.div>
          )}

          {/* Schritt 7 (Typografie/Prompt) */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={7} total={total} title="Typografie" subtitle="Schriftstil für Wortbestandteile" />
              <Section title="Schriftstil">
                <div className="flex flex-wrap gap-2">
                  {[
                    "serifenlos modern",
                    "Serif klassisch",
                    "Slab Serif",
                    "mono/technisch",
                    "Display/markant",
                    "Retro",
                    "Script/Schreibschrift",
                    "Brush",
                  ].map((t) => (
                    <Button
                      key={t}
                      variant={state.typo.stil === t ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, typo: { ...p.typo, stil: t } }))}
                      className={state.typo.stil === t ? "text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
                      style={state.typo.stil === t ? { backgroundColor: MOSAIK_PRIMARY } : {}}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </Section>
              <Section title="Details (optional)">
                <Input
                  placeholder="z. B. Großbuchstaben, weite Laufweite, runde Ecken"
                  value={state.typo.details}
                  onChange={(e) => setState((p) => ({ ...p, typo: { ...p.typo, details: e.target.value } }))}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
              </Section>

              {/* Hinzugefügter Prompt-Schritt am Ende */}
              <StepHeader step={total} total={total} title="Zusammenfassung & Prompt" subtitle="Kopieren & weiterverwenden" />
              
              <Section title="Live-Prompt (kompakt)">
                <Textarea rows={6} value={compactPrompt} readOnly className="font-mono bg-gray-900 border-gray-700 text-white" spellCheck={false} />
                <p className="text-xs text-gray-500">Hinweis: Vollständige Version unten – diese Kurzansicht ist zum schnellen Prüfen gedacht.</p>
              </Section>

              <Section title="Vollständiger Prompt">
                <Textarea rows={12} value={prompt} readOnly className="font-mono bg-gray-900 border-gray-700 text-white" spellCheck={false} />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={copyPrompt} className="text-white" style={{ backgroundColor: MOSAIK_PRIMARY }}>
                    <Copy className="h-4 w-4 mr-2" />
                    {/* FIX 1: Emojis entfernt */}
                    {copyMsg.includes("kopiert") ? "Kopiert!" : "In Zwischenablage kopieren"}
                  </Button>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">Nur Textausgabe – manuell in KI einfügen</Badge>
                </div>
                {copyMsg && (
                  <p className="text-xs text-gray-500 mt-1" role="status" aria-live="polite">
                    {copyMsg}
                  </p>
                )}
              </Section>
              
              <Section title="Nächste Schritte (Hinweis)">
                <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                  <li>Prompt in Ihr bevorzugtes Bild-KI-Tool einfügen (z. B. ChatGPT Vision oder Gemini).</li>
                  <li>Adjektive/Farben variieren und erneut generieren, bis das Ergebnis passt.</li>
                  <li>Für App-Icon/kleine Größen: Detailgrad gering halten, starke Kontraste.</li>
                </ul>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav / CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="px-5 py-6 border-gray-700 hover:bg-gray-700 text-gray-300 bg-gray-800">
            <ChevronLeft className="h-5 w-5 mr-2" />
            Zurück
          </Button>
          <div className="flex-1 text-center text-xs text-gray-500">Automatisch gespeichert</div>
          {step < total ? (
            <Button onClick={next} disabled={!canContinue} className="px-6 py-6 text-white" style={{ backgroundColor: MOSAIK_PRIMARY }}>
              Weiter
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-6 py-6 text-white" style={{ backgroundColor: MOSAIK_PRIMARY }}>
              <Check className="h-5 w-5 mr-2" />
              Fertig
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
/* ------------ Templates (unverändert, aber nicht mehr benutzt) ------------ */
const TEMPLATES = [
  {
    name: "Tech Startup",
    apply: (set) =>
      set((p) => ({
        ...p,
        meta: { ...p.meta, branche: "Software/Tech", beschreibung: "Cloud-basierte Produktivitäts-App" },
        zielgruppe: { ...p.zielgruppe, b2: "B2B", beschreibung: "KMU, 20–200 MA, digital-affin", usecases: "Website, App-Icon, Pitch-Deck" },
        werte: { ...p.werte, values: ["Innovation", "Qualität", "Transparenz"], persoenlichkeit: ["modern", "technisch", "freundlich"] },
        stil: { ...p.stil, logotyp: "Wort-Bild-Marke", adjektive: ["minimalistisch", "geometrisch", "professionell"], referenzen: "schlichte geometrische Formen" },
        farben: { ...p.farben, primary: "#0EA5E9", secondary: "#111827", verbot: "kein Neon" },
        typo: { ...p.typo, stil: "serifenlos modern", details: "Großbuchstaben, weite Laufweite" },
      })),
  },
  {
    name: "Bio/Food",
    apply: (set) =>
      set((p) => ({
        ...p,
        meta: { ...p.meta, branche: "Bio-Lebensmittel", beschreibung: "Regionale, nachhaltige Produkte" },
        zielgruppe: { ...p.zielgruppe, b2: "B2C", beschreibung: "Familien & gesundheitsbewusste Käufer", usecases: "Verpackung, Ladenbeschriftung, Social" },
        werte: { ...p.werte, values: ["Nachhaltigkeit", "Qualität", "Gemeinschaft"], persoenlichkeit: ["warm", "organisch", "bodenständig"] },
        stil: { ...p.stil, logotyp: "Emblem", adjektive: ["organisch", "freundlich", "vintage"], referenzen: "natürliche Formen" },
        farben: { ...p.farben, primary: "#2F855A", secondary: "#A3B18A", verbot: "keine Neonfarben" },
        typo: { ...p.typo, stil: "Serif klassisch", details: "runde Ecken" },
      })),
  },
  {
    name: "Finance/Legal",
    apply: (set) =>
      set((p) => ({
        ...p,
        meta: { ...p.meta, branche: "Finanzen/Jura", beschreibung: "Beratung & Vermögensverwaltung" },
        zielgruppe: { ...p.zielgruppe, b2: "B2B", beschreibung: "C-Level, Investoren", usecases: "Website, Briefkopf, Präsentationen" },
        werte: { ...p.werte, values: ["Vertrauen", "Stabilität", "Diskretion"], persoenlichkeit: ["seriös", "elegant", "minimalistisch"] },
        stil: { ...p.stil, logotyp: "Wortmarke", adjektive: ["elegant", "geometrisch", "zeitlos"], referenzen: "dezente Monogramm-Anmutung" },
        farben: { ...p.farben, primary: "#0B2447", secondary: "#576CBC", verbot: "keine grellen Farben" },
        typo: { ...p.typo, stil: "Serif klassisch", details: "feine Strichstärken, enge Laufweite" },
      })),
  },
];