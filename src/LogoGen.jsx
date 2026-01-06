import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, ChevronLeft, ChevronRight, Copy, Trash2, RotateCcw, 
  Info, Download, Upload, MoreVertical, Sparkles, Palette, 
  Type, Target, Layers, FileText 
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Badge } from "./ui";

/* ------------ Logic: Semantic Mappings (The "Brain") ------------ */

// Übersetzt einfache Adjektive in präzise Design-Instruktionen für High-End KIs
const DESIGN_MAPPINGS = {
  // Persönlichkeit & Stil
  "minimalistisch": "use negative space, reduce to essential lines, clean geometry, 'less is more' approach",
  "elegant": "fine lines, high contrast, sophisticated balance, serif nuances, luxury aesthetic",
  "verspielt": "organic shapes, dynamic composition, joyful curves, friendly geometry, approachable",
  "futuristisch": "tech-forward, motion lines, cyber-aesthetic, neon-accents, progressive forms",
  "vintage": "retro-texture hints, classic badges, timeless typography, heritage feel",
  "technisch": "precise grids, nodes, circuit-inspired, architectural lines, structured",
  "organisch": "natural flowing lines, leaf/nature motifs, asymmetry, soft edges",
  "geometrisch": "sacred geometry, bauhaus influence, mathematical precision, sharp angles",
  "präzise": "exact grid alignment, sharp execution, professional engineering look",
  "souverän": "bold strokes, stable base, centered composition, authority",
  "ikonisch": "memorable silhouette, apple-like simplicity, works at 16x16px",
  "zeitlos": "avoid trends, classic proportions, golden ratio construction",
  "progressiv": "forward momentum, italicized motion, arrow motifs, upward trends",
  "monochrom": "strong black/white balance, stencil capability, high ink density",
  "matt": "soft muted finish, sophisticated subtlety",
  "hochglänzend": "implies premium finish, liquid surfaces (translated to vector style)",
  "modern": "sans-serif priority, current zeitgeist, flat design 2.0",
  "freundlich": "approachable, rounded terminals, warm vibe, smiling curves",
  "seriös": "structured, stable, trust-inducing, dark blue/grey undertones implication",
  "luxuriös": "gold/silver implication, lots of breathing room (whitespace), elite feel",
  "bodenständig": "heavy weights, solid foundation, earthy connection",
  "kreativ": "unexpected juxtaposition, clever negative space usage, artistic flair",
  
  // Werte
  "Vertrauen": "shield or pillar motifs, symmetry, stable blue/grey psychology",
  "Qualität": "seal-like precision, star motifs, diamond sharpness",
  "Innovation": "lightbulb abstraction, spark, upward arrow, rocket abstraction",
  "Nachhaltigkeit": "leaf, cycle, earth, infinite loop, green psychology",
  "Premium": "crown, diamond, crest, serif typography",
  "Mut": "lion, fire, bold thick lines, high impact",
  "Transparenz": "overlapping shapes, glass-like opacity (vectorized), open circles",
  "Effizienz": "speed lines, checkmarks, direct paths, minimal clutter"
};

const LOGOTYPE_MAPPINGS = {
  "Wortmarke": "Logotype only. Focus on custom typography, kerning, and unique letter modification. No separate icon.",
  "Bildmarke": "Logomark only. A standalone symbol or icon without text. Strong visual metaphor.",
  "Wort-Bild": "Combination Mark. A balanced pairing of a symbol/icon and the brand name typography.",
  "Emblem": "Emblem style. Text contained inside a shape/badge. Starbucks or crest style.",
  "Abstrakt": "Abstract mark. Non-literal shape representing the brand feelings through geometry."
};

/* ------------ Utils & Config ------------ */

const STORAGE_KEY = "mosaik-logo-state-pro-v2-smart"; // Neuer Key für neue Logik
const PRIMARY_COLOR = "#6F00FF";

const vibrate = (pattern = 10) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
};

const BRANCHEN = [
  "Software/Tech", "Finanzen/Jura", "Gesundheit/Medizin", "Bio-Lebensmittel",
  "Gastronomie/Hotel", "Einzelhandel/E-Commerce", "Bildung", "Sport/Fitness",
  "Mode/Beauty", "Architektur/Bau", "Immobilien", "Automotive/Mobilität",
  "Kreativ/Agentur", "Non-Profit", "Medien/Entertainment", "Reisen/Tourismus",
  "Industrie/Produktion", "Energie/GreenTech", "Logistik", "Sonstige (Freitext)",
];

const debounce = (fn, wait = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const toHex6 = (val) => {
  const s = String(val || "").trim();
  if (!s) return null;
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const m = s.match(/^#([0-9a-f]{3})$/i)[1];
    return ("#" + m[0] + m[0] + m[1] + m[1] + m[2] + m[2]).toUpperCase();
  }
  try {
    const d = document.createElement("span");
    d.style.color = s;
    const rgb = getComputedStyle(d).color;
    const m2 = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!m2) return null;
    const to2 = (n) => Number(n).toString(16).padStart(2, "0");
    return ("#" + to2(m2[1]) + to2(m2[2]) + to2(m2[3])).toUpperCase();
  } catch { return null; }
};

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
    const L2 = 1; 
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return Number(ratio.toFixed(2));
  } catch { return null; }
};

/* ------------ State Management ------------ */

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
    } catch { return defaultState; }
  });

  useEffect(() => {
    const save = debounce((s) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
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

/* ------------ Components (Visuals Unchanged) ------------ */

const MosaikLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372.017 78.581" className="h-6 w-auto">
        <defs>
            <linearGradient id="a" x1="0" x2="230" y1="180" y2="180" gradientTransform="matrix(.26458 0 0 .26458 -111.359 97.351)" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6F00FF"/>
                <stop offset=".5" stopColor="#6F00FF"/>
                <stop offset="1" stopColor="#FF1EFF"/>
            </linearGradient>
        </defs>
        <path fill="url(#a)" d="M-81.08 114.55h.292c.298 3.503 1.103 6.855 2.441 10.011l.007.017.008.017c1.778 4.052 4.183 7.602 7.18 10.6 3 2.997 6.548 5.403 10.6 7.181l.017.007.017.007c3.157 1.339 6.51 2.144 10.013 2.442v.292c-3.509.308-6.868 1.141-10.028 2.526-4.06 1.724-7.616 4.105-10.618 7.107-2.997 2.997-5.403 6.547-7.181 10.6l-.008.016-.007.017c-1.338 3.157-2.143 6.509-2.44 10.012h-.293c-.308-3.51-1.141-6.868-2.527-10.029l-.003-.006c-1.668-3.93-3.955-7.389-6.823-10.328l-.007-.007-.266-.27-.006-.006c-3.001-3-6.558-5.382-10.617-7.105l-.002-.001c-3.16-1.386-6.518-2.219-10.028-2.527v-.292c3.505-.297 6.856-1.103 10.013-2.441l.017-.007.018-.007c4.052-1.779 7.602-4.184 10.599-7.181 3-3.002 5.382-6.558 7.105-10.617 1.386-3.16 2.22-6.52 2.527-10.03z" transform="translate(111.359 -114.02)"/>
        <path fill="#fff" d="M-6.769 114.02v23.733c1.905-2.222 5.398-4.445 11.113-4.445 10.636 0 17.938 8.89 17.938 20.955 0 12.065-7.302 20.876-17.938 20.876-5.795 0-9.684-2.382-11.827-5.239l-.556 4.445h-10.477V114.02zm8.255 29.527c-4.048 0-6.588 2.144-8.255 5.08V159.9c1.667 2.857 4.207 5 8.255 5 5.318 0 8.97-4.048 8.97-10.636 0-6.588-3.652-10.716-8.97-10.716zm50.834-10.239v11.668h-1.032c-4.683 0-7.7 2.302-10.001 5.318v24.051H29.539v-40.243h10.478l.714 5.318c1.984-3.334 5.953-6.112 11.589-6.112zm21.217 0c5.715 0 9.445 2.381 11.51 5.318l.555-4.524h10.557v40.243H85.602l-.556-4.445c-2.064 2.857-5.794 5.239-11.51 5.239-10.556 0-17.7-8.81-17.7-20.876 0-12.065 7.144-20.955 17.7-20.955zm2.857 10.24c-5.159 0-8.652 4.127-8.652 10.715 0 6.588 3.493 10.636 8.652 10.636 3.97 0 6.271-2.143 8.017-5v-11.35c-1.746-2.858-4.048-5.002-8.017-5.002zm51.883-10.24c9.842 0 15.16 6.985 15.16 17.86v23.177H131.69v-22.543c0-4.445-2.461-7.46-6.588-7.46-3.572 0-6.033 2.301-7.541 4.682v25.321h-11.748v-40.243h10.557l.556 4.445c1.984-2.937 5.874-5.239 11.35-5.239zm62.772-19.288v60.325h-10.556l-.556-4.445c-2.064 2.857-6.033 5.239-11.748 5.239-10.715 0-18.017-8.81-18.017-20.876 0-12.065 7.302-20.955 18.017-20.955 5.715 0 9.208 2.223 11.113 4.445V114.02zm-20.002 29.527c-5.318 0-8.97 4.128-8.97 10.716 0 6.588 3.652 10.636 8.97 10.636 3.969 0 6.509-2.143 8.255-5v-11.272c-1.746-2.936-4.286-5.08-8.255-5.08zm35.674-29.05c3.968 0 6.905 2.936 6.905 6.905 0 3.969-2.937 6.905-6.905 6.905-3.97 0-6.827-2.936-6.827-6.905 0-3.969 2.858-6.906 6.827-6.906zm5.873 19.605v40.243h-11.747v-40.243zm25.205-.794c5.715 0 9.683 2.381 11.747 5.318l.556-4.524h10.557v58.5H248.91v-21.908c-1.905 2.222-5.397 4.445-11.112 4.445-10.716 0-18.018-8.81-18.018-20.876 0-12.065 7.302-20.955 18.018-20.955zm2.857 10.24c-5.318 0-8.97 4.127-8.97 10.715s3.652 10.636 8.97 10.636c3.969 0 6.509-2.143 8.255-5v-11.35c-1.746-2.858-4.286-5.002-8.255-5.002z" transform="translate(111.359 -114.02)"/>
    </svg>
);

const ChipSelect = ({ options, values, onChange }) => {
  const selected = new Set(values || []);
  const toggle = useCallback((val) => {
    vibrate();
    const s = new Set(selected);
    s.has(val) ? s.delete(val) : s.add(val);
    onChange(Array.from(s));
  }, [selected, onChange]);

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const checked = selected.has(o);
        return (
          <motion.button
            key={o}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggle(o)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              checked 
                ? "bg-[#6F00FF] border-[#6F00FF] text-white shadow-[0_0_15px_-3px_rgba(111,0,255,0.6)]" 
                : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:bg-[#252525] hover:text-white"
            }`}
          >
            {o}
          </motion.button>
        );
      })}
    </div>
  );
};

const ColorRow = ({ label, value, onChange, contrast }) => {
  const normalized = useMemo(() => toHex6(value), [value]);
  const swatch = normalized || value || "#FFFFFF";

  return (
    <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {Number.isFinite(contrast) && (
          <Badge variant={contrast >= 4.5 ? "success" : contrast >= 3 ? "secondary" : "destructive"}>
            {contrast}:1
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-inner border border-white/10">
           <input
            type="color"
            value={normalized || "#FFFFFF"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute -top-2 -left-2 w-20 h-20 p-0 m-0 border-0 cursor-pointer opacity-0" 
          />
          <div className="w-full h-full" style={{ backgroundColor: swatch }} />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(toHex6(e.target.value) || e.target.value)}
          placeholder="#HEX"
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
};

/* ------------ ULTRA-SMART PROMPT BUILDER (Next-Gen AI Optimized) ------------ */
// Dieser Builder nutzt Chain-of-Thought Struktur für GPT-5/Gemini 3

const ALL_STIL_ADJEKTIVE = Object.keys(DESIGN_MAPPINGS);

function buildPrompt(s) {
  // 1. Kontext & Rolle
  const parts = [
    `# Role: Expert Brand Identity Designer`,
    `# Task: Create a high-end, vector-based logo.`,
    `---`,
    `## 1. BRAND CONTEXT`
  ];

  // Daten aufbereiten
  const name = s.meta.name?.trim() || "[Markenname]";
  const branche = (s.meta.branche === "Sonstige (Freitext)" ? s.meta.brancheOther : s.meta.branche) || "General Business";
  
  parts.push(`Name: "${name}"`);
  if (s.meta.slogan) parts.push(`Slogan: "${s.meta.slogan}" (Integrate only if legible, otherwise ignore)`);
  parts.push(`Industry: ${branche}`);
  if (s.meta.beschreibung) parts.push(`Context: ${s.meta.beschreibung}`);

  const audience = [s.zielgruppe.b2, s.zielgruppe.beschreibung].filter(Boolean).join(", ");
  if (audience) parts.push(`Target Audience: ${audience}`);
  
  // 2. Semantische Synthese (Der "Smart"-Teil)
  parts.push(``);
  parts.push(`## 2. DESIGN STRATEGY (SEMANTIC TRANSLATION)`);
  
  // Werte übersetzen
  if (s.werte.values?.length) {
    const valueInstructions = s.werte.values.map(v => DESIGN_MAPPINGS[v] || v).join("; ");
    parts.push(`Core Values Visualized: ${valueInstructions}`);
  }
  
  // Persönlichkeit übersetzen
  if (s.werte.persoenlichkeit?.length) {
    const persInstructions = s.werte.persoenlichkeit.map(p => DESIGN_MAPPINGS[p] || p).join("; ");
    parts.push(`Personality & Vibe: ${persInstructions}`);
  }

  if (s.wettbewerb.differenzierung) parts.push(`Differentiation/USP: ${s.wettbewerb.differenzierung}`);

  // 3. Technische Konstruktion
  parts.push(``);
  parts.push(`## 3. VISUAL CONSTRUCTION`);
  
  const logotypeInst = LOGOTYPE_MAPPINGS[s.stil.logotyp] || "Logomark and typography balanced.";
  parts.push(`Logo Type: ${s.stil.logotyp} -> ${logotypeInst}`);
  
  if (s.stil.adjektive?.length) {
    const styleDeep = s.stil.adjektive.map(a => DESIGN_MAPPINGS[a] || a).join(" + ");
    parts.push(`Aesthetic Direction: ${styleDeep}`);
  }
  
  if (s.story.enabled && s.story.text) parts.push(`Story Inspiration: "${s.story.text}"`);

  // Farben mit technischer Anweisung
  const colors = [];
  if (s.farben.primary) colors.push(`Primary: ${toHex6(s.farben.primary) || s.farben.primary}`);
  if (s.farben.secondary) colors.push(`Secondary: ${toHex6(s.farben.secondary) || s.farben.secondary}`);
  if (colors.length) {
    parts.push(`Color Palette: ${colors.join(", ")}`);
    parts.push(`Color Usage: Use flat colors, no gradients unless specified futuristic.`);
  }
  if (s.farben.verbot) parts.push(`Negative Constraint (Avoid): ${s.farben.verbot}`);

  // Typo
  if (s.typo.stil) parts.push(`Typography Style: ${s.typo.stil} ${s.typo.details ? `(${s.typo.details})` : ""}`);

  // 4. Output Parameter (Vector Guard)
  parts.push(``);
  parts.push(`## 4. OUTPUT PARAMETERS (CRITICAL)`);
  parts.push(`- Format: Flat Vector Graphic (SVG style)`);
  parts.push(`- Background: Pure White (#FFFFFF) - No shadows, no wall textures, no mockups.`);
  parts.push(`- Detail Level: Medium to Low (Must be scalable to favicon size).`);
  parts.push(`- Composition: Professional, geometrically balanced, centered.`);
  parts.push(`- No photo-realistic rendering. No 3D bevels.`);

  // Midjourney spezifisch (optional, aber gut für V6)
  parts.push(``);
  parts.push(`--no realistic photo 3d mockup shadow detail noise text-clutter`);
  parts.push(`--v 6.0 --style raw`);
  
  return parts.join("\n");
}

/* ------------ Main Application ------------ */

const STEPS = [
  { id: 1, icon: Layers, label: "Basis" },
  { id: 2, icon: Target, label: "Zielgruppe" },
  { id: 3, icon: Sparkles, label: "Werte" },
  { id: 4, icon: FileText, label: "Story" },
  { id: 5, icon: Palette, label: "Stil" },
  { id: 6, icon: Palette, label: "Farben" }, 
  { id: 7, icon: Type, label: "Typo & Finish" },
];

export default function LogoGen() {
  const { state, setState, reset, clearStorage } = usePersistentState();
  const [step, setStep] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const fileInputRef = useRef(null);
  
  const total = STEPS.length;
  const currentStepInfo = STEPS[step - 1];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const handleNext = () => {
    if (step < total) {
      vibrate();
      setStep(s => s + 1);
    }
  };
  
  const handlePrev = () => {
    if (step > 1) {
      vibrate();
      setStep(s => s - 1);
    }
  };

  const copyPrompt = async () => {
    vibrate(20);
    const text = buildPrompt(state);
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Kopiert!");
    } catch {
      setCopyMsg("Fehler");
    }
    setTimeout(() => setCopyMsg(""), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mosaik-logo-${Date.now()}.json`;
    a.click();
    setShowMenu(false);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setState(JSON.parse(e.target.result));
        setShowMenu(false);
      } catch {}
    };
    reader.readAsText(file);
  };

  const canContinue = useMemo(() => {
    if (step === 1) return state.meta.name.trim().length > 1 && state.meta.branche;
    return true;
  }, [step, state]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#6F00FF] selection:text-white pb-32">
      
      {/* --- Header (Glass Sticky) --- */}
      <header className="fixed top-0 inset-x-0 z-50 glass-sticky transition-all duration-300">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
            <MosaikLogo />
            
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => { vibrate(); setShowMenu(!showMenu); }}>
                <MoreVertical className="w-6 h-6 text-gray-400" />
              </Button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-12 w-48 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1 flex flex-col gap-1"
                  >
                    <Button variant="ghost" size="sm" onClick={handleExport} className="justify-start w-full text-gray-300">
                      <Download size={14} className="mr-2"/> Export
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current.click()} className="justify-start w-full text-gray-300">
                      <Upload size={14} className="mr-2"/> Import
                    </Button>
                    <div className="h-px bg-white/10 my-1"/>
                    <Button variant="ghost" size="sm" onClick={() => { if(confirm("Reset?")) reset(); setShowMenu(false); }} className="justify-start w-full text-red-400 hover:text-red-300">
                      <RotateCcw size={14} className="mr-2"/> Reset
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => importJSON(e.target.files?.[0])} accept=".json"/>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-gray-800 w-full">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#6F00FF] to-[#FF1EFF]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="max-w-xl mx-auto pt-24 px-5">
        
        {/* Step Title Area */}
        <div className="mb-8">
          <motion.div 
            key={currentStepInfo.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[#6F00FF] mb-2 font-medium text-sm tracking-wider uppercase"
          >
            <currentStepInfo.icon size={16} />
            <span>Schritt {step}/{total}</span>
          </motion.div>
          <motion.h1 
            key={`h1-${step}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400"
          >
            {currentStepInfo.label}
          </motion.h1>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle>Markenidentität</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Name der Marke*</label>
                    <Input 
                      placeholder="z.B. Mosaik" 
                      value={state.meta.name}
                      onChange={e => setState(p => ({...p, meta: {...p.meta, name: e.target.value}}))}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Branche*</label>
                    <select 
                      className="w-full bg-[#1A1A1A] text-white rounded-xl border border-white/10 px-4 py-3.5 appearance-none focus:border-[#6F00FF] focus:ring-1 focus:ring-[#6F00FF] outline-none transition-all"
                      value={state.meta.branche}
                      onChange={e => setState(p => ({...p, meta: {...p.meta, branche: e.target.value}}))}
                    >
                      <option value="" disabled>Bitte wählen...</option>
                      {BRANCHEN.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  {state.meta.branche === "Sonstige (Freitext)" && (
                     <Input placeholder="Welche Branche genau?" value={state.meta.brancheOther} onChange={e => setState(p => ({...p, meta: {...p.meta, brancheOther: e.target.value}}))} />
                  )}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Claim / Slogan</label>
                    <Input placeholder="Optional" value={state.meta.slogan} onChange={e => setState(p => ({...p, meta: {...p.meta, slogan: e.target.value}}))} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Kurzbeschreibung</label>
                    <Textarea placeholder="Was macht das Unternehmen einzigartig?" value={state.meta.beschreibung} onChange={e => setState(p => ({...p, meta: {...p.meta, beschreibung: e.target.value}}))} />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <>
                <Card>
                  <CardHeader><CardTitle>Fokusgruppe</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      {["B2C", "B2B"].map(type => (
                        <button
                          key={type}
                          onClick={() => { vibrate(); setState(p => ({...p, zielgruppe: {...p.zielgruppe, b2: type}})); }}
                          className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            state.zielgruppe.b2 === type 
                            ? "bg-[#6F00FF] border-[#6F00FF] text-white shadow-lg shadow-purple-900/40" 
                            : "bg-[#1A1A1A] border-white/10 text-gray-400"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <Textarea placeholder="Wer sind die Kunden? (Alter, Job, Interessen)" value={state.zielgruppe.beschreibung} onChange={e => setState(p => ({...p, zielgruppe: {...p.zielgruppe, beschreibung: e.target.value}}))} />
                    <Input placeholder="Use-Cases (App, Web, Print...)" value={state.zielgruppe.usecases} onChange={e => setState(p => ({...p, zielgruppe: {...p.zielgruppe, usecases: e.target.value}}))} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Wettbewerb & USP</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea placeholder="Wie unterscheidet ihr euch von der Konkurrenz?" value={state.wettbewerb.differenzierung} onChange={e => setState(p => ({...p, wettbewerb: {...p.wettbewerb, differenzierung: e.target.value}}))} />
                  </CardContent>
                </Card>
              </>
            )}

            {step === 3 && (
              <Card>
                <CardHeader><CardTitle>Markenkern</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 block mb-3">Werte (Max 5)</label>
                    <ChipSelect 
                      options={["Vertrauen", "Qualität", "Innovation", "Nachhaltigkeit", "Premium", "Mut", "Transparenz", "Effizienz"]} 
                      values={state.werte.values} 
                      onChange={v => setState(p => ({...p, werte: {...p.werte, values: v}}))} 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-3">Persönlichkeit</label>
                    <ChipSelect 
                      options={["modern", "freundlich", "seriös", "verspielt", "luxuriös", "bodenständig", "kreativ", "technisch"]} 
                      values={state.werte.persoenlichkeit} 
                      onChange={v => setState(p => ({...p, werte: {...p.werte, persoenlichkeit: v}}))} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader><CardTitle>Brand Story</CardTitle></CardHeader>
                <CardContent>
                   <div className="flex items-center justify-between mb-4 bg-white/5 p-3 rounded-xl">
                      <span className="text-sm font-medium">Story-Modus aktivieren</span>
                      <button 
                        onClick={() => setState(p => ({...p, story: {...p.story, enabled: !p.story.enabled}}))}
                        className={`w-12 h-7 rounded-full transition-colors relative ${state.story.enabled ? "bg-[#6F00FF]" : "bg-gray-700"}`}
                      >
                        <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-transform ${state.story.enabled ? "translate-x-5" : ""}`} />
                      </button>
                   </div>
                   {state.story.enabled && (
                     <Textarea 
                       placeholder="Erzähle kurz die Vision oder den Ursprung der Marke..." 
                       className="min-h-[150px]"
                       value={state.story.text}
                       onChange={e => setState(p => ({...p, story: {...p.story, text: e.target.value}}))}
                     />
                   )}
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader><CardTitle>Design-Richtung</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 block mb-3">Logotyp</label>
                    <div className="grid grid-cols-2 gap-2">
                       {Object.keys(LOGOTYPE_MAPPINGS).map(t => (
                         <Button 
                            key={t} 
                            variant={state.stil.logotyp === t ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setState(p => ({...p, stil: {...p.stil, logotyp: t}}))}
                          >
                            {t}
                          </Button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-3">Visuelle Adjektive</label>
                    <ChipSelect 
                      options={ALL_STIL_ADJEKTIVE} 
                      values={state.stil.adjektive} 
                      onChange={v => setState(p => ({...p, stil: {...p.stil, adjektive: v}}))} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 6 && (
              <Card>
                <CardHeader><CardTitle>Farbwelt</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ColorRow 
                    label="Primärfarbe" 
                    value={state.farben.primary} 
                    onChange={v => setState(p => ({...p, farben: {...p.farben, primary: v}}))} 
                    contrast={contrastWithWhite(state.farben.primary)}
                  />
                  <ColorRow 
                    label="Sekundärfarbe" 
                    value={state.farben.secondary} 
                    onChange={v => setState(p => ({...p, farben: {...p.farben, secondary: v}}))} 
                    contrast={contrastWithWhite(state.farben.secondary)}
                  />
                  <div>
                     <label className="text-sm text-gray-400 block mb-1.5">No-Gos (z.B. kein Pink)</label>
                     <Input value={state.farben.verbot} onChange={e => setState(p => ({...p, farben: {...p.farben, verbot: e.target.value}}))} />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <Card>
                   <CardHeader><CardTitle>Typografie</CardTitle></CardHeader>
                   <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {["Serifenlos", "Serif", "Tech/Mono", "Handwritten", "Display"].map(t => (
                          <Button key={t} size="sm" variant={state.typo.stil === t ? "default" : "outline"} onClick={() => setState(p => ({...p, typo: {...p.typo, stil: t}}))}>{t}</Button>
                        ))}
                      </div>
                      <Input placeholder="Details (z.B. fett, kursiv...)" value={state.typo.details} onChange={e => setState(p => ({...p, typo: {...p.typo, details: e.target.value}}))} />
                   </CardContent>
                </Card>

                <Card className="border-[#6F00FF]/50 shadow-[0_0_30px_-10px_rgba(111,0,255,0.3)]">
                  <CardHeader className="bg-gradient-to-r from-[#6F00FF]/10 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="text-[#6F00FF]" size={18}/> High-End Prompt (GPT-5/Gemini-3)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm text-gray-300 max-h-60 overflow-y-auto mb-4 whitespace-pre-wrap">
                      {buildPrompt(state)}
                    </div>
                    <Button onClick={copyPrompt} className="w-full h-12 text-base font-semibold shadow-xl shadow-purple-900/20">
                      <Copy className="mr-2" size={18} />
                      {copyMsg || "Prompt kopieren"}
                    </Button>
                    <p className="text-center text-xs text-gray-500 mt-3">
                      Optimiert für maximale Vektor-Qualität & Design-Verständnis.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* --- Sticky Bottom Nav (Safe Area Aware) --- */}
      <div className="fixed bottom-0 inset-x-0 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-40">
        <div className="max-w-xl mx-auto p-4 flex gap-4">
          <Button 
            variant="ghost" 
            onClick={handlePrev} 
            disabled={step === 1} 
            className="flex-1 h-14 rounded-2xl border border-white/10 hover:bg-white/5"
          >
            <ChevronLeft className="mr-1" /> Zurück
          </Button>
          
          <Button 
            onClick={step === total ? () => window.scrollTo({top:0, behavior:"smooth"}) : handleNext} 
            disabled={!canContinue} 
            className="flex-[2] h-14 rounded-2xl text-base font-semibold shadow-lg shadow-purple-900/30"
          >
            {step === total ? (
              <>Fertig <Check className="ml-2" /></>
            ) : (
              <>Weiter <ChevronRight className="ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
