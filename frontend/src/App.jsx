import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

/* =========================================================================
   SUPPLYSHIELD — Autonomous Exception Resolution for Enterprise Supply Chains
   React control-room frontend backed by the SupplyShield FastAPI API. The UI
   keeps local presentation state, while incident/recovery facts come from the backend.
   ========================================================================= */

/* ---------------------------------- DATA ---------------------------------- */

const AGENTS_INIT = [
  { id: "command", name: "Command Agent", role: "Orchestration", status: "idle", task: "Awaiting event", tool: "—", lastAction: "System initialized", confidence: null, permissions: ["delegate", "authorize_low_risk"] },
  { id: "inventory", name: "Inventory Agent", role: "Inventory Analysis", status: "idle", task: "Monitoring SKU levels", tool: "get_inventory", lastAction: "Baseline sync complete", confidence: null, permissions: ["read_inventory"] },
  { id: "shipment", name: "Shipment Agent", role: "Shipment Analysis", status: "idle", task: "Monitoring shipment disruptions", tool: "get_shipment_risk", lastAction: "Baseline sync complete", confidence: null, permissions: ["read_shipments"] },
  { id: "supplier", name: "Supplier Agent", role: "Supplier Sourcing", status: "idle", task: "Monitoring supplier network", tool: "search_suppliers", lastAction: "Network sync complete", confidence: null, permissions: ["read_suppliers", "request_quote"] },
  { id: "risk", name: "Risk Agent", role: "Risk Modeling", status: "idle", task: "Monitoring risk signals", tool: "score_risk", lastAction: "Baseline risk computed", confidence: null, permissions: ["read_all"] },
  { id: "finance", name: "Finance Agent", role: "Budget & Policy", status: "idle", task: "Monitoring emergency budget", tool: "check_budget", lastAction: "Budget baseline confirmed", confidence: null, permissions: ["read_budget", "approve_under_threshold"] },
  { id: "logistics", name: "Logistics Agent", role: "Routing & Transport", status: "idle", task: "Monitoring active routes", tool: "evaluate_routes", lastAction: "Route table synced", confidence: null, permissions: ["read_routes", "select_route"] },
  { id: "procurement", name: "Procurement Agent", role: "Purchase Execution", status: "idle", task: "Monitoring open requests", tool: "create_purchase_order", lastAction: "Queue clear", confidence: null, permissions: ["create_po_under_threshold"] },
];

const INVENTORY_INIT = [
  { sku: "PHARMA-001", product: "Temperature Sensitive API", warehouse: "Rotterdam DC-1", qty: 4000, dailyDemand: 1000, safetyStock: 2000, criticality: "Critical", incident: "INC-2026-0841" },
  { sku: "PHARMA-014", product: "Excipient Blend C", warehouse: "Rotterdam DC-1", qty: 18000, dailyDemand: 600, safetyStock: 4000, criticality: "Medium", incident: null },
  { sku: "PACK-220", product: "Cold-Chain Packaging Kit", warehouse: "Antwerp DC-2", qty: 9200, dailyDemand: 450, safetyStock: 1500, criticality: "Low", incident: null },
  { sku: "PHARMA-007", product: "Stabilizer Compound", warehouse: "Mumbai DC-3", qty: 26000, dailyDemand: 900, safetyStock: 5000, criticality: "Medium", incident: null },
  { sku: "PACK-118", product: "Insulated Shipping Container", warehouse: "Rotterdam DC-1", qty: 640, dailyDemand: 80, safetyStock: 150, criticality: "Low", incident: null },
];

const SUPPLIERS_INIT = [
  { id: "sup-a", name: "Supplier A — Meridian Biochem", location: "Chennai, IN", reliability: 91, risk: "Low", capacity: "High", leadTimeDays: 7, priceIndex: "Low", status: "Active", stockoutProtection: false, cost: 70000 },
  { id: "sup-b", name: "Supplier B — Novasource Pharma", location: "Singapore", reliability: 97, risk: "Medium", capacity: "Medium", leadTimeDays: 2, priceIndex: "High", status: "Active", stockoutProtection: true, cost: 120000 },
  { id: "sup-c", name: "Supplier C — Deccan API Works", location: "Hyderabad, IN", reliability: 68, risk: "High", capacity: "High", leadTimeDays: 12, priceIndex: "Low", status: "Active", stockoutProtection: false, cost: 68000 },
  { id: "sup-d", name: "Supplier D — Rheinland Fine Chem", location: "Cologne, DE", reliability: 88, risk: "Low", capacity: "Medium", leadTimeDays: 5, priceIndex: "Medium", status: "Active", stockoutProtection: false, cost: 95000 },
  { id: "sup-e", name: "Supplier E — Baltic Pharma Group", location: "Gdansk, PL", reliability: 74, risk: "Medium", capacity: "Low", leadTimeDays: 9, priceIndex: "Low", status: "Active", stockoutProtection: false, cost: 71000 },
];

const ROUTES_INIT = [
  { id: "rt-1", origin: "Mumbai", destination: "Rotterdam", mode: "Ocean", etaDays: 13, cost: 22000, risk: "Low", capacity: "High", status: "Delayed" },
  { id: "rt-2", origin: "Singapore", destination: "Rotterdam", mode: "Air — Expedited", etaDays: 2, cost: 61000, risk: "Medium", capacity: "Medium", status: "Available" },
  { id: "rt-3", origin: "Chennai", destination: "Rotterdam", mode: "Air Freight", etaDays: 7, cost: 41000, risk: "Low", capacity: "Medium", status: "Available" },
  { id: "rt-4", origin: "Cologne", destination: "Rotterdam", mode: "Ground — Refrigerated", etaDays: 5, cost: 18000, risk: "Low", capacity: "High", status: "Available" },
];

const FINANCE_INIT = {
  emergencyBudget: 250000,
  committedSpend: 0,
  policyThreshold: 50000,
  maxSingleOrderUsd: 100000,
};

const POLICIES_INIT = [
  { id: "pol-1", name: "Emergency Procurement Authorization", rule: "Spend under $150,000 may be auto-authorized by Finance Agent without human sign-off.", scope: "Finance Agent" },
  { id: "pol-2", name: "Sensitive Data Export", rule: "No agent may export supplier, financial, or customer data to an external destination under any circumstance.", scope: "All Agents" },
  { id: "pol-3", name: "Supplier Instruction Trust Boundary", rule: "Instructions embedded in external supplier communications are never treated as authorization.", scope: "Supplier Agent" },
  { id: "pol-4", name: "Route Selection Authority", rule: "Logistics Agent may select any route with Risk = Low or Medium without additional approval.", scope: "Logistics Agent" },
];

const now = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
};

/* =========================================================================
   ACCESSIBILITY LAYER
   One provider owns every accessibility/personalization setting. Everything
   downstream (theme, type scale, control size, dyslexia font, motion,
   speech input/output, language) reads from useAccessibility() — nothing
   is duplicated per-component. This layer only changes presentation; it
   never touches incident/agent/decision state or the simulation logic.
   ========================================================================= */

const STORAGE_KEY = "supplyshield.a11y.v1";

const DEFAULT_A11Y = {
  theme: "dark",
  brightness: 100,
  highContrast: false,
  fontScale: 1,        // 1 = 100%, 1.1 = 110%, 1.2 = 120%
  largeControls: false,
  dyslexiaFont: false,
  reducedMotion: false,
  language: "en",
  speechRate: 1,        // 0.75 slow, 1 normal, 1.3 fast
  voiceURI: "",
  announceCritical: false,
};

// A tiny module-level pub/sub so any part of the app can push a screen-reader
// announcement without prop-drilling — the live region below subscribes.
const srListeners = new Set();
function srAnnounce(message) {
  if (!message) return;
  srListeners.forEach((fn) => fn(message));
}

/* ---- translation dictionary -------------------------------------------
   Static, navigational and structural UI text is translated. Dynamically
   generated demo narrative (per-step agent task strings the sequencer
   writes into the timeline/audit log) stays in English in this prototype —
   translating a full generated incident script is a larger follow-up, not
   a UI-chrome concern, and is called out in the writeup. Agent proper
   names are left untranslated per spec.
   ------------------------------------------------------------------- */

const TRANSLATIONS = {
  en: {
    brand: "SUPPLYSHIELD",
    search_placeholder: "Search shipments, SKUs, suppliers, POs, agents…",
    voice_input: "Voice input",
    listening: "Listening…",
    agents_active: "agents active",
    emergency_budget_available: "Emergency Budget",
    available_suffix: "available",
    accessibility: "Accessibility",
    nav_command: "Command", nav_operations: "Operations", nav_workforce: "AI Workforce",
    nav_decision: "Decision", nav_execution: "Execution", nav_governance: "Governance",
    command_center: "Command Center", active_incidents: "Active Incidents",
    inventory: "Inventory", shipments_routes: "Shipments & Routes", suppliers: "Suppliers",
    agent_workforce: "Agent Workforce", live_agent_activity: "Live Agent Activity",
    decision_intelligence: "Decision Intelligence", recovery_plans: "Recovery Plans",
    procurement: "Procurement", finance: "Finance",
    security_center: "Security Center", audit_memory: "Audit & Memory",
    workforce_status: "Workforce Status",
    run_recovery: "Run Autonomous Recovery",
    recovery_in_progress: "Recovery in Progress",
    inject_disruption: "Inject Second Disruption",
    replanning_ellipsis: "Replanning…",
    incident_resolved: "Incident resolved — stockout averted",
    incident_timeline: "Incident Timeline",
    timeline_eyebrow: "Live — updates as agents act",
    live_agent_panel: "Live Agent Panel",
    ai_workforce: "AI Workforce",
    kpi_active_incidents: "Active Incidents", kpi_critical_shipments: "Critical Shipments",
    kpi_inventory_at_risk: "Inventory At Risk", kpi_active_agents: "Active Agents",
    kpi_recovery_actions: "Recovery Actions", kpi_pending_approvals: "Pending Approvals",
    kpi_runway: "Inventory Runway", kpi_delay: "Shipment Delay", kpi_stockout: "Stockout Exposure",
    kpi_active_supplier: "Active Supplier", kpi_active_route: "Active Route",
    active_incident: "Active Incident",
    unauthorized_request: "Unauthorized Request",
    access_denied: "Access Denied",
    audit_log: "Audit Log",
    critical: "Critical", high: "High", medium: "Medium", low: "Low",
    resolved: "Resolved", active: "Active", blocked: "Blocked", denied: "Denied", allowed: "Allowed",
    // accessibility panel
    a11y_display: "Display", a11y_theme: "Theme", a11y_dark: "Dark", a11y_light: "Light",
    a11y_brightness: "Brightness", a11y_contrast: "Contrast", a11y_normal: "Normal", a11y_high: "High",
    a11y_typography: "Typography", a11y_text_size: "Text Size", a11y_large: "Large",
    a11y_font: "Font", a11y_standard: "Standard", a11y_dyslexia: "Dyslexia-Friendly",
    a11y_controls: "Controls", a11y_motion: "Motion", a11y_reduced_motion: "Reduced Motion",
    a11y_on: "On", a11y_off: "Off",
    a11y_voice: "Voice", a11y_speech_input: "Speech Input", a11y_read_aloud: "Read Aloud",
    a11y_speech_rate: "Speech Rate", a11y_slow: "Slow", a11y_fast: "Fast",
    a11y_voice_select: "Voice", a11y_system_default: "System Default",
    a11y_announce_critical: "Announce critical events",
    a11y_language: "Language",
    a11y_reset: "Reset Settings",
    a11y_close: "Close",
    read: "Read", pause: "Pause", resume: "Resume", stop: "Stop",
    speech_unsupported: "Speech recognition is not supported in this browser.",
    tts_unsupported: "Read-aloud is not supported in this browser.",
    mic_denied: "Microphone access was denied.",
  },
  hi: {
    brand: "सप्लाईशील्ड",
    search_placeholder: "शिपमेंट, SKU, सप्लायर, PO, एजेंट खोजें…",
    voice_input: "वॉइस इनपुट",
    listening: "सुन रहा है…",
    agents_active: "एजेंट सक्रिय",
    emergency_budget_available: "आपातकालीन बजट",
    available_suffix: "उपलब्ध",
    accessibility: "सुलभता",
    nav_command: "कमांड", nav_operations: "संचालन", nav_workforce: "एआई वर्कफोर्स",
    nav_decision: "निर्णय", nav_execution: "क्रियान्वयन", nav_governance: "गवर्नेंस",
    command_center: "मिशन कंट्रोल", active_incidents: "सक्रिय घटनाएं",
    inventory: "इन्वेंटरी", shipments_routes: "शिपमेंट व मार्ग", suppliers: "सप्लायर",
    agent_workforce: "एजेंट वर्कफोर्स", live_agent_activity: "लाइव एजेंट गतिविधि",
    decision_intelligence: "निर्णय इंटेलिजेंस", recovery_plans: "रिकवरी योजनाएं",
    procurement: "खरीद", finance: "वित्त",
    security_center: "सुरक्षा केंद्र", audit_memory: "ऑडिट और मेमोरी",
    workforce_status: "वर्कफोर्स स्थिति",
    run_recovery: "स्वचालित रिकवरी चलाएं",
    recovery_in_progress: "रिकवरी प्रगति पर है",
    inject_disruption: "दूसरी बाधा डालें",
    replanning_ellipsis: "पुनःयोजना बन रही है…",
    incident_resolved: "घटना सुलझी — स्टॉकआउट टला",
    incident_timeline: "घटना समयरेखा",
    timeline_eyebrow: "लाइव — एजेंट कार्य करते ही अपडेट होता है",
    live_agent_panel: "लाइव एजेंट पैनल",
    ai_workforce: "एआई वर्कफोर्स",
    kpi_active_incidents: "सक्रिय घटनाएं", kpi_critical_shipments: "गंभीर शिपमेंट",
    kpi_inventory_at_risk: "जोखिम में इन्वेंटरी", kpi_active_agents: "सक्रिय एजेंट",
    kpi_recovery_actions: "रिकवरी कार्रवाई", kpi_pending_approvals: "लंबित अनुमोदन",
    kpi_runway: "इन्वेंटरी रनवे", kpi_delay: "शिपमेंट देरी", kpi_stockout: "स्टॉकआउट जोखिम",
    kpi_active_supplier: "सक्रिय सप्लायर", kpi_active_route: "सक्रिय मार्ग",
    active_incident: "सक्रिय घटना",
    unauthorized_request: "अनधिकृत अनुरोध",
    access_denied: "पहुंच अस्वीकृत",
    audit_log: "ऑडिट लॉग",
    critical: "गंभीर", high: "उच्च", medium: "मध्यम", low: "निम्न",
    resolved: "सुलझा", active: "सक्रिय", blocked: "अवरुद्ध", denied: "अस्वीकृत", allowed: "अनुमत",
    a11y_display: "डिस्प्ले", a11y_theme: "थीम", a11y_dark: "डार्क", a11y_light: "लाइट",
    a11y_brightness: "चमक", a11y_contrast: "कंट्रास्ट", a11y_normal: "सामान्य", a11y_high: "उच्च",
    a11y_typography: "टाइपोग्राफी", a11y_text_size: "टेक्स्ट आकार", a11y_large: "बड़ा",
    a11y_font: "फॉन्ट", a11y_standard: "मानक", a11y_dyslexia: "डिस्लेक्सिया-अनुकूल",
    a11y_controls: "नियंत्रण", a11y_motion: "गति", a11y_reduced_motion: "कम गति",
    a11y_on: "चालू", a11y_off: "बंद",
    a11y_voice: "आवाज़", a11y_speech_input: "स्पीच इनपुट", a11y_read_aloud: "जोर से पढ़ें",
    a11y_speech_rate: "बोलने की गति", a11y_slow: "धीमा", a11y_fast: "तेज़",
    a11y_voice_select: "आवाज़", a11y_system_default: "सिस्टम डिफ़ॉल्ट",
    a11y_announce_critical: "गंभीर घटनाओं की घोषणा करें",
    a11y_language: "भाषा",
    a11y_reset: "सेटिंग्स रीसेट करें",
    a11y_close: "बंद करें",
    read: "पढ़ें", pause: "रोकें", resume: "जारी रखें", stop: "रुकें",
    speech_unsupported: "इस ब्राउज़र में स्पीच पहचान उपलब्ध नहीं है।",
    tts_unsupported: "इस ब्राउज़र में जोर से पढ़ना उपलब्ध नहीं है।",
    mic_denied: "माइक्रोफ़ोन एक्सेस अस्वीकृत कर दिया गया।",
  },
};

// Words that show up as status/severity values throughout the app — mapped
// so StatusTag/AgentStatusDot can translate them without a rewrite of every
// call site. Falls back to the raw value when there's no translation.
const STATUS_KEY_MAP = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
  RESOLVED: "resolved", ACTIVE: "active", BLOCKED: "blocked", DENIED: "denied", ALLOWED: "allowed",
};

const AccessibilityContext = createContext(null);
const useAccessibility = () => useContext(AccessibilityContext);

function loadStoredA11y() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_A11Y, ...parsed };
  } catch {
    return null;
  }
}

function AccessibilityProvider({ children }) {
  const stored = useRef(null);
  if (stored.current === null) stored.current = loadStoredA11y();
  const initial = stored.current;

  // Respect OS/browser prefers-reduced-motion the first time there is no
  // saved preference yet.
  const systemPrefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  })();

  const [settings, setSettings] = useState(() => initial || { ...DEFAULT_A11Y, reducedMotion: systemPrefersReducedMotion });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings({ ...DEFAULT_A11Y, reducedMotion: systemPrefersReducedMotion }), [systemPrefersReducedMotion]);

  const t = useCallback((key) => {
    const dict = TRANSLATIONS[settings.language] || TRANSLATIONS.en;
    return dict[key] ?? TRANSLATIONS.en[key] ?? key;
  }, [settings.language]);

  const tStatus = useCallback((value) => {
    if (value == null) return value;
    const key = STATUS_KEY_MAP[String(value).toUpperCase()];
    return key ? t(key) : value;
  }, [t]);

  /* ---- screen-reader live region ---- */
  const [liveMessage, setLiveMessage] = useState("");
  useEffect(() => {
    const handler = (msg) => setLiveMessage(msg);
    srListeners.add(handler);
    return () => srListeners.delete(handler);
  }, []);

  /* ---- text-to-speech ---- */
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (!ttsSupported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, [ttsSupported]);

  const pickVoice = useCallback(() => {
    if (!voices.length) return null;
    if (settings.voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosen) return chosen;
    }
    const wantHindi = settings.language === "hi";
    const byLang = voices.find((v) => v.lang?.toLowerCase().startsWith(wantHindi ? "hi" : "en"));
    return byLang || voices[0] || null;
  }, [voices, settings.voiceURI, settings.language]);

  const speak = useCallback((text) => {
    if (!ttsSupported || !text) return;
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = settings.speechRate;
    const v = pickVoice();
    if (v) utter.voice = v;
    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend = () => { setSpeaking(false); setPaused(false); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(utter);
  }, [ttsSupported, settings.speechRate, pickVoice]);

  const pauseSpeech = useCallback(() => { if (ttsSupported) { window.speechSynthesis.pause(); setPaused(true); } }, [ttsSupported]);
  const resumeSpeech = useCallback(() => { if (ttsSupported) { window.speechSynthesis.resume(); setPaused(false); } }, [ttsSupported]);
  const stopSpeech = useCallback(() => { if (ttsSupported) { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); } }, [ttsSupported]);

  /* ---- speech-to-text ---- */
  const SpeechRecognitionImpl = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const sttSupported = !!SpeechRecognitionImpl;
  const [listening, setListening] = useState(false);
  const [sttError, setSttError] = useState("");
  const recognitionRef = useRef(null);

  const startListening = useCallback((onResult) => {
    if (!sttSupported) { setSttError(t("speech_unsupported")); return; }
    setSttError("");
    const rec = new SpeechRecognitionImpl();
    rec.lang = settings.language === "hi" ? "hi-IN" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || "";
      onResult?.(transcript);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "permission-denied") setSttError(t("mic_denied"));
      else setSttError(t("speech_unsupported"));
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try { rec.start(); } catch { setListening(false); }
  }, [sttSupported, settings.language, t]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const value = useMemo(() => ({
    ...settings, update, reset, t, tStatus,
    ttsSupported, speaking, paused, voices, speak, pauseSpeech, resumeSpeech, stopSpeech,
    sttSupported, listening, sttError, startListening, stopListening,
    announce: srAnnounce,
  }), [settings, update, reset, t, tStatus, ttsSupported, speaking, paused, voices, speak, pauseSpeech, resumeSpeech, stopSpeech, sttSupported, listening, sttError, startListening, stopListening]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{liveMessage}</div>
    </AccessibilityContext.Provider>
  );
}

/* --------------------------------- STORE ---------------------------------- */

const StoreContext = createContext(null);
const useStore = () => useContext(StoreContext);

function useSupplyShieldStore() {
  const [incident, setIncident] = useState({
    id: "INC-2026-0841",
    severity: "CRITICAL",
    title: "Temperature-sensitive pharmaceutical shipment delayed",
    sku: "PHARMA-001",
    runwayDays: 4,
    delayDays: 6,
    stockoutExposure: "HIGH",
    origin: "Hamburg",
    destination: "Genoa",
    status: "DETECTED",
    activeSupplierId: null,
    activeRouteId: null,
    replanCount: 0,
  });
  const [agents, setAgents] = useState(AGENTS_INIT);
  const [inventory, setInventory] = useState(INVENTORY_INIT);
  const [suppliers, setSuppliers] = useState(SUPPLIERS_INIT);
  const [routes, setRoutes] = useState(ROUTES_INIT);
  const [finance, setFinance] = useState(FINANCE_INIT);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [timeline, setTimeline] = useState([
    { time: "08:41", agent: "SYSTEM", action: "Shipment delay detected — ETA slipped +6 days", tool: null, result: null },
  ]);
  const [auditEvents, setAuditEvents] = useState([
    { time: "08:41", agent: "SYSTEM", action: "SHIPMENT_DELAYED", tool: "-", result: "Incident INC-2026-0841 opened", policy: "-" },
  ]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [policies, setPolicies] = useState(POLICIES_INIT);
  const [isRunning, setIsRunning] = useState(false);
  const [runPhase, setRunPhase] = useState("idle"); // idle | recovering | resolved | replanning | resolved2

  const patchAgent = useCallback((id, patch) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const pushTimeline = useCallback((entry) => {
    setTimeline((prev) => [...prev, { time: now(), ...entry }]);
  }, []);

  const pushAudit = useCallback((entry) => {
    setAuditEvents((prev) => [...prev, { time: now(), ...entry }]);
  }, []);

  return {
    incident, setIncident,
    agents, setAgents, patchAgent,
    inventory, setInventory,
    suppliers, setSuppliers,
    routes, setRoutes,
    finance, setFinance,
    purchaseOrders, setPurchaseOrders,
    decisions, setDecisions,
    timeline, setTimeline, pushTimeline,
    auditEvents, setAuditEvents, pushAudit,
    securityEvents, setSecurityEvents,
    policies,
    isRunning, setIsRunning,
    runPhase, setRunPhase,
  };
}

/* ------------------------------- SEQUENCER --------------------------------
   Drives the "RUN AUTONOMOUS RECOVERY" and "INJECT SECOND DISRUPTION"
   demos as a queue of real state transitions spaced over time — nothing
   here is a static pre-written transcript, each step mutates the store.
   ---------------------------------------------------------------------- */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 120000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || `API request failed (${response.status})`);
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapInventoryFromApi(items = []) {
  return items.map((i) => {
    const qty = Number(
      i.qty ??
      i.quantity_units ??
      i.quantity ??
      0
    );

    const dailyDemand = Number(
      i.dailyDemand ??
      i.daily_demand_units ??
      i.daily_demand ??
      0
    );

    const reserved = Number(
      i.reserved ??
      i.reserved_units ??
      0
    );

    const safetyStock = Number(
      i.safetyStock ??
      i.safety_stock_units ??
      0
    );

    const runway =
      dailyDemand > 0
        ? qty / dailyDemand
        : null;

    return {
      inventoryId:
        i.inventory_id ||
        `${i.sku || "sku"}-${i.warehouse_id || i.warehouse || "warehouse"}`,

      sku: String(i.sku || "—"),

      product: String(i.product || i.sku || "—"),

      warehouse: String(
        i.warehouse || i.warehouse_id || "—"
      ),

      qty,
      dailyDemand,
      reserved,

      reorderPoint: Number(
        i.reorderPoint ??
        i.reorder_point_units ??
        0
      ),

      safetyStock,

      runwayDays: runway,

      criticality: String(
        i.criticality || "Medium"
      ).replace(/^./, c => c.toUpperCase()),

      incident: i.incident || null,
    };
  });
}

function mapSuppliersFromApi(items = []) {
  return items.map((s) => ({
    id: String(s.id ?? s.supplier_id ?? `${s.supplier_name || s.name || "supplier"}-${s.product_id || s.product || "product"}`),
    name: String(s.name ?? s.supplier_name ?? "Unknown supplier"),
    location: String(s.location ?? s.country ?? "—"),
    reliability: Number(s.reliability ?? (Number(s.reliability_score ?? 0) * 100)),
    risk: s.risk ?? (Number(s.risk_score ?? 0) >= 0.35 ? "High" : Number(s.risk_score ?? 0) >= 0.2 ? "Medium" : "Low"),
    capacity: s.capacity ?? (s.capacity_units != null ? Number(s.capacity_units).toLocaleString() : "—"),
    leadTimeDays: Number(s.leadTimeDays ?? s.lead_time_days ?? 0),
    priceIndex: s.priceIndex ?? "—",
    status: s.status ? String(s.status).replace(/^./, (c) => c.toUpperCase()) : "Active",
    stockoutProtection: s.stockoutProtection ?? null,
    cost: Number(s.cost ?? s.unit_price_usd ?? 0),
  }));
}

function mapRoutesFromApi(items = []) {
  return items.map((r) => ({
    id: String(r.id ?? r.route_id ?? `${r.origin || "origin"}-${r.destination || "destination"}-${r.mode || "mode"}`),
    origin: String(r.origin ?? "—"),
    destination: String(r.destination ?? "—"),
    mode: String(r.mode ?? "—"),
    etaDays: Number(r.etaDays ?? r.transit_days ?? 0),
    cost: Number(r.cost ?? r.cost_usd ?? 0),
    risk: r.risk ?? (Number(r.risk_score ?? 0) >= 0.35 ? "High" : Number(r.risk_score ?? 0) >= 0.2 ? "Medium" : "Low"),
    capacity: r.capacity ?? (r.capacity_units != null ? Number(r.capacity_units).toLocaleString() : "—"),
    status: r.status ? String(r.status).replace(/^./, (c) => c.toUpperCase()) : "Available",
  }));
}

function mapPurchaseOrdersFromApi(items = [], suppliers = []) {
  return items.map((p) => {
    const supplier = suppliers.find((s) => String(s.id ?? s.supplier_id) === String(p.supplier_id));
    return {
      id: p.purchase_order_id || p.po_id || `PO-${p.supplier_id}-${p.product_id}`,
      supplier: supplier?.name || p.supplier_id,
      supplierId: p.supplier_id,
      quantity: Number(p.quantity ?? p.quantity_units ?? 0),
      total: Number(p.total_cost_usd ?? (Number(p.quantity ?? 0) * Number(p.unit_cost_usd ?? p.unit_price_usd ?? 0))),
      status: p.status || "PROPOSED",
      incident: null,
      createdAt: p.created_at || p.created_date || now(),
    };
  });
}

function mapSecurityEventsFromApi(items = []) {
  return items.map((e) => ({
    id: e.audit_id,
    time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : now(),
    timestamp: e.timestamp,
    requestingAgent: e.agent,
    agent: e.agent,
    action: e.action,
    resource: e.resource,
    decision: e.decision,
    status: e.decision === "BLOCK" ? "BLOCKED" : e.decision === "ALLOW" ? "ALLOWED" : "REQUIRE_APPROVAL",
    policy: e.policy_id,
    policyId: e.policy_id,
    reason: e.reason,
    source: e.source || "agent_tool_request",
    destination: e.destination || null,
    severity: e.severity || "INFO",
    approvalRequired: !!e.approval_required,
  }));
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatRunway(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.max(0, n).toFixed(2)}d` : "—";
}

function calculateRunway(qty, dailyDemand) {
  const q = finiteNumber(qty, 0);
  const d = finiteNumber(dailyDemand, 0);
  return d > 0 ? q / d : null;
}

function mapDashboardPayload(store, payload) {

  if (payload.incident) {
    const incident = payload.incident;
    store.setIncident({
      ...incident,
      runwayDays: finiteNumber(incident.runwayDays, null),
      delayDays: finiteNumber(incident.delayDays, 0),
      replanCount: finiteNumber(incident.replanCount, 0),
    });
  }

  if (Array.isArray(payload.inventory)) {
    store.setInventory(mapInventoryFromApi(payload.inventory));
  }

  if (Array.isArray(payload.suppliers)) {
    const remoteSuppliers = mapSuppliersFromApi(payload.suppliers);
    store.setSuppliers((prev) =>
      prev.map((local) => {
        const remote = remoteSuppliers.find((s) => s.id === local.id);
        if (!remote) return local;

        return {
          ...local,
          ...Object.fromEntries(
            Object.entries(remote).filter(
              ([, value]) => value !== undefined && value !== null
            )
          ),
        };
      })
    );
  }

  if (Array.isArray(payload.routes)) store.setRoutes(mapRoutesFromApi(payload.routes));

  if (payload.finance) {
    store.setFinance((f) => ({ ...f, ...payload.finance }));
  }

  if (Array.isArray(payload.purchaseOrders)) {
    store.setPurchaseOrders(
      mapPurchaseOrdersFromApi(
        payload.purchaseOrders,
        payload.suppliers || store.suppliers
      )
    );
  }

  if (Array.isArray(payload.agents)) {
    store.setAgents((prev) =>
      prev.map((local) => {
        const remote = payload.agents.find((a) => a.id === local.id);
        return remote ? { ...local, connected: remote.connected } : local;
      })
    );
  }
}

// Shared result-mapping used by both the demo trigger and the custom
// Command Agent instruction path — both call the same /api/recovery
// endpoint and must fold the response into the store identically.
function applyRecoveryResult(store, result) {
  if (result.incident) store.setIncident(result.incident);
  if (Array.isArray(result.inventory)) store.setInventory(mapInventoryFromApi(result.inventory));
  if (Array.isArray(result.suppliers)) store.setSuppliers(mapSuppliersFromApi(result.suppliers));
  if (Array.isArray(result.routes)) store.setRoutes(mapRoutesFromApi(result.routes));
  if (result.finance) store.setFinance((f) => ({ ...f, ...result.finance }));
  if (Array.isArray(result.purchaseOrders)) store.setPurchaseOrders(mapPurchaseOrdersFromApi(result.purchaseOrders, result.suppliers || store.suppliers));
  if (Array.isArray(result.agents)) store.setAgents(result.agents.map((a) => ({ ...a, permissions: [] })));
  if (Array.isArray(result.timeline)) store.setTimeline((prev) => [...prev, ...result.timeline]);
  if (Array.isArray(result.auditEvents)) store.setAuditEvents((prev) => [...prev, ...result.auditEvents]);
  if (result.decision) store.setDecisions((prev) => [...prev, result.decision]);
}

// The backend's /api/recovery endpoint only accepts a structured
// { shipment_id, exclude_supplier_ids, exclude_route_ids } payload (see
// backend/schemas.py:RecoveryRequest) — it does not take free text. So a
// typed Command Agent instruction is parsed locally for a shipment
// reference (e.g. "SHP001") and translated into that same existing
// request shape; the raw instruction is preserved in the timeline/audit
// trail for transparency.
function extractShipmentId(text, fallbackId) {
  const match = text.match(/\b[A-Za-z]{2,6}-?\d{2,8}\b/);
  return match ? match[0].toUpperCase() : fallbackId;
}

function useSequencer(store) {
  const runAutonomousRecovery = useCallback(async () => {
    if (store.isRunning) return;
    const shipmentId = store.incident.id;
    store.setIsRunning(true);
    store.setRunPhase("recovering");
    store.setIncident((i) => ({ ...i, status: "INVESTIGATING" }));
    store.setAgents((prev) => prev.map((a) => ({ ...a, status: "investigating", task: "Executing real ADK recovery workflow", tool: "POST /api/recovery" })));
    store.pushTimeline({ agent: "SYSTEM", action: "Starting real autonomous recovery", tool: "POST /api/recovery", result: `Shipment ${shipmentId}` });

    try {
      const result = await apiRequest("/api/recovery", {
        method: "POST",
        body: JSON.stringify({ shipment_id: shipmentId }),
      });

      applyRecoveryResult(store, result);

      store.setRunPhase(result.incident?.status === "RESOLVED" ? "resolved" : "idle");
      store.setIsRunning(false);
      srAnnounce(result.incident?.status === "RESOLVED" ? "Real autonomous recovery completed." : "Real autonomous recovery completed with no executable recovery plan.");
    } catch (error) {
      const message = error?.message || "Recovery request failed";
      store.setAgents((prev) => prev.map((a) => ({ ...a, status: "failed", task: message, lastAction: "Backend recovery failed", confidence: 0 })));
      store.setIncident((i) => ({ ...i, status: "ERROR" }));
      store.pushTimeline({ agent: "SYSTEM", action: "Autonomous recovery failed", tool: "POST /api/recovery", result: message });
      store.pushAudit({ agent: "SYSTEM", action: "RECOVERY_FAILED", tool: "POST /api/recovery", result: message, policy: "SupplyShield" });
      store.setRunPhase("idle");
      store.setIsRunning(false);
      srAnnounce(`Recovery failed: ${message}`);
    }
  }, [store]);

  // Drives the Command Center's free-text "Command Agent" input. Reuses the
  // exact same recovery mechanism/API call/state updates as
  // runAutonomousRecovery above — the only difference is the shipment
  // reference comes from parsing the user's instruction instead of the
  // current incident, and the instruction itself is logged.
  const runCommand = useCallback(async (commandText) => {
    const trimmed = (commandText || "").trim();
    if (store.isRunning || !trimmed) return;
    const shipmentId = extractShipmentId(trimmed, store.incident.id);
    store.setIsRunning(true);
    store.setRunPhase("recovering");
    store.setIncident((i) => ({ ...i, status: "INVESTIGATING" }));
    store.setAgents((prev) => prev.map((a) => ({ ...a, status: "investigating", task: "Executing real ADK recovery workflow", tool: "POST /api/recovery" })));
    store.pushTimeline({ agent: "Command Agent", action: `Custom instruction received: "${trimmed}"`, tool: "POST /api/recovery", result: `Shipment ${shipmentId}` });
    store.pushAudit({ agent: "Command Agent", action: "CUSTOM_COMMAND_RECEIVED", tool: "POST /api/recovery", result: trimmed, policy: "-" });

    try {
      const result = await apiRequest("/api/recovery", {
        method: "POST",
        body: JSON.stringify({ shipment_id: shipmentId }),
      });

      applyRecoveryResult(store, result);

      store.setRunPhase(result.incident?.status === "RESOLVED" ? "resolved" : "idle");
      store.setIsRunning(false);
      srAnnounce(result.incident?.status === "RESOLVED" ? "Real autonomous recovery completed." : "Real autonomous recovery completed with no executable recovery plan.");
    } catch (error) {
      const message = error?.message || "Recovery request failed";
      store.setAgents((prev) => prev.map((a) => ({ ...a, status: "failed", task: message, lastAction: "Backend recovery failed", confidence: 0 })));
      store.setIncident((i) => ({ ...i, status: "ERROR" }));
      store.pushTimeline({ agent: "Command Agent", action: "Custom instruction failed", tool: "POST /api/recovery", result: message });
      store.pushAudit({ agent: "Command Agent", action: "CUSTOM_COMMAND_FAILED", tool: "POST /api/recovery", result: message, policy: "SupplyShield" });
      store.setRunPhase("idle");
      store.setIsRunning(false);
      srAnnounce(`Recovery failed: ${message}`);
    }
  }, [store]);

  const injectSecondDisruption = useCallback(async () => {
    if (store.isRunning || !store.incident.activeSupplierId) return;
    store.setIsRunning(true);
    store.setRunPhase("replanning");
    store.setIncident((i) => ({ ...i, status: "REPLANNING" }));
    store.pushTimeline({ agent: "SYSTEM", action: "Second disruption injected", tool: "simulation", result: `Supplier ${store.incident.activeSupplierId} excluded from replanning` });
    try {
      const result = await apiRequest("/api/recovery", {
        method: "POST",
        body: JSON.stringify({ shipment_id: store.incident.id, exclude_supplier_ids: [store.incident.activeSupplierId] }),
      });
      if (result.incident) store.setIncident((i) => ({ ...result.incident, replanCount: (i.replanCount || 0) + 1 }));
      if (Array.isArray(result.inventory)) store.setInventory(mapInventoryFromApi(result.inventory));
      if (Array.isArray(result.suppliers)) store.setSuppliers(mapSuppliersFromApi(result.suppliers));
      if (Array.isArray(result.routes)) store.setRoutes(mapRoutesFromApi(result.routes));
      if (result.finance) store.setFinance((f) => ({ ...f, ...result.finance }));
      if (Array.isArray(result.agents)) store.setAgents(result.agents.map((a) => ({ ...a, permissions: [] })));
      if (Array.isArray(result.timeline)) store.setTimeline((prev) => [...prev, ...result.timeline]);
      if (Array.isArray(result.auditEvents)) store.setAuditEvents((prev) => [...prev, ...result.auditEvents]);
      if (result.decision) store.setDecisions((prev) => [...prev.map((d) => ({ ...d, invalidated: true, status: d.status === "SELECTED" ? "INVALIDATED" : d.status })), result.decision]);
      store.setPurchaseOrders(mapPurchaseOrdersFromApi(result.purchaseOrders || [], result.suppliers || store.suppliers));
      store.setRunPhase(result.incident?.status === "RESOLVED" ? "resolved2" : "idle");
      store.setIsRunning(false);
    } catch (error) {
      store.setIncident((i) => ({ ...i, status: "ERROR" }));
      store.pushTimeline({ agent: "SYSTEM", action: "Replanning failed", tool: "POST /api/recovery", result: error?.message || "Unknown error" });
      store.setRunPhase("idle");
      store.setIsRunning(false);
    }
  }, [store]);

  return { runAutonomousRecovery, injectSecondDisruption, runCommand };
}

function setPOOldInvalidated(store) {
  store.setPurchaseOrders((prev) => prev.map((po) => (po.status === "EXECUTED" ? { ...po, status: "SUPERSEDED" } : po)));
}


/* ------------------------------ DESIGN TOKENS ------------------------------
   Palette: near-black control-room base, single steel-blue brand accent,
   color reserved for status/severity only. Mono type for all data/ids/time.
   ---------------------------------------------------------------------- */

const GlobalStyle = () => (
  <style>{`
    :root{
      --bg:#0a0d13; --bg-elev:#0e121a; --panel:#121722; --panel-alt:#171d2b;
      --border:#232a3a; --border-strong:#323b52;
      --text:#e6e9f0; --text-dim:#8a92a8; --text-faint:#5a6379;
      --brand:#4c8dff; --brand-dim:#1f3560;
      --critical:#e5484d; --critical-dim:#3a1518;
      --warning:#e6a13b; --warning-dim:#3a2b0f;
      --success:#31c48d; --success-dim:#0f2f24;
      --info:#4c8dff; --info-dim:#122544;
      --mono: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
      --sans: -apple-system, "Segoe UI", Roboto, system-ui, sans-serif;
      --dyslexic: "OpenDyslexic", "Comic Sans MS", Verdana, var(--sans);
      --control-pad-y: 8px; --control-pad-x: 14px; --control-min-h: 32px;
      --input-pad-y: 7px; --input-pad-x: 10px; --input-min-h: 30px;
      --nav-pad-y: 7px; --nav-pad-x: 12px;
    }
    @font-face{
      font-family:"OpenDyslexic";
      src: url("https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-Regular.woff2") format("woff2");
      font-weight:400; font-style:normal; font-display:swap;
    }
    @font-face{
      font-family:"OpenDyslexic";
      src: url("https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-Bold.woff2") format("woff2");
      font-weight:700; font-style:normal; font-display:swap;
    }
    html, body, #root{margin:0; padding:0; width:100%; min-height:100%; box-sizing:border-box;}
    body{background:#0a0d13;}
    *, *::before, *::after{box-sizing:border-box;}
    .ss-root{background:var(--bg); color:var(--text); font-family:var(--sans); min-height:100vh; min-width:100%; font-size:calc(13px * var(--ss-font-scale));}
    .ss-root ::selection{ background:var(--brand-dim); }

    /* ---- Light theme: same structure/tokens, different values ---- */
    .ss-root[data-theme="light"]{
      --bg:#f4f5f7; --bg-elev:#ffffff; --panel:#ffffff; --panel-alt:#eef0f4;
      --border:#d7dbe3; --border-strong:#b8bfcc;
      --text:#161a22; --text-dim:#4b5261; --text-faint:#767f92;
      --brand:#2f6fe0; --brand-dim:#dce8ff;
      --critical:#c8232b; --critical-dim:#fde3e4;
      --warning:#a5680a; --warning-dim:#fbead0;
      --success:#0f8a5f; --success-dim:#dcf5ec;
      --info:#2f6fe0; --info-dim:#e4edff;
    }
    .ss-root[data-theme="light"] .ss-tag-critical{ color:#8f1319; }
    .ss-root[data-theme="light"] .ss-tag-warning{ color:#7a4c05; }
    .ss-root[data-theme="light"] .ss-tag-success{ color:#0b6b47; }
    .ss-root[data-theme="light"] .ss-tag-info{ color:#1e4fa8; }
    .ss-root[data-theme="light"] .ss-btn-primary{ color:#ffffff; }
    .ss-root[data-theme="light"] .ss-drawer-backdrop{ background:rgba(20,24,32,.35); }

    /* ---- High contrast: stronger borders/text, never relies on hue alone ---- */
    .ss-root[data-contrast="high"]{ --border:var(--border-strong); }
    .ss-root[data-contrast="high"] .ss-panel, .ss-root[data-contrast="high"] .ss-panel-alt{ border-width:2px; }
    .ss-root[data-contrast="high"] .ss-tag{ border-width:2px; font-weight:800; }
    .ss-root[data-contrast="high"] .ss-btn{ border-width:2px; font-weight:800; }
    .ss-root[data-contrast="high"] .ss-table th, .ss-root[data-contrast="high"] .ss-table td{ border-bottom-width:2px; }
    .ss-root[data-contrast="high"][data-theme="dark"]{ --text:#ffffff; --text-dim:#d3d8e4; }
    .ss-root[data-contrast="high"][data-theme="light"]{ --text:#000000; --text-dim:#20242c; }

    /* ---- Dyslexia-friendly typography ---- */
    .ss-root[data-dyslexia="true"], .ss-root[data-dyslexia="true"] input, .ss-root[data-dyslexia="true"] select, .ss-root[data-dyslexia="true"] button{
      font-family:var(--dyslexic) !important; letter-spacing:.02em; line-height:1.6;
    }
    .ss-root[data-dyslexia="true"] .mono{ font-family:var(--dyslexic) !important; }
    .ss-root[data-dyslexia="true"] *{ text-align:left !important; }

    /* ---- Larger controls: independent of text zoom, defined centrally ---- */
    .ss-root[data-controls="large"]{ --control-pad-y:13px; --control-pad-x:20px; --control-min-h:46px; --input-pad-y:12px; --input-pad-x:14px; --input-min-h:44px; --nav-pad-y:13px; --nav-pad-x:14px; }
    .ss-root[data-controls="large"] .ss-btn{ font-size:calc(13.5px * var(--ss-font-scale)); }
    .ss-root[data-controls="large"] .ss-nav-link{ font-size:calc(13.5px * var(--ss-font-scale)); }
    .ss-root[data-controls="large"] input.ss-input, .ss-root[data-controls="large"] select.ss-input{ font-size:calc(13.5px * var(--ss-font-scale)); }
    .ss-root[data-controls="large"] .ss-dot{ width:10px; height:10px; }

    /* ---- Reduced motion: JS-driven toggle, plus a hard CSS fallback for the
       OS-level media query so the app respects it even before React mounts ---- */
    .ss-root[data-motion="reduced"] .ss-fade-in, .ss-root[data-motion="reduced"] .ss-pulse{ animation:none !important; }
    .ss-root[data-motion="reduced"] *{ transition:none !important; }
    @media (prefers-reduced-motion: reduce){
      .ss-fade-in, .ss-pulse{ animation:none !important; }
    }

    /* ---- Focus visibility: never removed, always strong, works in every theme ---- */
    .ss-root *:focus-visible{ outline:2px solid var(--brand); outline-offset:2px; border-radius:1px; }
    .ss-root[data-contrast="high"] *:focus-visible{ outline:3px solid var(--brand); outline-offset:2px; }

    .sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .mono{font-family:var(--mono);}
    .ss-scroll::-webkit-scrollbar{width:8px; height:8px;}
    .ss-scroll::-webkit-scrollbar-thumb{background:var(--border-strong); border-radius:0;}
    .ss-scroll::-webkit-scrollbar-track{background:transparent;}

    .ss-panel{ background:var(--panel); border:1px solid var(--border); }
    .ss-panel-alt{ background:var(--panel-alt); border:1px solid var(--border); }
    .ss-btn{ font-family:var(--sans); font-size:calc(12px * var(--ss-font-scale)); font-weight:600; letter-spacing:.02em; padding:var(--control-pad-y) var(--control-pad-x); min-height:var(--control-min-h); border:1px solid var(--border-strong); background:var(--panel-alt); color:var(--text); cursor:pointer; transition:background .12s, border-color .12s; }
    .ss-btn:hover{ background:#1e2536; border-color:var(--brand); }
    .ss-btn:disabled{ opacity:.4; cursor:not-allowed; }
    .ss-btn-primary{ background:var(--brand); border-color:var(--brand); color:#04101f; }
    .ss-btn-primary:hover{ background:#3d7ae8; border-color:#3d7ae8; }
    .ss-btn-danger{ background:var(--critical-dim); border-color:var(--critical); color:#ffb9bb; }
    .ss-btn-danger:hover{ background:#4a1a1d; }

    .ss-tag{ display:inline-flex; align-items:center; gap:5px; font-size:calc(10.5px * var(--ss-font-scale)); font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:2px 7px; border:1px solid var(--border-strong); font-family:var(--sans); }
    .ss-tag-critical{ color:#ff9aa0; border-color:var(--critical); background:var(--critical-dim); }
    .ss-tag-warning{ color:#f4c179; border-color:var(--warning); background:var(--warning-dim); }
    .ss-tag-success{ color:#7fe6c1; border-color:var(--success); background:var(--success-dim); }
    .ss-tag-info{ color:#9dc0ff; border-color:var(--info); background:var(--info-dim); }
    .ss-tag-neutral{ color:var(--text-dim); border-color:var(--border-strong); background:var(--panel-alt); }

    .ss-dot{ width:7px; height:7px; border-radius:50%; display:inline-block; flex:none; }
    .ss-dot-active{ background:var(--brand); box-shadow:0 0 0 3px var(--brand-dim); }
    .ss-dot-idle{ background:var(--text-faint); }
    .ss-dot-critical{ background:var(--critical); box-shadow:0 0 0 3px var(--critical-dim); }
    .ss-dot-success{ background:var(--success); }

    .ss-table{ width:100%; border-collapse:collapse; font-size:calc(12.5px * var(--ss-font-scale)); }
    .ss-table th{ text-align:left; font-size:calc(10.5px * var(--ss-font-scale)); letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint); font-weight:600; padding:8px 10px; border-bottom:1px solid var(--border-strong); white-space:nowrap; }
    .ss-table td{ padding:9px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .ss-table tbody tr{ cursor:pointer; }
    .ss-table tbody tr:hover{ background:var(--panel-alt); }
    .ss-table-wrap{ overflow-x:auto; }

    .ss-nav-link{ display:flex; align-items:center; gap:9px; padding:var(--nav-pad-y) var(--nav-pad-x); color:var(--text-dim); font-size:calc(12.5px * var(--ss-font-scale)); font-weight:500; cursor:pointer; border-left:2px solid transparent; background:none; border-top:none; border-right:none; border-bottom:none; width:100%; text-align:left; font-family:var(--sans); }
    .ss-nav-link:hover{ color:var(--text); background:rgba(255,255,255,0.02); }
    .ss-nav-link.active{ color:var(--text); border-left-color:var(--brand); background:var(--panel-alt); }
    .ss-nav-section{ font-size:calc(10px * var(--ss-font-scale)); letter-spacing:.09em; text-transform:uppercase; color:var(--text-faint); padding:14px 12px 4px; font-weight:700; }

    .ss-kpi-label{ font-size:calc(10.5px * var(--ss-font-scale)); letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint); font-weight:600; }
    .ss-kpi-value{ font-family:var(--mono); font-size:calc(22px * var(--ss-font-scale)); font-weight:600; color:var(--text); line-height:1.1; }

    .ss-fade-in{ animation: ssFadeIn .25s ease; }
    @keyframes ssFadeIn{ from{opacity:0; transform:translateY(2px);} to{opacity:1; transform:none;} }
    .ss-pulse{ animation: ssPulse 1.4s ease-in-out infinite; }
    @keyframes ssPulse{ 0%,100%{opacity:1;} 50%{opacity:.4;} }

    input.ss-input, select.ss-input{ background:var(--bg-elev); border:1px solid var(--border-strong); color:var(--text); padding:var(--input-pad-y) var(--input-pad-x); min-height:var(--input-min-h); font-size:calc(12.5px * var(--ss-font-scale)); font-family:var(--sans); }
    input.ss-input:focus, select.ss-input:focus{ outline:2px solid var(--brand); outline-offset:-1px; }
    input.ss-input::placeholder{ color:var(--text-faint); }

    a.ss-link{ color:var(--brand); text-decoration:none; cursor:pointer; }
    a.ss-link:hover{ text-decoration:underline; }

    .ss-drawer-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:40; }
    .ss-sidebar{ transition:transform .2s ease; }

    @media (max-width: 900px){
      .ss-desktop-only{ display:none !important; }
      .ss-cc-grid{ grid-template-columns: 1fr !important; }
    }
    @media (min-width: 901px){
      .ss-mobile-only{ display:none !important; }
    }

    /* Brightness is a perceptual filter on the whole surface, applied to a
       wrapper OUTSIDE .ss-root's own background so text contrast (computed
       from --text/--bg) is never affected by the filter math. */
    .ss-brightness-wrap{ filter: brightness(var(--ss-brightness, 1)); min-height:100vh; }
  `}</style>
);

/* ------------------------------ UI PRIMITIVES ------------------------------ */

function Tag({ tone = "neutral", children }) {
  return <span className={`ss-tag ss-tag-${tone}`}>{children}</span>;
}

function severityTone(sev) {
  const s = (sev || "").toLowerCase();
  if (["critical", "high", "denied", "blocked", "invalidated"].includes(s)) return "critical";
  if (["medium", "warning", "requires approval", "delayed", "at risk"].includes(s)) return "warning";
  if (["low", "resolved", "approved", "active", "allowed", "executed", "available"].includes(s)) return "success";
  return "neutral";
}

function StatusTag({ value }) {
  return <Tag tone={severityTone(value)}>{value}</Tag>;
}

function AgentStatusDot({ status }) {
  const cls = status === "active" || status === "investigating" ? "ss-dot-active" : status === "complete" ? "ss-dot-success" : "ss-dot-idle";
  const pulsing = status === "active" || status === "investigating";
  return <span className={`ss-dot ${cls} ${pulsing ? "ss-pulse" : ""}`} aria-hidden="true" />;
}

// Status is never color-only: every state pairs a shape/icon with a text
// label, so it reads identically in dark, light and high-contrast modes
// and to anyone who can't perceive color.
const AGENT_STATUS_META = {
  idle: { icon: "⏳", label: "Waiting", cls: "ss-dot-idle", pulse: false },
  active: { icon: "◉", label: "Working", cls: "ss-dot-active", pulse: true },
  investigating: { icon: "◉", label: "Working", cls: "ss-dot-active", pulse: true },
  complete: { icon: "✓", label: "Completed", cls: "ss-dot-success", pulse: false },
  blocked: { icon: "✕", label: "Blocked", cls: "ss-dot-critical", pulse: false },
  failed: { icon: "⚠", label: "Failed", cls: "ss-dot-critical", pulse: false },
  replanning: { icon: "↻", label: "Replanning", cls: "ss-dot-active", pulse: true },
};

function AgentStatusIndicator({ status, name, compact = false }) {
  const meta = AGENT_STATUS_META[status] || AGENT_STATUS_META.idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span className={`ss-dot ${meta.cls} ${meta.pulse ? "ss-pulse" : ""}`} aria-hidden="true" />
      <span aria-hidden="true">{meta.icon}</span>
      <span>{name ? `${name} — ${meta.label}` : meta.label}</span>
    </span>
  );
}

function ReadAloudButton({ text, label }) {
  const a11y = useAccessibility();
  if (!a11y.ttsSupported) return null;
  const isThis = a11y.speaking;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        className="ss-btn"
        style={{ padding: "4px 8px", fontSize: "calc(11px * var(--ss-font-scale))" }}
        aria-label={`${a11y.t("read")}: ${label || a11y.t("accessibility")}`}
        onClick={() => (isThis ? a11y.stopSpeech() : a11y.speak(text))}
      >
        {isThis ? `■ ${a11y.t("stop")}` : `🔊 ${a11y.t("read")}`}
      </button>
      {isThis && (
        <button type="button" className="ss-btn" style={{ padding: "4px 8px", fontSize: "calc(11px * var(--ss-font-scale))" }}
          onClick={() => (a11y.paused ? a11y.resumeSpeech() : a11y.pauseSpeech())}>
          {a11y.paused ? `▶ ${a11y.t("resume")}` : `⏸ ${a11y.t("pause")}`}
        </button>
      )}
    </div>
  );
}

// Shared keyboard behavior for elements that act like a link/button but
// aren't a native <button> (e.g. a table row). Never leave a clickable
// div without keyboard equivalence.
function activateOnKey(handler) {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler(e);
    }
  };
}

function Panel({ title, eyebrow, right, children, className = "", padded = true }) {
  return (
    <div className={`ss-panel ${className}`}>
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid var(--border)" }}>
          <div>
            {eyebrow && <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 2 }}>{eyebrow}</div>}
            {title && <div style={{ fontSize: "calc(13px * var(--ss-font-scale))", fontWeight: 600 }}>{title}</div>}
          </div>
          {right}
        </div>
      )}
      <div style={padded ? { padding: 14 } : undefined}>{children}</div>
    </div>
  );
}

function KPI({ label, value, tone, sub }) {
  return (
    <div className="ss-panel" style={{ padding: "12px 14px" }}>
      <div className="ss-kpi-label">{label}</div>
      <div className="ss-kpi-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {sub && <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-dim)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: "calc(12px * var(--ss-font-scale))" }}>{text}</div>;
}

/* --------------------------------- LAYOUT ---------------------------------- */

const NAV = [
  { section: "Command", items: [
    { id: "command", label: "Command Center" },
    { id: "incidents", label: "Active Incidents" },
  ]},
  { section: "Operations", items: [
    { id: "inventory", label: "Inventory" },
    { id: "logistics", label: "Shipments & Routes" },
    { id: "suppliers", label: "Suppliers" },
  ]},
  { section: "AI Workforce", items: [
    { id: "workforce", label: "Agent Workforce" },
    { id: "activity", label: "Live Agent Activity" },
  ]},
  { section: "Decision", items: [
    { id: "decision", label: "Decision Intelligence" },
    { id: "plan", label: "Recovery Plans" },
  ]},
  { section: "Execution", items: [
    { id: "procurement", label: "Procurement" },
    { id: "finance", label: "Finance" },
  ]},
  { section: "Governance", items: [
    { id: "security", label: "Security Center" },
    { id: "audit", label: "Audit & Memory" },
  ]},
];

function ShieldMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
      <path d="M8 0L15.5 2.8V8.4C15.5 13 12.3 16.4 8 18C3.7 16.4 0.5 13 0.5 8.4V2.8L8 0Z" fill="var(--brand)" opacity="0.9" />
      <path d="M5.4 8.6L7.2 10.4L10.8 6.6" stroke="#04101f" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

function Sidebar({ view, setView, mobileOpen, setMobileOpen, agents }) {
  const a11y = useAccessibility();
  const SECTION_KEY = { Command: "nav_command", Operations: "nav_operations", "AI Workforce": "nav_workforce", Decision: "nav_decision", Execution: "nav_execution", Governance: "nav_governance" };
  const ITEM_KEY = {
    command: "command_center", incidents: "active_incidents", inventory: "inventory",
    logistics: "shipments_routes", suppliers: "suppliers", workforce: "agent_workforce",
    activity: "live_agent_activity", decision: "decision_intelligence", plan: "recovery_plans",
    procurement: "procurement", finance: "finance", security: "security_center", audit: "audit_memory",
  };
  const content = (
    <div className="ss-sidebar ss-scroll" style={{ width: 232, height: "100vh", overflowY: "auto", background: "var(--bg-elev)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 14px", borderBottom: "1px solid var(--border)" }}>
        <ShieldMark />
        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: ".04em", fontSize: "calc(13.5px * var(--ss-font-scale))" }}>{a11y.t("brand")}</div>
        <button className="ss-mobile-only" onClick={() => setMobileOpen(false)} aria-label={a11y.t("a11y_close")} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", fontSize: "calc(16px * var(--ss-font-scale))", cursor: "pointer", minHeight: "var(--control-min-h)", minWidth: "var(--control-min-h)" }}>✕</button>
      </div>
      <nav aria-label={a11y.t("brand")} style={{ flex: 1, paddingBottom: 12 }}>
        {NAV.map((sec) => (
          <div key={sec.section}>
            <div className="ss-nav-section">{a11y.t(SECTION_KEY[sec.section]) || sec.section}</div>
            {sec.items.map((it) => (
              <button
                key={it.id}
                type="button"
                className={`ss-nav-link ${view === it.id ? "active" : ""}`}
                aria-current={view === it.id ? "page" : undefined}
                onClick={() => { setView(it.id); setMobileOpen(false); }}
              >
                {a11y.t(ITEM_KEY[it.id]) || it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px" }}>
        <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 700, marginBottom: 6 }}>{a11y.t("workforce_status")}</div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {agents.map((a) => (
            <li key={a.id} style={{ padding: "2px 0", fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <AgentStatusIndicator status={a.status} name={a.name} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <div className="ss-desktop-only">{content}</div>
      {mobileOpen && (
        <div className="ss-mobile-only">
          <div className="ss-drawer-backdrop" onClick={() => setMobileOpen(false)} />
          <div style={{ position: "fixed", top: 0, left: 0, zIndex: 41 }}>{content}</div>
        </div>
      )}
    </>
  );
}

function GlobalSearch({ store, setView, setDetail }) {
  const a11y = useAccessibility();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.toLowerCase();
    const out = [];
    store.inventory.forEach((i) => { if (i.sku.toLowerCase().includes(query) || i.product.toLowerCase().includes(query)) out.push({ key: `sku-${i.sku}-${i.warehouse || ""}`, type: "SKU", label: `${i.sku} — ${i.product}`, go: () => { setView("inventory"); setDetail({ kind: "sku", id: i.sku }); } }); });
    store.suppliers.forEach((s) => { if (s.name.toLowerCase().includes(query)) out.push({ key: `supplier-${s.id}`, type: "Supplier", label: s.name, go: () => { setView("suppliers"); setDetail({ kind: "supplier", id: s.id }); } }); });
    store.routes.forEach((r) => { if (`${r.origin} ${r.destination}`.toLowerCase().includes(query)) out.push({ key: `route-${r.id}`, type: "Route", label: `${r.origin} → ${r.destination}`, go: () => setView("logistics") }); });
    store.purchaseOrders.forEach((p) => { if (p.id.toLowerCase().includes(query) || p.supplier.toLowerCase().includes(query)) out.push({ key: `po-${p.id}`, type: "Purchase Order", label: `${p.id} — ${p.supplier}`, go: () => setView("procurement") }); });
    store.agents.forEach((a) => { if (a.name.toLowerCase().includes(query)) out.push({ key: `agent-${a.id}`, type: "Agent", label: a.name, go: () => { setView("workforce"); } }); });
    if (store.incident.id.toLowerCase().includes(query) || store.incident.title.toLowerCase().includes(query)) out.push({ key: `incident-${store.incident.id}`, type: "Incident", label: `${store.incident.id} — ${store.incident.title}`, go: () => setView("command") });
    return out.slice(0, 8);
  }, [q, store, setView, setDetail]);

  const handleMic = () => {
    if (a11y.listening) { a11y.stopListening(); return; }
    a11y.startListening((transcript) => setQ(transcript));
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="ss-input"
          style={{ width: "100%" }}
          placeholder={a11y.t("search_placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={a11y.t("search_placeholder")}
        />
        <button
          type="button"
          className="ss-btn"
          onClick={handleMic}
          aria-pressed={a11y.listening}
          aria-label={a11y.t("voice_input")}
          title={a11y.sttSupported ? a11y.t("voice_input") : a11y.t("speech_unsupported")}
          style={{ flex: "none" }}
        >
          {a11y.listening ? "●" : "🎤"}
        </button>
      </div>
      {a11y.listening && <div role="status" style={{ position: "absolute", top: "calc(100% + 4px)", fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--brand)" }}>{a11y.t("listening")}</div>}
      {a11y.sttError && <div role="alert" style={{ position: "absolute", top: "calc(100% + 4px)", fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--critical)" }}>{a11y.sttError}</div>}
      {results.length > 0 && (
        <div className="ss-panel-alt ss-fade-in" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, maxHeight: 320, overflowY: "auto" }}>
          {results.map((r, idx) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { r.go(); setQ(""); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, background: "none", border: "none", borderBottomWidth: "1px", borderBottomStyle: "solid", borderBottomColor: "var(--border)", color: "var(--text)", font: "inherit" }}
            >
              <span style={{ fontSize: "calc(12.5px * var(--ss-font-scale))" }}>{r.label}</span>
              <Tag tone="neutral">{r.type}</Tag>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({ store, setView, setDetail, setMobileOpen }) {
  const a11y = useAccessibility();
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", position: "relative" }}>
      <button className="ss-mobile-only ss-btn" onClick={() => setMobileOpen(true)} aria-label={a11y.t("brand")}>☰</button>
      <GlobalSearch store={store} setView={setView} setDetail={setDetail} />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <div className="ss-desktop-only" style={{ fontSize: "calc(11.5px * var(--ss-font-scale))", color: "var(--text-dim)" }}>
          {a11y.t("emergency_budget_available")} <span className="mono" style={{ color: "var(--text)" }}>${(store.finance.emergencyBudget - store.finance.committedSpend).toLocaleString()}</span> {a11y.t("available_suffix")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "calc(11.5px * var(--ss-font-scale))" }}>
          <span className="ss-dot ss-dot-active" aria-hidden="true" />
          <span className="mono">{store.agents.filter((a) => a.status !== "idle").length} {a11y.t("agents_active")}</span>
        </div>
        <button
          type="button"
          className="ss-btn"
          onClick={() => a11y.update({ theme: a11y.theme === "dark" ? "light" : "dark" })}
          aria-label={a11y.theme === "dark" ? `${a11y.t("a11y_theme")}: ${a11y.t("a11y_light")}` : `${a11y.t("a11y_theme")}: ${a11y.t("a11y_dark")}`}
          title={a11y.t("a11y_theme")}
        >
          {a11y.theme === "dark" ? "🌙" : "☀"}
        </button>
        <button
          type="button"
          className="ss-btn"
          onClick={() => a11y.update({ language: a11y.language === "en" ? "hi" : "en" })}
          aria-label={`${a11y.t("a11y_language")}: ${a11y.language === "en" ? "English" : "हिन्दी"}`}
          title={a11y.t("a11y_language")}
        >
          🌐 {a11y.language === "en" ? "EN" : "हि"}
        </button>
      </div>
    </header>
  );
}

function AccessibilityFAB({ store }) {
  const a11y = useAccessibility();
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={panelOpen}
        aria-label={a11y.t("accessibility")}
        title={a11y.t("accessibility")}
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 60,
          width: "var(--control-min-h)", height: "var(--control-min-h)", minWidth: 44, minHeight: 44,
          borderRadius: "50%", border: "2px solid var(--brand)", background: "var(--panel)",
          color: "var(--brand)", fontSize: "calc(20px * var(--ss-font-scale))", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,.4)",
        }}
      >
        ♿
      </button>
      {panelOpen && <AccessibilityPanel onClose={() => setPanelOpen(false)} store={store} anchor="fab" />}
    </>
  );
}

function AccessibilityPanel({ onClose, store, anchor }) {
  const a11y = useAccessibility();
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector("button,input,select")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "7px 0" }}>
      <span style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{label}</span>
      {children}
    </div>
  );
  const Seg = ({ options, value, onChange, ariaLabel }) => (
    <div role="group" aria-label={ariaLabel} style={{ display: "inline-flex", border: "1px solid var(--border-strong)" }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          aria-pressed={value === val}
          onClick={() => onChange(val)}
          style={{
            padding: "5px 10px", fontSize: "calc(11px * var(--ss-font-scale))", fontWeight: 600, cursor: "pointer",
            border: "none", background: value === val ? "var(--brand)" : "var(--panel-alt)", color: value === val ? "#04101f" : "var(--text)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={a11y.t("accessibility")}
      className="ss-panel ss-fade-in"
      style={anchor === "fab"
        ? { position: "fixed", right: 20, bottom: 76, zIndex: 61, width: 320, maxHeight: "70vh", overflowY: "auto" }
        : { position: "absolute", top: "calc(100% + 6px)", right: 18, width: 320, zIndex: 50, maxHeight: "80vh", overflowY: "auto" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <strong style={{ fontSize: "calc(12.5px * var(--ss-font-scale))", letterSpacing: ".04em", textTransform: "uppercase" }}>{a11y.t("accessibility")}</strong>
        <button type="button" className="ss-btn" style={{ padding: "3px 9px" }} onClick={onClose} aria-label={a11y.t("a11y_close")}>✕</button>
      </div>
      <div style={{ padding: "6px 14px 14px" }}>
        <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)", fontWeight: 700, marginTop: 10 }}>{a11y.t("a11y_display")}</div>
        <Row label={`${a11y.t("a11y_brightness")} (${a11y.brightness}%)`}>
          <input type="range" min="50" max="120" step="5" value={a11y.brightness} aria-label={a11y.t("a11y_brightness")}
            onChange={(e) => a11y.update({ brightness: Number(e.target.value) })} style={{ width: 130 }} />
        </Row>
        <Row label={a11y.t("a11y_contrast")}>
          <Seg ariaLabel={a11y.t("a11y_contrast")} value={a11y.highContrast ? "high" : "normal"} onChange={(v) => a11y.update({ highContrast: v === "high" })} options={[["normal", a11y.t("a11y_normal")], ["high", a11y.t("a11y_high")]]} />
        </Row>

        <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)", fontWeight: 700, marginTop: 12 }}>{a11y.t("a11y_typography")}</div>
        <Row label={a11y.t("a11y_text_size")}>
          <Seg ariaLabel={a11y.t("a11y_text_size")} value={a11y.fontScale >= 1.2 ? "1.2" : a11y.fontScale >= 1.1 ? "1.1" : "1"} onChange={(v) => a11y.update({ fontScale: Number(v) })}
            options={[["1", "100%"], ["1.1", "110%"], ["1.2", "120%"]]} />
        </Row>
        <Row label={a11y.t("a11y_font")}>
          <Seg ariaLabel={a11y.t("a11y_font")} value={a11y.dyslexiaFont ? "dys" : "std"} onChange={(v) => a11y.update({ dyslexiaFont: v === "dys" })} options={[["std", a11y.t("a11y_standard")], ["dys", a11y.t("a11y_dyslexia")]]} />
        </Row>
        <Row label={a11y.t("a11y_controls")}>
          <Seg ariaLabel={a11y.t("a11y_controls")} value={a11y.largeControls ? "large" : "normal"} onChange={(v) => a11y.update({ largeControls: v === "large" })} options={[["normal", a11y.t("a11y_normal")], ["large", a11y.t("a11y_large")]]} />
        </Row>

        <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)", fontWeight: 700, marginTop: 12 }}>{a11y.t("a11y_motion")}</div>
        <Row label={a11y.t("a11y_reduced_motion")}>
          <Seg ariaLabel={a11y.t("a11y_reduced_motion")} value={a11y.reducedMotion ? "on" : "off"} onChange={(v) => a11y.update({ reducedMotion: v === "on" })} options={[["off", a11y.t("a11y_off")], ["on", a11y.t("a11y_on")]]} />
        </Row>

        <div style={{ fontSize: "calc(10px * var(--ss-font-scale))", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)", fontWeight: 700, marginTop: 12 }}>{a11y.t("a11y_voice")}</div>
        <Row label={a11y.t("a11y_speech_input")}>
          <span style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: a11y.sttSupported ? "var(--success)" : "var(--text-faint)" }}>
            {a11y.sttSupported ? `✓ ${a11y.t("a11y_on")}` : `✕ ${a11y.t("a11y_off")}`}
          </span>
        </Row>
        <Row label={a11y.t("a11y_read_aloud")}>
          <span style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: a11y.ttsSupported ? "var(--success)" : "var(--text-faint)" }}>
            {a11y.ttsSupported ? `✓ ${a11y.t("a11y_on")}` : `✕ ${a11y.t("a11y_off")}`}
          </span>
        </Row>
        <Row label={a11y.t("a11y_speech_rate")}>
          <Seg ariaLabel={a11y.t("a11y_speech_rate")} value={String(a11y.speechRate)} onChange={(v) => a11y.update({ speechRate: Number(v) })}
            options={[["0.75", a11y.t("a11y_slow")], ["1", a11y.t("a11y_normal")], ["1.3", a11y.t("a11y_fast")]]} />
        </Row>
        {a11y.ttsSupported && a11y.voices.length > 0 && (
          <Row label={a11y.t("a11y_voice_select")}>
            <select className="ss-input" style={{ maxWidth: 150 }} value={a11y.voiceURI} onChange={(e) => a11y.update({ voiceURI: e.target.value })}>
              <option value="">{a11y.t("a11y_system_default")}</option>
              {a11y.voices.map((v) => <option key={`${v.voiceURI || "voice"}-${v.name}-${v.lang}`} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          </Row>
        )}
        <Row label={a11y.t("a11y_announce_critical")}>
          <Seg ariaLabel={a11y.t("a11y_announce_critical")} value={a11y.announceCritical ? "on" : "off"} onChange={(v) => a11y.update({ announceCritical: v === "on" })} options={[["off", a11y.t("a11y_off")], ["on", a11y.t("a11y_on")]]} />
        </Row>

        <button type="button" className="ss-btn" style={{ width: "100%", marginTop: 14 }} onClick={a11y.reset}>{a11y.t("a11y_reset")}</button>
      </div>
    </div>
  );
}

/* ------------------------------ COMMAND CENTER ----------------------------- */

function IncidentHero({ store, actions, setView, setDetail }) {
  const a11y = useAccessibility();
  const i = store.incident;
  const supplier = store.suppliers.find((s) => s.id === i.activeSupplierId);
  const route = store.routes.find((r) => r.id === i.activeRouteId);
  const canRun = store.runPhase === "idle";
  const canReplan = store.runPhase === "resolved";
  const resolved = i.status === "RESOLVED";
  const [commandText, setCommandText] = useState("");
  const handleExecuteCommand = () => {
    if (!canRun || !commandText.trim()) return;
    actions.runCommand(commandText);
    setCommandText("");
  };
  const summary = `${i.id}. ${a11y.tStatus(i.severity)}. ${i.title}. Status: ${i.status}. Inventory runway ${formatRunway(i.runwayDays)}. Shipment delay ${i.delayDays} days. Stockout exposure ${a11y.tStatus(i.stockoutExposure)}.${supplier ? ` Active supplier: ${supplier.name}.` : ""}`;

  return (
    <Panel padded={false} className="ss-fade-in">
      <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{i.id}</span>
          <StatusTag value={i.severity} />
          <Tag tone="info">{i.status}</Tag>
          {i.replanCount > 0 && <Tag tone="warning">REPLANNED ×{i.replanCount}</Tag>}
          <span style={{ marginLeft: "auto" }}><ReadAloudButton text={summary} label={i.id} /></span>
        </div>
        <button
          type="button"
          style={{ fontSize: "calc(17px * var(--ss-font-scale))", fontFamily: "inherit", fontWeight: 600, marginBottom: 14, cursor: "pointer", background: "none", border: "none", padding: 0, color: "var(--text)", textAlign: "left", display: "block" }}
          onClick={() => { setView("inventory"); setDetail({ kind: "sku", id: i.sku }); }}
        >
          {i.title}
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          <KPI label="Inventory Runway" value={formatRunway(i.runwayDays)} tone={i.runwayDays <= 4 ? "critical" : "success"} />
          <KPI label="Shipment Delay" value={i.delayDays > 0 ? `+${i.delayDays}d` : "0d"} tone={i.delayDays > 0 ? "warning" : "success"} />
          <KPI label="Stockout Exposure" value={i.stockoutExposure} tone={i.stockoutExposure === "HIGH" ? "critical" : i.stockoutExposure === "LOW" ? "success" : "warning"} />
          <KPI label="Active Supplier" value={supplier ? supplier.name.split(" — ")[0] : "—"} />
          <KPI label="Active Route" value={route ? route.mode.split(" ")[0] : "—"} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 16 }}>
        <button className="ss-btn ss-btn-primary" disabled={!canRun} onClick={actions.runAutonomousRecovery}>
          {store.runPhase === "recovering" ? "RECOVERY IN PROGRESS…" : "▶ RUN AUTONOMOUS RECOVERY"}
        </button>
        <button className="ss-btn ss-btn-danger" disabled={!canReplan} onClick={actions.injectSecondDisruption}>
          {store.runPhase === "replanning" ? "REPLANNING…" : "⚠ INJECT SECOND DISRUPTION"}
        </button>
        {resolved && <div style={{ alignSelf: "center", fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--success)" }}>✓ Incident resolved — stockout averted</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "0 16px 16px" }}>
        <span style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".05em", flex: "none" }}>Command Agent</span>
        <input
          className="ss-input"
          style={{ flex: 1, minWidth: 220 }}
          placeholder="Describe an incident or instruction…"
          value={commandText}
          disabled={!canRun}
          onChange={(e) => setCommandText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleExecuteCommand(); }}
          aria-label="Command Agent instruction"
        />
        <button className="ss-btn ss-btn-primary" disabled={!canRun || !commandText.trim()} onClick={handleExecuteCommand}>
          {store.runPhase === "recovering" ? "EXECUTING…" : "EXECUTE"}
        </button>
      </div>
    </Panel>
  );
}

function AgentCard({ agent, onClick }) {
  return (
    <div
      className="ss-panel-alt ss-fade-in"
      style={{ padding: 12, cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name} — ${(AGENT_STATUS_META[agent.status] || AGENT_STATUS_META.idle).label}. ${agent.task}`}
      onClick={onClick}
      onKeyDown={activateOnKey(onClick)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: "calc(12.5px * var(--ss-font-scale))" }}>
          <AgentStatusIndicator status={agent.status} />{agent.name}
        </div>
        <Tag tone={agent.status === "idle" ? "neutral" : agent.status === "complete" ? "success" : "info"}>{(AGENT_STATUS_META[agent.status] || AGENT_STATUS_META.idle).label}</Tag>
      </div>
      <div style={{ fontSize: "calc(11.5px * var(--ss-font-scale))", color: "var(--text-dim)", marginBottom: 4 }}>{agent.task}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "calc(10.5px * var(--ss-font-scale))", color: "var(--text-faint)" }}>
        <span className="mono">{agent.tool}</span>
        {agent.confidence != null && <span className="mono">conf {Math.round(agent.confidence * 100)}%</span>}
      </div>
    </div>
  );
}

function LiveAgentPanel({ agents, onAgentClick }) {
  return (
    <Panel title="Live Agent Panel" eyebrow="AI Workforce">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
        {agents.map((a) => <AgentCard key={a.id} agent={a} onClick={() => onAgentClick(a)} />)}
      </div>
    </Panel>
  );
}

function IncidentTimeline({ timeline }) {
  return (
    <Panel title="Incident Timeline" eyebrow="Live — updates as agents act">
      <div className="ss-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
        {timeline.map((t, idx) => (
          <div key={`${t.time}-${t.agent}-${t.action}-${t.tool || ""}-${idx}`} className="ss-fade-in" style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: idx < timeline.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span className="mono" style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", flex: "none", width: 42 }}>{t.time}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "calc(12px * var(--ss-font-scale))" }}><strong style={{ fontWeight: 600 }}>{t.agent}:</strong> {t.action}</div>
              {t.result && <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{t.tool ? `${t.tool} → ` : ""}{t.result}</div>}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CommandCenter({ store, actions, setView, setDetail }) {
  const criticalShipments = store.incident.delayDays > 0 ? 1 : 0;
  const invAtRisk = store.inventory.filter((i) => i.qty / i.dailyDemand <= 5).length;
  const activeAgents = store.agents.filter((a) => a.status !== "idle").length;
  const pendingApprovals = store.finance.committedSpend >= store.finance.policyThreshold ? 1 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <KPI label="Active Incidents" value="1" tone="critical" />
        <KPI label="Critical Shipments" value={criticalShipments} tone={criticalShipments ? "warning" : "success"} />
        <KPI label="Inventory At Risk" value={invAtRisk} tone={invAtRisk ? "warning" : "success"} />
        <KPI label="Active Agents" value={activeAgents} />
        <KPI label="Recovery Actions" value={store.purchaseOrders.length} />
        <KPI label="Pending Approvals" value={pendingApprovals} tone={pendingApprovals ? "warning" : "success"} />
      </div>
      <IncidentHero store={store} actions={actions} setView={setView} setDetail={setDetail} />
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }} className="ss-cc-grid">
        <IncidentTimeline timeline={store.timeline} />
        <LiveAgentPanel agents={store.agents} onAgentClick={() => setView("workforce")} />
      </div>
    </div>
  );
}

/* --------------------------------- INVENTORY -------------------------------- */

function InventoryPage({ store, detail, setDetail }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const filtered = store.inventory.filter((i) => (filter === "All" || i.criticality === filter) && (i.sku.toLowerCase().includes(q.toLowerCase()) || i.product.toLowerCase().includes(q.toLowerCase())));
  const selected = detail?.kind === "sku" ? store.inventory.find((i) => i.sku === detail.id) : null;

  if (selected) {
    const runway = calculateRunway(selected.qty, selected.dailyDemand);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><a className="ss-link" onClick={() => setDetail(null)}>← Back to Inventory</a></div>
        <Panel title={selected.product} eyebrow={selected.sku}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
            <KPI label="Current Stock" value={selected.qty.toLocaleString()} />
            <KPI label="Daily Demand" value={selected.dailyDemand.toLocaleString()} />
            <KPI label="Runway" value={runway == null ? "—" : `${Math.round(runway)}d`} tone={runway != null && runway <= 5 ? "critical" : "success"} />
            <KPI label="Safety Stock" value={selected.safetyStock.toLocaleString()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Incoming Shipments</div>
              {selected.incident ? (
                <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))" }}>1 expedited replenishment in transit via active recovery plan.</div>
              ) : <EmptyState text="No incoming shipments scheduled." />}
            </div>
            <div>
              <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Affected Incidents</div>
              {selected.incident ? <Tag tone="critical">{selected.incident}</Tag> : <EmptyState text="None." />}
            </div>
          </div>
          {selected.incident && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--panel-alt)", border: "1px solid var(--border-strong)" }}>
              <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase" }}>Recommended Action</div>
              <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))" }}>Evaluate an expedited shipment reroute first; use emergency procurement only if rerouting cannot cover the runway.</div>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title="Inventory" eyebrow="Supply & Inventory">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input className="ss-input" placeholder="Search SKU or product…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["All", "Critical", "Medium", "Low"].map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>SKU</th><th>Product</th><th>Warehouse</th><th>Qty</th><th>Daily Demand</th><th>Runway</th><th>Safety Stock</th><th>Criticality</th></tr></thead>
            <tbody>
              {filtered.map((i) => {
                const runway = Number.isFinite(i.runwayDays)
                  ? i.runwayDays
                  : calculateRunway(i.qty, i.dailyDemand);
                return (
                  <tr key={`${i.inventoryId || i.sku}-${i.warehouse || ""}`} tabIndex={0} role="button" onClick={() => setDetail({ kind: "sku", id: i.sku })} onKeyDown={activateOnKey(() => setDetail({ kind: "sku", id: i.sku }))}>
                    <td className="mono">{i.sku}</td>
                    <td>{i.product}</td>
                    <td>{i.warehouse}</td>
                    <td className="mono">{i.qty.toLocaleString()}</td>
                    <td className="mono">{i.dailyDemand.toLocaleString()}</td>
                    <td
                      className="mono"
                      style={{
                        color:
                          runway != null && runway <= 5
                            ? "var(--critical)"
                            : "var(--text)"
                      }}
                    >
                      {runway == null ? "—" : `${runway.toFixed(2)}d`}
                    </td>
                    <td className="mono">{i.safetyStock.toLocaleString()}</td>
                    <td><StatusTag value={i.criticality} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8}><EmptyState text="No matching SKUs." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- SUPPLIERS -------------------------------- */

function SupplierProfile({ supplier, store, setDetail }) {
  const relatedIncident = store.incident.activeSupplierId === supplier.id;
  const pos = store.purchaseOrders.filter((p) => p.supplier.includes(supplier.name.split(" — ")[0]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><a className="ss-link" onClick={() => setDetail(null)}>← Back to Suppliers</a></div>
      <Panel title={supplier.name} eyebrow={supplier.location}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
          <KPI label="Reliability" value={`${supplier.reliability}%`} tone={supplier.reliability >= 85 ? "success" : supplier.reliability >= 70 ? "warning" : "critical"} />
          <KPI label="Risk" value={supplier.risk} tone={severityTone(supplier.risk) === "critical" ? "critical" : severityTone(supplier.risk) === "warning" ? "warning" : "success"} />
          <KPI label="Capacity" value={supplier.capacity} />
          <KPI label="Lead Time" value={`${supplier.leadTimeDays}d`} />
          <KPI label="Status" value={supplier.status} tone={supplier.status === "Unavailable" ? "critical" : "success"} />
        </div>
        {relatedIncident && (
          <div style={{ padding: 12, background: "var(--info-dim)", border: "1px solid var(--brand)", marginBottom: 14, fontSize: "calc(12.5px * var(--ss-font-scale))" }}>
            Currently the active recovery supplier for <strong>{store.incident.id}</strong>.
          </div>
        )}
        <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>Active Purchase Orders</div>
        {pos.length ? pos.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "calc(12.5px * var(--ss-font-scale))" }}>
            <span className="mono">{p.id}</span><span>{p.quantity.toLocaleString()} units</span><span className="mono">${p.total.toLocaleString()}</span><StatusTag value={p.status} />
          </div>
        )) : <EmptyState text="No purchase orders with this supplier yet." />}
      </Panel>
    </div>
  );
}

function SupplierPage({ store, detail, setDetail }) {
  const [filter, setFilter] = useState("All");
  const selected = detail?.kind === "supplier" ? store.suppliers.find((s) => s.id === detail.id) : null;
  if (selected) return <SupplierProfile supplier={selected} store={store} setDetail={setDetail} />;

  const filtered = store.suppliers.filter((s) => filter === "All" || (filter === "At Risk" ? s.risk !== "Low" : filter === "Unavailable" ? s.status === "Unavailable" : s.status === "Active"));
  const altSuppliers = store.suppliers.filter((s) => ["sup-a", "sup-b", "sup-c"].includes(s.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {store.incident.status !== "RESOLVED" || store.incident.replanCount === 0 ? (
        <Panel title="Alternative Suppliers — Active Incident" eyebrow={store.incident.id}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {altSuppliers.map((s) => (
              <div key={s.id} className="ss-panel-alt" style={{ padding: 12, cursor: "pointer" }} tabIndex={0} role="button" onClick={() => setDetail({ kind: "supplier", id: s.id })} onKeyDown={activateOnKey(() => setDetail({ kind: "supplier", id: s.id }))}>
                <div style={{ fontWeight: 600, fontSize: "calc(12.5px * var(--ss-font-scale))", marginBottom: 6 }}>{s.name.split(" — ")[0]}</div>
                <div style={{ fontSize: "calc(11.5px * var(--ss-font-scale))", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span>Cost: <strong className="mono">${s.cost.toLocaleString()}</strong></span>
                  <span>ETA: <strong className="mono">{s.leadTimeDays}d</strong></span>
                  <span>Risk: <StatusTag value={s.risk} /></span>
                  <span>Stockout protection: <StatusTag value={s.stockoutProtection ? "YES" : "NO"} /></span>
                  {s.status === "Unavailable" && <Tag tone="critical">UNAVAILABLE</Tag>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
      <Panel title="Supplier Network" eyebrow="Supplier Management">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["All", "Active", "At Risk", "Unavailable"].map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>Supplier</th><th>Location</th><th>Reliability</th><th>Risk</th><th>Capacity</th><th>Lead Time</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} tabIndex={0} role="button" onClick={() => setDetail({ kind: "supplier", id: s.id })} onKeyDown={activateOnKey(() => setDetail({ kind: "supplier", id: s.id }))}>
                  <td>{s.name}</td><td>{s.location}</td>
                  <td className="mono">{s.reliability}%</td>
                  <td><StatusTag value={s.risk} /></td>
                  <td>{s.capacity}</td>
                  <td className="mono">{s.leadTimeDays}d</td>
                  <td>{s.priceIndex}</td>
                  <td><StatusTag value={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- RISK -------------------------------- */

function RiskPage({ store }) {
  const decisions = store.decisions;
  const latest = decisions[decisions.length - 1];
  const options = latest?.options || [];
  const overall = latest ? (latest.status === "SELECTED" ? 25 : 80) : null;
  const breakdown = latest ? [
    { label: "Supply Risk", value: Math.round(options.reduce((m, o) => Math.max(m, o.stockout ? 80 : 20), 0)) },
    { label: "Transport Risk", value: Math.round(options.reduce((m, o) => Math.max(m, o.risk === "High" ? 80 : o.risk === "Medium" ? 50 : 20), 0)) },
    { label: "Supplier Risk", value: Math.round(options.reduce((m, o) => Math.max(m, o.risk === "High" ? 80 : o.risk === "Medium" ? 50 : 20), 0)) },
    { label: "Financial Risk", value: Math.round(options.reduce((m, o) => Math.max(m, o.cost > store.finance.maxSingleOrderUsd ? 85 : o.cost > store.finance.policyThreshold ? 55 : 20), 0)) },
    { label: "Stockout Risk", value: Math.round(options.reduce((m, o) => Math.max(m, o.stockout ? 90 : 15), 0)) },
    { label: "Execution Risk", value: latest.status === "SELECTED" ? 20 : 85 },
  ] : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title="Overall Recovery Risk" eyebrow="Risk Intelligence">
        {latest ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
              <div className="ss-kpi-value" style={{ fontSize: "calc(34px * var(--ss-font-scale))", color: overall >= 60 ? "var(--critical)" : overall >= 35 ? "var(--warning)" : "var(--success)" }}>{overall}</div>
              <div style={{ color: "var(--text-dim)", fontSize: "calc(12px * var(--ss-font-scale))" }}>/ 100 — derived from the latest real recovery options</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "calc(11.5px * var(--ss-font-scale))", marginBottom: 3 }}><span>{b.label}</span><span className="mono">{b.value}</span></div>
                  <div style={{ height: 6, background: "var(--bg-elev)", border: "1px solid var(--border)" }}><div style={{ height: "100%", width: `${b.value}%`, background: b.value >= 60 ? "var(--critical)" : b.value >= 35 ? "var(--warning)" : "var(--success)" }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : <EmptyState text="Run autonomous recovery to generate real risk analysis." />}
      </Panel>
      <Panel title="Scenario Comparison" eyebrow={latest ? latest.id.toUpperCase() : "No active decision"}>
        {latest ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {latest.options.map((o) => (
              <div key={`${o.supplierId}-${o.routeId}`} className="ss-panel-alt" style={{ padding: 12, borderColor: o.feasible ? "var(--success)" : "var(--border)" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{o.label}</div>
                <div style={{ fontSize: "calc(11.5px * var(--ss-font-scale))", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span>Cost: <span className="mono">${Number(o.cost).toLocaleString()}</span></span>
                  <span>ETA: <span className="mono">{o.etaDays}d</span></span>
                  <span>Risk: <StatusTag value={o.risk} /></span>
                  <span style={{ marginTop: 3 }}>{o.note}</span>
                </div>
                <div style={{ marginTop: 8 }}><Tag tone={o.feasible ? "success" : "critical"}>{o.feasible ? "FEASIBLE" : "REJECTED"}</Tag></div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="Run autonomous recovery to generate scenario comparisons." />}
      </Panel>
    </div>
  );
}

/* --------------------------------- FINANCE -------------------------------- */

function FinancePage({ store }) {
  const { emergencyBudget, committedSpend, policyThreshold, maxSingleOrderUsd } = store.finance;
  const available = Number(emergencyBudget || 0) - Number(committedSpend || 0);
  const latest = store.decisions[store.decisions.length - 1];
  const status = committedSpend === 0 ? "NO ACTIVE REQUEST" : committedSpend < policyThreshold ? "APPROVED" : committedSpend <= maxSingleOrderUsd ? "REQUIRES APPROVAL" : "BLOCKED";
  const options = latest?.options || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <KPI label="Emergency Budget" value={`$${Number(emergencyBudget || 0).toLocaleString()}`} />
        <KPI label="Committed Spend" value={`$${Number(committedSpend || 0).toLocaleString()}`} tone={committedSpend > 0 ? "warning" : undefined} />
        <KPI label="Available Budget" value={`$${Number(available).toLocaleString()}`} tone="success" />
        <KPI label="Auto-Authorization Threshold" value={`$${Number(policyThreshold || 0).toLocaleString()}`} />
        <KPI label="Maximum Single Order" value={`$${Number(maxSingleOrderUsd || 0).toLocaleString()}`} />
      </div>
      <Panel title="Current Recovery Request" eyebrow="Finance">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
          <div><div className="ss-kpi-label">Requested</div><div className="ss-kpi-value">${Number(committedSpend || 0).toLocaleString()}</div></div>
          <div><div className="ss-kpi-label">Auto-Authorization</div><div className="ss-kpi-value">${Number(policyThreshold || 0).toLocaleString()}</div></div>
          <div><div className="ss-kpi-label">Status</div><div style={{ marginTop: 4 }}><StatusTag value={status} /></div></div>
        </div>
        {latest && <div style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{status === "APPROVED" ? "The selected request is within the auto-authorization threshold." : status === "REQUIRES APPROVAL" ? "The request is within the maximum order limit but requires finance/human approval." : status === "BLOCKED" ? "The request exceeds the maximum single-order policy limit." : "No executable recovery request is currently committed."}</div>}
      </Panel>
      <Panel title="Financial Impact by Real Option" eyebrow="Decision Evidence">
        {options.length ? <div className="ss-table-wrap"><table className="ss-table"><thead><tr><th>Option</th><th>Total Cost</th><th>Policy</th><th>Feasibility</th></tr></thead><tbody>{options.map((o) => <tr key={`${o.supplierId}-${o.routeId}`}><td>{o.label}</td><td className="mono">${Number(o.cost).toLocaleString()}</td><td>{o.cost <= policyThreshold ? <Tag tone="success">AUTO</Tag> : o.cost <= maxSingleOrderUsd ? <Tag tone="warning">APPROVAL</Tag> : <Tag tone="critical">BLOCKED</Tag>}</td><td><Tag tone={o.feasible ? "success" : "critical"}>{o.feasible ? "FEASIBLE" : "REJECTED"}</Tag></td></tr>)}</tbody></table></div> : <EmptyState text="Run autonomous recovery to generate real financial options." />}
      </Panel>
    </div>
  );
}

/* --------------------------------- LOGISTICS -------------------------------- */

function LogisticsPage({ store, actions }) {
  const [filter, setFilter] = useState("All");
  const filtered = store.routes.filter((r) => filter === "All" || (filter === "Delayed" ? r.status === "Delayed" : filter === "At Risk" ? r.status === "Disrupted" : r.status === "Available"));
  const selectRoute = (id) => {
    if (store.routes.find((r) => r.id === id)?.status === "Available") {
      store.setIncident((i) => ({ ...i, activeRouteId: id }));
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title="Current Shipment" eyebrow={store.incident.id}>
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
          <div><div className="ss-kpi-label">Origin</div><div className="ss-kpi-value" style={{ fontSize: "calc(16px * var(--ss-font-scale))" }}>{store.incident.origin || "—"}</div></div>
          <div style={{ alignSelf: "center", color: "var(--text-faint)" }}>→</div>
          <div><div className="ss-kpi-label">Destination</div><div className="ss-kpi-value" style={{ fontSize: "calc(16px * var(--ss-font-scale))" }}>{store.incident.destination || "—"}</div></div>
          <div><div className="ss-kpi-label">Status</div><div style={{ marginTop: 4 }}><StatusTag value={store.incident.status} /></div></div>
        </div>
      </Panel>
      <Panel title="Route Network" eyebrow="Logistics" right={
        <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["All", "Available", "Delayed", "At Risk"].map((f) => <option key={f}>{f}</option>)}
        </select>
      }>
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>Route</th><th>Mode</th><th>ETA</th><th>Cost</th><th>Risk</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.origin} → {r.destination}</td>
                  <td>{r.mode}</td>
                  <td className="mono">{r.etaDays}d</td>
                  <td className="mono">${(r.cost ?? 0).toLocaleString()}</td>
                  <td><StatusTag value={r.risk} /></td>
                  <td>{r.capacity}</td>
                  <td><StatusTag value={r.status} /></td>
                  <td>
                    {store.incident.activeRouteId === r.id ? <Tag tone="info">SELECTED</Tag> :
                      r.status === "Available" ? <button className="ss-btn" onClick={(e) => { e.stopPropagation(); selectRoute(r.id); }}>Select</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- PROCUREMENT -------------------------------- */

function ProcurementPage({ store }) {
  const pending = store.purchaseOrders.filter((p) => p.status === "AWAITING EXECUTION");
  const approved = store.purchaseOrders.filter((p) => p.status !== "AWAITING EXECUTION");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title="Current Recovery Procurement" eyebrow={store.incident.id}>
        {store.purchaseOrders.length === 0 ? <EmptyState text={store.incident.status === "RESOLVED" && store.incident.activeRouteId ? "No purchase order required — recovery used an approved shipment reroute." : "No procurement action taken yet. Run autonomous recovery to generate one."} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {store.purchaseOrders.map((po) => (
              <div key={po.id} className="ss-panel-alt" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                <div><div className="ss-kpi-label">PO</div><div className="mono">{po.id}</div></div>
                <div><div className="ss-kpi-label">Supplier</div><div>{po.supplier}</div></div>
                <div><div className="ss-kpi-label">Quantity</div><div className="mono">{po.quantity.toLocaleString()}</div></div>
                <div><div className="ss-kpi-label">Total</div><div className="mono">${po.total.toLocaleString()}</div></div>
                <div><div className="ss-kpi-label">Status</div><StatusTag value={po.status} /></div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Approval Chain" eyebrow="Policy: Emergency Procurement Authorization">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Finance Agent Review", "Policy Threshold Check", "Auto-Authorization", "Execution"].map((step, idx) => (
            <div key={step} className="ss-panel-alt" style={{ padding: "8px 12px", fontSize: "calc(11.5px * var(--ss-font-scale))", display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`ss-dot ${store.purchaseOrders.length ? "ss-dot-success" : "ss-dot-idle"}`} /> {idx + 1}. {step}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Purchase Order History" eyebrow="All Requests">
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>PO</th><th>Supplier</th><th>Quantity</th><th>Total</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {store.purchaseOrders.length === 0 ? <tr><td colSpan={6}><EmptyState text="No purchase orders yet." /></td></tr> :
                store.purchaseOrders.map((po) => (
                  <tr key={po.id} style={{ cursor: "default" }}>
                    <td className="mono">{po.id}</td><td>{po.supplier}</td><td className="mono">{po.quantity.toLocaleString()}</td>
                    <td className="mono">${po.total.toLocaleString()}</td><td><StatusTag value={po.status} /></td><td className="mono">{po.createdAt}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- AGENT WORKFORCE -------------------------------- */

/* Agent Workforce — the agent registry/roster: who the agents are, their
   role, permissions and current readiness. A directory, not a feed. */
function AgentWorkforce({ store }) {
  const [filter, setFilter] = useState("All");
  const filtered = store.agents.filter((a) => filter === "All" || (filter === "Active" ? a.status !== "idle" : filter === "Idle" ? a.status === "idle" : false));
  const activeCount = store.agents.filter((a) => a.status !== "idle").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <KPI label="Total Agents" value={store.agents.length} />
        <KPI label="Active" value={activeCount} tone={activeCount ? "info" : "success"} />
        <KPI label="Idle" value={store.agents.length - activeCount} />
        <KPI label="Distinct Tools" value={new Set(store.agents.map((a) => a.tool).filter((t) => t && t !== "—")).size} />
      </div>
      <Panel title="Agent Registry" eyebrow="AI Workforce — roster & readiness" right={
        <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>{["All", "Active", "Idle", "Blocked"].map((f) => <option key={f}>{f}</option>)}</select>
      }>
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>Agent</th><th>Role</th><th>Status</th><th>Readiness</th><th>Tool</th><th>Permissions</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>{a.role}</td>
                  <td><Tag tone={a.status === "idle" ? "neutral" : a.status === "complete" ? "success" : "info"}><AgentStatusIndicator status={a.status} /></Tag></td>
                  <td>{a.status === "failed" ? <Tag tone="critical">DEGRADED</Tag> : <Tag tone="success">READY</Tag>}</td>
                  <td className="mono">{a.tool}</td>
                  <td style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{a.permissions.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* Live Agent Activity — the operational trace/feed: what agents are doing
   right now, status changes, tool calls and recovery-workflow events, most
   recent first. Reuses the same store.agents/store.timeline/store.auditEvents
   state as everywhere else in the app — no new data source. */
function LiveAgentActivity({ store }) {
  const runningCount = store.agents.filter((a) => a.status !== "idle" && a.status !== "complete" && a.status !== "failed").length;
  const toolCalls = store.auditEvents.filter((e) => e.tool && e.tool !== "-").length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <KPI label="Running Now" value={runningCount} tone={runningCount ? "info" : "success"} />
        <KPI label="Timeline Events" value={store.timeline.length} />
        <KPI label="Tool Calls Logged" value={toolCalls} />
        <KPI label="Recovery Actions" value={store.purchaseOrders.length} />
      </div>
      <Panel title="Agent Status" eyebrow="Current / most recent execution per agent">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
          {store.agents.map((a) => <AgentCard key={a.id} agent={a} onClick={() => {}} />)}
        </div>
      </Panel>
      <Panel title="Activity Timeline" eyebrow="Most recent first">
        <div className="ss-scroll" style={{ maxHeight: 320, overflowY: "auto" }}>
          {[...store.timeline].reverse().map((t, idx) => (
            <div key={`${t.time}-${t.agent}-${t.action}-${t.tool || ""}-${idx}`} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="mono" style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", width: 42, flex: "none" }}>{t.time}</span>
              <div style={{ flex: 1 }}>
                <div><strong>{t.agent}</strong> — {t.action}</div>
                {t.result && <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{t.tool ? `${t.tool} → ` : ""}{t.result}</div>}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Tool Calls & Events" eyebrow="Full execution trace">
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>Time</th><th>Agent</th><th>Event</th><th>Tool</th><th>Result</th><th>Policy</th></tr></thead>
            <tbody>
              {[...store.auditEvents].reverse().map((e, idx) => (
                <tr key={`${e.time}-${e.agent}-${e.action}-${e.tool || ""}-${idx}`} style={{ cursor: "default" }}>
                  <td className="mono">{e.time}</td>
                  <td>{e.agent}</td>
                  <td className="mono">{e.action}</td>
                  <td className="mono">{e.tool}</td>
                  <td>{e.result}</td>
                  <td>{e.policy && e.policy !== "-" ? <Tag tone="neutral">{e.policy}</Tag> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- DECISION INTELLIGENCE -------------------------------- */

function DecisionIntelligence({ store }) {
  if (store.decisions.length === 0) {
    return <Panel title="Decision Intelligence" eyebrow="No decisions yet"><EmptyState text="Run autonomous recovery from Command Center to generate a decision." /></Panel>;
  }
  const active = [...store.decisions].reverse().find((d) => !d.invalidated) || store.decisions[store.decisions.length - 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {store.decisions.filter((d) => d.invalidated).map((d) => (
        <Panel key={d.id} title={d.title} eyebrow={`${d.id.toUpperCase()} — SUPERSEDED`} className="ss-fade-in">
          <Tag tone="critical">INVALIDATED</Tag>
          <div style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)", marginTop: 8 }}>{d.rationale}</div>
        </Panel>
      ))}
      <Panel title={active.title} eyebrow={`${active.id.toUpperCase()} — ${active.status}`} className="ss-fade-in"
        right={<ReadAloudButton text={`${active.title}. Rationale: ${active.rationale}`} label={active.id} />}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Rationale</div>
          <div style={{ fontSize: "calc(13px * var(--ss-font-scale))", lineHeight: 1.5 }}>&ldquo;{active.rationale}&rdquo;</div>
        </div>
        <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>Competing Options</div>
        <div className="ss-table-wrap" style={{ marginBottom: 16 }}>
          <table className="ss-table">
            <thead><tr><th>Option</th><th>Cost</th><th>ETA</th><th>Risk</th><th>Inventory Impact</th><th>Policy</th><th>Feasibility</th></tr></thead>
            <tbody>
              {active.options.map((o) => (
                <tr key={o.id || `${o.supplierId || "supplier"}-${o.routeId || "route"}-${o.label}-${o.cost}-${o.etaDays}`} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: o.feasible ? 600 : 400 }}>{o.label}</td>
                  <td className="mono">${o.cost.toLocaleString()}</td>
                  <td className="mono">{o.etaDays}d</td>
                  <td><StatusTag value={o.risk} /></td>
                  <td><StatusTag value={o.stockout ? "STOCKOUT RISK" : "PROTECTED"} /></td>
                  <td>{o.cost < store.finance.policyThreshold ? <Tag tone="success">AUTO</Tag> : o.cost <= store.finance.maxSingleOrderUsd ? <Tag tone="warning">APPROVAL</Tag> : <Tag tone="critical">BLOCKED</Tag>}</td>
                  <td><Tag tone={o.feasible ? "success" : "critical"}>{o.feasible ? "FEASIBLE" : "REJECTED"}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>Agent Evidence</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
          {active.evidence.map((e, idx) => (
            <div key={`${e.agent}-${e.finding}-${idx}`} className="ss-panel-alt" style={{ padding: 10, fontSize: "calc(12px * var(--ss-font-scale))" }}>
              <div style={{ fontWeight: 600, marginBottom: 3 }}>{e.agent}</div>
              <div style={{ color: "var(--text-dim)" }}>{e.finding}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- RECOVERY PLAN -------------------------------- */

function RecoveryPlanPage({ store }) {
  const stages = ["INVESTIGATING", "PLANNING", "AWAITING AUTHORIZATION", "EXECUTING", "VERIFYING", "RESOLVED"];
  const statusMap = { DETECTED: 0, INVESTIGATING: 0, PLANNING: 1, DECIDED: 1, AWAITING_AUTHORIZATION: 2, EXECUTING: 3, VERIFYING: 4, RESOLVED: 5, REPLANNING: 1, AT_RISK: 1, NO_FEASIBLE_PLAN: 1, ERROR: 0 };
  const currentIdx = statusMap[store.incident.status] ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panel title={`Recovery Plan — ${store.incident.id}`} eyebrow={store.incident.status === "REPLANNING" ? "REPLANNING IN PROGRESS" : "Plan Status"}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {stages.map((s, idx) => (
            <Tag key={s} tone={idx < currentIdx ? "success" : idx === currentIdx ? "info" : "neutral"}>{s}</Tag>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Current Situation</div>
            <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))", marginBottom: 12 }}>{store.incident.title}. Runway {formatRunway(store.incident.runwayDays)}, stockout exposure {store.incident.stockoutExposure}.</div>
            <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Constraints</div>
            <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))" }}>Emergency budget ${store.finance.emergencyBudget.toLocaleString()}, auto-authorization threshold ${store.finance.policyThreshold.toLocaleString()}.</div>
          </div>
          <div>
            <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Agents Involved</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>{store.agents.map((a) => <Tag key={a.id} tone="neutral">{a.name}</Tag>)}</div>
            <div style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Outcome</div>
            <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))" }}>{store.incident.status === "RESOLVED" ? "Stockout exposure addressed. Incident resolved." : store.incident.status === "AT_RISK" || store.incident.status === "NO_FEASIBLE_PLAN" ? "No executable recovery was authorized; escalation is required." : store.incident.status === "ERROR" ? "Recovery workflow failed; inspect the timeline for the error." : "In progress."}</div>
          </div>
        </div>
      </Panel>
      {store.decisions.map((d) => (
        <Panel key={d.id} title={d.title} eyebrow={`${d.id.toUpperCase()} — ${d.invalidated ? "INVALIDATED" : d.status}`}>
          <div style={{ fontSize: "calc(12.5px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{d.rationale}</div>
        </Panel>
      ))}
    </div>
  );
}

/* --------------------------------- SECURITY CENTER -------------------------------- */

function SecurityCenter({ store }) {
  const [filter, setFilter] = useState("All");
  const [demoRunning, setDemoRunning] = useState(false);
  const filtered = store.securityEvents.filter((e) =>
    filter === "All" ||
    (filter === "Blocked" && e.status === "BLOCKED") ||
    (filter === "Allowed" && e.status === "ALLOWED") ||
    (filter === "Approval" && e.status === "REQUIRE_APPROVAL")
  );
  const runSupplierExportDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    try {
      const result = await apiRequest(`/api/security/demo/supplier-export?incident_id=${encodeURIComponent(store.incident.id || "SHP001")}`, { method: "POST" });
      store.setSecurityEvents((prev) => [mapSecurityEventsFromApi([result])[0], ...prev]);
      store.pushAudit({ agent: result.agent, action: result.action, tool: result.tool, result: result.decision, policy: result.policy_id });
    } catch (error) {
      store.pushTimeline({ agent: "SYSTEM", action: "Security demo failed", tool: "POST /api/security/demo/supplier-export", result: error?.message || "Unknown error" });
    } finally { setDemoRunning(false); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <KPI label="Security Events" value={store.securityEvents.length} />
        <KPI label="Blocked Actions" value={store.securityEvents.filter((e) => e.status === "BLOCKED").length} tone={store.securityEvents.some((e) => e.status === "BLOCKED") ? "critical" : "success"} />
        <KPI label="Active Policies" value={store.policies.length} />
        <KPI label="Agents Under Governance" value={store.agents.length} />
      </div>
      <Panel title="Security Events" eyebrow="Governance" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>{["All", "Blocked", "Allowed", "Approval"].map((f) => <option key={f}>{f}</option>)}</select>
          <button className="ss-btn ss-btn-primary" onClick={runSupplierExportDemo} disabled={demoRunning}>
            {demoRunning ? "Evaluating…" : "Run Malicious Supplier Demo"}
          </button>
        </div>
      }>
        {filtered.length === 0 ? <EmptyState text="No security events recorded yet." /> : filtered.map((e) => (
          <div key={e.id} className="ss-panel-alt ss-fade-in" style={{ padding: 12, marginBottom: 10, borderLeft: e.status === "BLOCKED" ? "3px solid var(--critical)" : "3px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)" }}>{e.time}</span>
              <StatusTag value={e.status} />
            </div>
            <div style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)", marginBottom: 8, fontStyle: "italic" }}>{e.source}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, fontSize: "calc(12px * var(--ss-font-scale))" }}>
              <div><div className="ss-kpi-label">Requesting Agent</div>{e.requestingAgent}</div>
              <div><div className="ss-kpi-label">Resource</div>{e.resource}</div>
              <div><div className="ss-kpi-label">Action</div>{e.action}</div>
              <div><div className="ss-kpi-label">Decision</div><StatusTag value={e.decision} /></div>
              <div><div className="ss-kpi-label">Policy</div>{e.policy}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{e.reason}</div>
            {e.destination && <div style={{ marginTop: 6, fontSize: "calc(11px * var(--ss-font-scale))", color: "var(--text-faint)" }}>Destination: {e.destination}</div>}
            <div style={{ marginTop: 8 }}>
              <ReadAloudButton text={`Security event. ${e.requestingAgent} attempted ${e.action} on ${e.resource}. Decision: ${e.decision}. ${e.reason}`} label="security event" />
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="Policies" eyebrow="Governance Rules">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {store.policies.map((p) => (
            <div key={p.id} className="ss-panel-alt" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: "calc(12.5px * var(--ss-font-scale))" }}>{p.name}</span><Tag tone="neutral">{p.scope}</Tag>
              </div>
              <div style={{ fontSize: "calc(12px * var(--ss-font-scale))", color: "var(--text-dim)" }}>{p.rule}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Agent Permissions" eyebrow="Access Control">
        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead><tr><th>Agent</th><th>Permissions</th></tr></thead>
            <tbody>{store.agents.map((a) => <tr key={a.id} style={{ cursor: "default" }}><td>{a.name}</td><td style={{ color: "var(--text-dim)" }}>{(a.permissions || []).join(", ")}</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- AUDIT & MEMORY -------------------------------- */

function AuditTimeline({ store }) {
  return (
    <Panel title="Audit & Memory" eyebrow={`${store.incident.id} — full event ledger`}>
      <div className="ss-table-wrap">
        <table className="ss-table">
          <thead><tr><th>Time</th><th>Agent</th><th>Action</th><th>Tool</th><th>Result</th><th>Policy</th></tr></thead>
          <tbody>
            {store.auditEvents.map((e, idx) => (
              <tr key={`${e.time}-${e.agent}-${e.action}-${e.tool || ""}-${idx}`} style={{ cursor: "default" }}>
                <td className="mono">{e.time}</td>
                <td>{e.agent}</td>
                <td className="mono">{e.action}</td>
                <td className="mono">{e.tool}</td>
                <td>{e.result}</td>
                <td>{e.policy && e.policy !== "-" ? <Tag tone="neutral">{e.policy}</Tag> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* --------------------------------- ACTIVE INCIDENTS -------------------------------- */

function ActiveIncidentsPage({ store, setView, setDetail }) {
  const [filter, setFilter] = useState("All");
  const rows = [store.incident];
  const filtered = rows.filter((i) => filter === "All" || i.severity === filter.toUpperCase() || i.status === filter.toUpperCase());
  return (
    <Panel title="Active Incidents" eyebrow="Command" right={
      <select className="ss-input" value={filter} onChange={(e) => setFilter(e.target.value)}>{["All", "Critical", "High", "Medium", "Resolved"].map((f) => <option key={f}>{f}</option>)}</select>
    }>
      <div className="ss-table-wrap">
        <table className="ss-table">
          <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Runway</th><th>Stockout Exposure</th></tr></thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} tabIndex={0} role="button" onClick={() => setView("command")} onKeyDown={activateOnKey(() => setView("command"))}>
                <td className="mono">{i.id}</td><td>{i.title}</td><td><StatusTag value={i.severity} /></td>
                <td><Tag tone="info">{i.status}</Tag></td><td className="mono">{formatRunway(i.runwayDays)}</td><td><StatusTag value={i.stockoutExposure} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* --------------------------------- APP ROOT -------------------------------- */

function ViewRouter({ view, store, actions, setView, detail, setDetail }) {
  switch (view) {
    case "command": return <CommandCenter store={store} actions={actions} setView={setView} setDetail={setDetail} />;
    case "incidents": return <ActiveIncidentsPage store={store} setView={setView} setDetail={setDetail} />;
    case "inventory": return <InventoryPage store={store} detail={detail} setDetail={setDetail} />;
    case "suppliers": return <SupplierPage store={store} detail={detail} setDetail={setDetail} />;
    case "logistics": return <LogisticsPage store={store} actions={actions} />;
    case "workforce": return <AgentWorkforce store={store} />;
    case "activity": return <LiveAgentActivity store={store} />;
    case "decision": return <DecisionIntelligence store={store} />;
    case "plan": return <RecoveryPlanPage store={store} />;
    case "procurement": return <ProcurementPage store={store} />;
    case "finance": return <FinancePage store={store} />;
    case "security": return <SecurityCenter store={store} />;
    case "audit": return <AuditTimeline store={store} />;
    default: return <CommandCenter store={store} actions={actions} setView={setView} setDetail={setDetail} />;
  }
}

const VIEW_TITLES = {
  command: "Command Center", incidents: "Active Incidents", inventory: "Inventory",
  suppliers: "Suppliers", logistics: "Shipments & Routes", workforce: "Agent Workforce",
  activity: "Live Agent Activity", decision: "Decision Intelligence", plan: "Recovery Plans",
  procurement: "Procurement", finance: "Finance", security: "Security Center", audit: "Audit & Memory",
};

const VIEW_TITLE_KEYS = {
  command: "command_center", incidents: "active_incidents", inventory: "inventory",
  suppliers: "suppliers", logistics: "shipments_routes", workforce: "agent_workforce",
  activity: "live_agent_activity", decision: "decision_intelligence", plan: "recovery_plans",
  procurement: "procurement", finance: "finance", security: "security_center", audit: "audit_memory",
};

function AppShell() {
  const a11y = useAccessibility();
  const store = useSupplyShieldStore();
  const actions = useSequencer(store);
  const [view, setView] = useState("command");
  const [detail, setDetail] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/dashboard")
      .then((payload) => {
        if (!cancelled) mapDashboardPayload(store, payload);
      })
      .catch((error) => {
        if (!cancelled) {
          store.pushTimeline({ agent: "SYSTEM", action: "Backend unavailable; dashboard is using local baseline data", tool: "GET /api/dashboard", result: error?.message || "Connection failed" });
        }
      });

    Promise.all([apiRequest("/api/security/events"), apiRequest("/api/security/policies")])
      .then(([events, governance]) => {
        if (cancelled) return;
        store.setSecurityEvents(mapSecurityEventsFromApi(events || []));
        if (governance?.policies) store.setPolicies(governance.policies);
        if (governance?.agents) {
          store.setAgents((prev) => prev.map((local) => {
            const p = governance.agents[`${local.id}_agent`] || governance.agents[local.id];
            return p ? { ...local, permissions: p.allowedActions || [], connected: true } : local;
          }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSetView = (v) => { setView(v); setDetail(null); };

  const rootStyle = {
    display: "flex",
    "--ss-font-scale": a11y.fontScale,
  };

  return (
    <div className="ss-brightness-wrap" style={{ "--ss-brightness": a11y.brightness / 100 }}>
      <div
        className="ss-root"
        style={rootStyle}
        data-theme={a11y.theme}
        data-contrast={a11y.highContrast ? "high" : "normal"}
        data-controls={a11y.largeControls ? "large" : "normal"}
        data-motion={a11y.reducedMotion ? "reduced" : "normal"}
        data-dyslexia={a11y.dyslexiaFont ? "true" : "false"}
        lang={a11y.language}
      >
        <GlobalStyle />
        <Sidebar view={view} setView={handleSetView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} agents={store.agents} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
          <TopBar store={store} setView={handleSetView} setDetail={setDetail} setMobileOpen={setMobileOpen} />
          <main className="ss-scroll" style={{ flex: 1, overflowY: "auto", padding: 18 }}>
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: "calc(16px * var(--ss-font-scale))", fontWeight: 700, margin: 0 }}>{a11y.t(VIEW_TITLE_KEYS[view]) || VIEW_TITLES[view]}</h1>
              {view !== "command" && <Tag tone="neutral">{store.incident.id}</Tag>}
            </div>
            <ViewRouter view={view} store={store} actions={actions} setView={handleSetView} detail={detail} setDetail={setDetail} />
          </main>
        </div>
        <AccessibilityFAB store={store} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AppShell />
    </AccessibilityProvider>
  );
}
