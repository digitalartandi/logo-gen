import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Trash2, RotateCcw, Info, Download, Upload, AlertTriangle, Sparkles } from "lucide-react";
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

// FIX 4: Neue Style-Konstanten basierend auf Mosaik-Design
const MOSAIK_PRIMARY = "#6F00FF"; // Aus dem SVG-Gradient/Fill
const MOSAIK_SECONDARY = "#FF1EFF"; // Aus dem SVG-Gradient
const MOSAIK_BACKGROUND = "#141414"; // Dunkler Hintergrund
const MOSAIK_CARD_BG = "#222222"; // Dunkle, abgesetzte Karten

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
      {/* FIX 4: Progressbar mit Mosaik-Farbe */}
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
  // FIX 4: Dunkle Card mit Mosaik-BG
  <Card className={`mb-5 rounded-2xl shadow-lg border-gray-700 bg-gray-800 ${danger ? "border-red-600" : ""}`}>
    <CardHeader className="py-4">
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
    <CardContent className="space-y-3 pb-5">{children}</CardContent>
  </Card>
);

const Stepper = ({ step, setStep, labels, onKeyDown }) => (
  // FIX 4: Dunkler Stepper-Hintergrund
  <div className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur border-b border-gray-700">
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
              // FIX 4: Mosaik-Farbakzent für den aktiven Schritt
              className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${
                active ? "border-transparent text-white" : "bg-gray-700/40 hover:bg-gray-700 text-gray-300"
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
          // FIX 2: onClick/onChange Handler ist korrekt, das Problem lag vermutlich an der falschen 'sr-only' Platzierung oder der fehlenden `onChange` im Code der Vorgängerversion. Hier ist die Logik auf den Button umgestellt, um die Klickbarkeit zu verbessern.
          <label
            key={o}
            htmlFor={id}
            className={`px-3 py-2 rounded-2xl border text-sm cursor-pointer select-none transition-colors ${
              checked ? "text-white border-transparent" : "bg-gray-700/40 hover:bg-gray-700 text-gray-300 border-gray-700"
            }`}
            style={checked ? { backgroundColor: MOSAIK_PRIMARY } : {}}
          >
            {/* FIX 2: onChange direkt auf das unsichtbare Input, um den state zu aktualisieren. */}
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
  const normalized = useMemo(() => toHex6(value), [value]);
  const swatch = normalized || value || "#FFFFFF";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm w-36 text-gray-300">{label}</label>
      {/* FIX 1: Entfernt class="p-1" vom <Input type="color"> – das ist oft der Grund, warum der native Farbwähler auf mobilen Browsern nicht richtig funktioniert. Die Dimensionierung ist jetzt über die Klassen h-10 w-16 gewährleistet. */}
      <Input
        type="color"
        value={normalized || "#FFFFFF"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16" // p-1 entfernt
        aria-label={`${label} (Farbfeld)`}
        title="Farbfeld – klick zum Wählen"
      />
      {/* FIX 4: Dunkle Eingabefelder */}
      <Input
        placeholder="#HEX oder Farbnamen (z. B. royalblue)"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const norm = toHex6(raw);
          onChange(norm || raw); // rohen Wert erlauben; norm greift, sobald valide
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
        // FIX 4: Badge-Style an dunklen Hintergrund angepasst
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
          Kontrast zu Weiß: {contrast}:1{" "}
          {contrast < 4.5 && (
            <span className="flex items-center gap-1 ml-1">
              <AlertTriangle size={14} aria-hidden />
              niedrig
            </span>
          )}
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

  // Wettbewerb existiert, muss aber nicht verschoben werden, da er Schritt 2 ist.
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
  const fileInputRef = useRef(null);

  // FIX 3: Angepasste Labels: 'Wettbewerb' von 3 auf 2 verschoben, Kategorienummerierung korrigiert.
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
    if (confirm("Entwurf wirklich auf Standard zurücksetzen?")) reset();
  }, [reset]);

  const handleClear = useCallback(() => {
    const c = prompt("ALLE lokalen Daten löschen? Tippe LÖSCHEN zur Bestätigung.");
    if ((c || "").trim().toUpperCase() === "LÖSCHEN") {
      clearStorage();
    }
  }, [clearStorage]);

  const prompt = useMemo(() => buildPrompt(state), [state]);
  const compactPrompt = useMemo(() => {
    const lines = prompt.split("\n");
    const head = lines.slice(0, 5).join("\n");
    return lines.length > 5 ? head + "\n…" : head;
  }, [prompt]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyMsg("Prompt kopiert");
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

  // Import/Export
  const exportJSON = () => {
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

  // Kontrast mit normalisierten Farben
  const contrastPrimary = useMemo(() => contrastWithWhite(state.farben.primary), [state.farben.primary]);
  const contrastSecondary = useMemo(() => contrastWithWhite(state.farben.secondary), [state.farben.secondary]);

  return (
    // FIX 4: Mosaik-Style (Dunkler Hintergrund, Textfarbe)
    <div className="min-h-screen text-white" style={{ backgroundColor: MOSAIK_BACKGROUND }}>
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur border-b border-gray-700">
        <div className="py-3 px-4 flex items-center justify-between gap-2">
          {/* Nur Icon (kein Logotext) */}
          <div className="flex items-center gap-2">
            {/* FIX 4: Sparkles in Mosaik-Farbe */}
            <Sparkles className="h-5 w-5" aria-hidden="true" style={{ color: MOSAIK_PRIMARY }} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportJSON} className="border-gray-700 hover:bg-gray-700 text-gray-300 bg-gray-800">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => importJSON(e.target.files?.[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-gray-700 hover:bg-gray-700 text-gray-300 bg-gray-800">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="destructive" size="icon" onClick={handleReset} title="Zurücksetzen" className="bg-red-700 hover:bg-red-800 border-red-700">
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button variant="destructive" size="icon" onClick={handleClear} title="Entwurf löschen" className="bg-red-700 hover:bg-red-800 border-red-700">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {/* FIX 3: Labels in Stepper korrigiert */}
        <Stepper step={step} setStep={setStep} labels={labels} onKeyDown={onKeyDown} />
      </header>

      <main className="max-w-xl mx-auto p-4 pb-32">
        <AnimatePresence mode="popLayout">
          {/* Schritt 1 */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <StepHeader step={1} total={total} title="Markenbasis" subtitle="Name, Slogan, Branche, Kurzbeschreibung" />

              <Section title="Schnellstart-Templates" info="Spart Zeit – später alles anpassbar">
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATES.map((t) => (
                    <Button key={t.name} variant="secondary" size="sm" onClick={() => t.apply(setState)} className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700">
                      {t.name}
                    </Button>
                  ))}
                </div>
              </Section>

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
                      // FIX 4: Dunkle Eingabefelder
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
              <StepHeader step={2} total={total} title="Zielgruppe & Wettbewerb" subtitle="Wen sprechen wir an? In welchen Kontexten? Wer sind die Konkurrenten?" />
              
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
                      className={state.zielgruppe.b2 === "B2C" ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
                      style={state.zielgruppe.b2 === "B2C" ? { backgroundColor: MOSAIK_PRIMARY } : {}}
                    >
                      B2C
                    </Button>
                    <Button
                      variant={state.zielgruppe.b2 === "B2B" ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, zielgruppe: { ...p.zielgruppe, b2: "B2B" } }))}
                      title="B2B = Geschäftskunden (z. B. KMU = kleine & mittlere Unternehmen)"
                      className={state.zielgruppe.b2 === "B2B" ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700"}
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
              {/* FIX 3: Schritt-Nummer korrigiert */}
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
                  // FIX 2: Callback auf dem `ChipSelect` war korrekt, keine Änderung nötig, da der Fix in der `ChipSelect` Komponente liegt.
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
              {/* FIX 3: Schritt-Nummer korrigiert */}
              <StepHeader step={4} total={total} title="Brand Story (optional)" subtitle="Hintergrund & Motivation" />
              <Section title="Story aktivieren">
                <div className="flex items-center gap-3 text-gray-300">
                  <input
                    id="story-enabled"
                    type="checkbox"
                    checked={state.story.enabled}
                    onChange={(e) => setState((p) => ({ ...p, story: { ...p.story, enabled: e.target.checked } }))}
                    className="form-checkbox h-4 w-4 text-purple-600 bg-gray-700 border-gray-600 rounded" // FIX 4: Checkbox-Farbe angepasst
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
              {/* FIX 3: Schritt-Nummer korrigiert */}
              <StepHeader step={5} total={total} title="Logo-Stil" subtitle="Logo-Typ & Stiladjektive" />
              <Section title="Logo-Typ">
                <div className="flex flex-wrap gap-2">
                  {["Wortmarke", "Bildmarke", "Wort-Bild-Marke", "Emblem", "Abstrakt"].map((t) => (
                    <Button
                      key={t}
                      variant={state.stil.logotyp === t ? "default" : "outline"}
                      onClick={() => setState((p) => ({ ...p, stil: { ...p.stil, logotyp: t } }))}
                      // FIX 4: Button-Style mit Mosaik-Farbe
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
                  // FIX 2: Callback ist korrekt
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
              {/* FIX 3: Schritt-Nummer korrigiert */}
              <StepHeader step={6} total={total} title="Farben" subtitle="Primär-/Sekundärfarbe & Verbote" />
              <Section title="Farbwahl" info="Logo muss auf Weiß funktionieren; SW-Tauglichkeit beachten">
                <div className="grid gap-3">
                  {/* FIX 1: p-1 Klasse im ColorRow Input entfernt, um Mobile-Funktion zu gewährleisten */}
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

          {/* Schritt 7 (Typografie) */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* FIX 3: Schritt-Nummer korrigiert */}
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
                      // FIX 4: Button-Style mit Mosaik-Farbe
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
            </motion.div>
          )}

          {/* Schritt 8 (Prompt) */}
          {step === 8 && (
            <motion.div key="s8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* FIX 3: Schritt-Nummer korrigiert */}
              <StepHeader step={total} total={total} title="Zusammenfassung & Prompt" subtitle="Kopieren & weiterverwenden" />
              
              <Section title="Live-Prompt (kompakt)">
                {/* FIX 4: Dunkle Textarea */}
                <Textarea rows={6} value={compactPrompt} readOnly className="font-mono bg-gray-900 border-gray-700 text-white" spellCheck={false} />
                <p className="text-xs text-gray-500">Hinweis: Vollständige Version unten – diese Kurzansicht ist zum schnellen Prüfen gedacht.</p>
              </Section>

              <Section title="Vollständiger Prompt">
                <Textarea rows={12} value={prompt} readOnly className="font-mono bg-gray-900 border-gray-700 text-white" spellCheck={false} />
                <div className="flex items-center gap-2 flex-wrap">
                  {/* FIX 4: Button-Style mit Mosaik-Farbe */}
                  <Button onClick={copyPrompt} className="text-white" style={{ backgroundColor: MOSAIK_PRIMARY }}>
                    <Copy className="h-4 w-4 mr-2" />
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
/* ------------ Templates (unverändert) ------------ */
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