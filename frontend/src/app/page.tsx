"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";
import { 
  Code2, Play, Bug as BugIcon, Activity, Sparkles, Send, 
  Terminal, Cpu, AlertTriangle, CheckCircle2, Info, Lock, 
  HelpCircle, ChevronRight, MessageSquare 
} from "lucide-react";
import styles from "./page.module.css";

// Dynamic import of CodeEditor to bypass SSR hydration mismatches in Next.js
const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

// CSS import for CodeEditor
import "@uiw/react-textarea-code-editor/dist.css";

// Types corresponding to our backend schemas
interface TimeComplexity {
  time: string;
  space: string;
  explanation: string;
}

interface Bug {
  line: int;
  severity: "critical" | "warning" | "info";
  description: string;
  fix: string;
}

interface Improvement {
  description: string;
  before_snippet: string;
  after_snippet: string;
  impact: "high" | "medium" | "low";
}

interface AnalysisResponse {
  complexity: TimeComplexity;
  bugs: Bug[];
  improvements: Improvement[];
  refactored_code: string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

const DEFAULT_CODE = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        # BUG: Should run n - i - 1 to avoid index error and optimize
        for j in range(0, n): 
            if arr[j] > arr[j + 1]: # BUG: arr[j+1] will raise IndexError at the end of loop
                # Swap elements
                temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
    return arr
`;

export default function CodeAnalyzerPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState("python");
  const [xGeminiKey, setXGeminiKey] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("complexity");

  // Chat integration states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(xGeminiKey ? { "X-Gemini-Key": xGeminiKey } : {}),
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Server error occurred during analysis.");
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
      setChatHistory([]); // Reset chat history for new code analyzer session
      setActiveTab("complexity"); // Go to complexity page on finish
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please verify the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(xGeminiKey ? { "X-Gemini-Key": xGeminiKey } : {}),
        },
        body: JSON.stringify({
          code,
          language,
          message: userMessage.content,
          history: chatHistory,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to receive AI chat response.");
      }

      const data = await response.json();
      const modelMessage: ChatMessage = { role: "model", content: data.response };
      setChatHistory((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: "model", content: `⚠️ Error: ${err.message || "Could not reach Chat AI backend."}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Big-O Math mapping to coordinate indices on SVG curve plotting
  const getComplexityClass = (bigO: string): string => {
    const cleaned = bigO.toUpperCase().replace(/\s+/g, "");
    if (cleaned.includes("O(1)")) return "O(1)";
    if (cleaned.includes("O(LOGN)")) return "O(log N)";
    if (cleaned.includes("O(NLOGN)")) return "O(N log N)";
    if (cleaned.includes("O(N^2)") || cleaned.includes("ON2") || cleaned.includes("O(N*N)")) return "O(N^2)";
    if (cleaned.includes("O(2^N)") || cleaned.includes("O(2N)")) return "O(2^N)";
    if (cleaned.includes("O(N)")) return "O(N)";
    return ""; // Unknown
  };

  const detectedBigO = analysis ? getComplexityClass(analysis.complexity.time) : "";

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <Terminal size={32} className={styles.logoIcon} />
          <div>
            <h1 className={styles.title}>
              <span className="shimmer-text">QuantumCode</span> Analyzer
            </h1>
            <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
              AI-Powered Static Engine & Complex Cartography
            </p>
          </div>
        </div>

        <div className={styles.apiKeyWrapper}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Lock size={14} className="text-warning" />
            <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Gemini Key:</span>
          </div>
          <input
            id="gemini-key-input"
            type="password"
            className={styles.keyInput}
            placeholder="Paste local API key (Optional fallback)..."
            value={xGeminiKey}
            onChange={(e) => setXGeminiKey(e.target.value)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span 
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "hsl(var(--success))",
                boxShadow: "0 0 8px hsl(var(--success))"
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--success))", fontWeight: 500 }}>Live Engine</span>
          </div>
        </div>
      </header>

      {/* WORKSPACE GRID */}
      <main className={styles.workspace}>
        {/* LEFT WORKSPACE PANEL: CODE EDITOR */}
        <section className={`${styles.panel} glass-panel`} id="editor-section">
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <Code2 size={20} className="text-success" />
              <span>Pasted Source Code</span>
            </div>

            <div className={styles.controls}>
              <select
                id="language-select"
                className="code-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
              </select>

              <button
                id="analyze-button"
                className={styles.analyzeBtn}
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Cpu size={16} className={styles.loadingSpinner} />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Analyze Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={styles.editorWrapper}>
            <div className="line-numbers">
              {code.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <CodeEditor
              id="source-code-editor"
              value={code}
              language={language}
              placeholder="Paste your code snippet here to unleash static AI analysis..."
              onChange={(evn) => setCode(evn.target.value)}
              className={styles.customEditor}
              padding={16}
              style={{
                fontSize: 14,
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </section>

        {/* RIGHT WORKSPACE PANEL: DYNAMIC ANALYSIS OUTCOMES */}
        <section className={`${styles.panel} glass-panel`} id="analysis-section" style={{ minHeight: "560px" }}>
          {error && (
            <div 
              style={{
                margin: "16px",
                padding: "16px",
                background: "hsl(var(--error) / 0.1)",
                border: "1px solid hsl(var(--error) / 0.3)",
                color: "hsl(var(--error))",
                borderRadius: "8px",
                fontSize: "0.9rem",
                display: "flex",
                gap: "10px"
              }}
            >
              <AlertTriangle size={20} />
              <div>
                <strong>Connection / API Key Failure:</strong>
                <p style={{ marginTop: "4px", fontSize: "0.85rem", opacity: 0.9 }}>{error}</p>
                <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                  💡 Please verify FastAPI is running locally on port 8000 (`uvicorn main:app --reload`), and that you have either loaded a `GEMINI_API_KEY` into your `backend/.env` or entered it in the header key box above.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.glowingPulse} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>Deconstructing Source Code Structure</h3>
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", textAlign: "center", maxWidth: "340px" }}>
                Running parser tokens, evaluating control flow graphs, mapping algorithmic bounds, and consulting static Gemini LLM compiler...
              </p>
            </div>
          ) : !analysis ? (
            <div className={styles.emptyState}>
              <Sparkles size={48} className={styles.emptyIcon} />
              <h2 style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>Awaiting Source Stream</h2>
              <p style={{ fontSize: "0.9rem", maxWidth: "380px", lineHeight: 1.5 }}>
                Paste your logic in the left editor and hit <strong>Analyze Code</strong> to trigger an AI review of space complexity, critical bugs, diff improvements, and active chatbot conversations.
              </p>
              <div 
                style={{
                  fontSize: "0.8rem",
                  background: "rgba(255,255,255,0.02)",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  border: "1px dashed hsl(var(--border-glass))",
                  marginTop: "8px"
                }}
              >
                🚀 <strong>Try the default Bubble Sort:</strong> It demonstrates perfect O(N²) quadratic curves and triggers detailed line-specific boundary crash alerts.
              </div>
            </div>
          ) : (
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className={styles.tabsContainer}>
              <Tabs.List className={styles.tabsList}>
                <Tabs.Trigger value="complexity" className="tab-trigger" id="tab-complexity">
                  <Activity size={16} />
                  <span>Complexity Graph</span>
                </Tabs.Trigger>
                <Tabs.Trigger value="bugs" className="tab-trigger" id="tab-bugs">
                  <BugIcon size={16} />
                  {analysis.bugs.length > 0 && (
                    <span 
                      style={{
                        background: analysis.bugs.some(b => b.severity === "critical") ? "hsl(var(--error))" : "hsl(var(--warning))",
                        color: "hsl(var(--text-inverse))",
                        fontSize: "0.7rem",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        fontWeight: 700
                      }}
                    >
                      {analysis.bugs.length}
                    </span>
                  )}
                  <span>Bugs & Safety</span>
                </Tabs.Trigger>
                <Tabs.Trigger value="refactoring" className="tab-trigger" id="tab-refactoring">
                  <Sparkles size={16} />
                  <span>Diff Optimizations</span>
                </Tabs.Trigger>
                <Tabs.Trigger value="chat" className="tab-trigger" id="tab-chat">
                  <MessageSquare size={16} />
                  <span>Interactive Chat</span>
                </Tabs.Trigger>
              </Tabs.List>

              {/* TAB 1: DYNAMIC COMPLEXITY GRAPH & DETAILS */}
              <Tabs.Content value="complexity" className={styles.tabContent}>
                <div className={styles.complexityCards}>
                  <div className={styles.metricCard}>
                    <Activity size={24} className={styles.metricIcon} />
                    <div>
                      <div className={styles.metricTitle}>Time Complexity</div>
                      <div className={styles.metricVal}>{analysis.complexity.time}</div>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <Cpu size={24} className={styles.metricIcon} />
                    <div>
                      <div className={styles.metricTitle}>Space Complexity</div>
                      <div className={styles.metricVal}>{analysis.complexity.space}</div>
                    </div>
                  </div>
                </div>

                {/* ANIMATED BIG-O GRAPH */}
                <div className={styles.graphContainer}>
                  <div className={styles.graphHeader}>
                    <span className={styles.graphTitle}>Computational Complexity Curve Map</span>
                    {detectedBigO && (
                      <span 
                        style={{
                          fontSize: "0.8rem",
                          background: "hsl(var(--primary-glow))",
                          border: "1px solid hsl(var(--primary))",
                          color: "hsl(var(--primary))",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "4px"
                        }}
                      >
                        Identified Class: {detectedBigO}
                      </span>
                    )}
                  </div>

                  <div className={styles.graphWrapper}>
                    <svg viewBox="0 0 400 200" className={styles.graphSvg}>
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="40" y2="180" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <line x1="40" y1="180" x2="380" y2="180" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      
                      {/* Labels */}
                      <text x="30" y="15" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="end">Operations (t)</text>
                      <text x="380" y="195" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="end">Input Size (n)</text>
                      
                      {/* Curves definitions */}
                      {/* O(1) - Constant Flat Curve */}
                      <path 
                        d="M 40 170 Q 210 170 380 170" 
                        fill="none" 
                        stroke={detectedBigO === "O(1)" ? "hsl(var(--secondary))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(1)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(1)" ? "0" : "4 2"}
                        style={detectedBigO === "O(1)" ? { filter: "drop-shadow(0 0 4px hsl(var(--secondary)))" } : {}}
                      />
                      
                      {/* O(log N) - Logarithmic Curve */}
                      <path 
                        d="M 40 180 Q 80 120 380 110" 
                        fill="none" 
                        stroke={detectedBigO === "O(log N)" ? "hsl(var(--secondary))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(log N)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(log N)" ? "0" : "4 2"}
                        style={detectedBigO === "O(log N)" ? { filter: "drop-shadow(0 0 4px hsl(var(--secondary)))" } : {}}
                      />

                      {/* O(N) - Linear 45-deg Line */}
                      <path 
                        d="M 40 180 L 320 40" 
                        fill="none" 
                        stroke={detectedBigO === "O(N)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(N)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(N)" ? "0" : "4 2"}
                        style={detectedBigO === "O(N)" ? { filter: "drop-shadow(0 0 4px hsl(var(--primary)))" } : {}}
                      />

                      {/* O(N log N) - N Log N */}
                      <path 
                        d="M 40 180 Q 150 110 270 20" 
                        fill="none" 
                        stroke={detectedBigO === "O(N log N)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(N log N)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(N log N)" ? "0" : "4 2"}
                        style={detectedBigO === "O(N log N)" ? { filter: "drop-shadow(0 0 4px hsl(var(--primary)))" } : {}}
                      />

                      {/* O(N^2) - Quadratic Steep Parabola */}
                      <path 
                        d="M 40 180 Q 100 120 180 20" 
                        fill="none" 
                        stroke={detectedBigO === "O(N^2)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(N^2)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(N^2)" ? "0" : "4 2"}
                        style={detectedBigO === "O(N^2)" ? { filter: "drop-shadow(0 0 8px hsl(var(--primary)))" } : {}}
                      />

                      {/* O(2^N) - Exponential Near-Vertical Curve */}
                      <path 
                        d="M 40 180 Q 70 140 95 20" 
                        fill="none" 
                        stroke={detectedBigO === "O(2^N)" ? "hsl(var(--error))" : "rgba(255,255,255,0.15)"} 
                        strokeWidth={detectedBigO === "O(2^N)" ? "3.5" : "1"} 
                        strokeDasharray={detectedBigO === "O(2^N)" ? "0" : "4 2"}
                        style={detectedBigO === "O(2^N)" ? { filter: "drop-shadow(0 0 8px hsl(var(--error)))" } : {}}
                      />

                      {/* Dynamic Pulse Orb Dot tracking along detected curve */}
                      {detectedBigO === "O(1)" && <circle cx="210" cy="170" r="4.5" fill="hsl(var(--secondary))" style={{ filter: "drop-shadow(0 0 6px hsl(var(--secondary)))" }} />}
                      {detectedBigO === "O(log N)" && <circle cx="230" cy="115" r="4.5" fill="hsl(var(--secondary))" style={{ filter: "drop-shadow(0 0 6px hsl(var(--secondary)))" }} />}
                      {detectedBigO === "O(N)" && <circle cx="180" cy="110" r="4.5" fill="hsl(var(--primary))" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary)))" }} />}
                      {detectedBigO === "O(N log N)" && <circle cx="155" cy="110" r="4.5" fill="hsl(var(--primary))" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary)))" }} />}
                      {detectedBigO === "O(N^2)" && <circle cx="100" cy="120" r="4.5" fill="hsl(var(--primary))" style={{ filter: "drop-shadow(0 0 8px #fff)" }} />}
                      {detectedBigO === "O(2^N)" && <circle cx="70" cy="140" r="4.5" fill="hsl(var(--error))" style={{ filter: "drop-shadow(0 0 8px hsl(var(--error)))" }} />}
                    </svg>
                  </div>

                  <div className={styles.complexityLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(1)" ? "hsl(var(--secondary))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(1)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(1) Constant</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(log N)" ? "hsl(var(--secondary))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(log N)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(log N) Logarithmic</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(N)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(N)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(N) Linear</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(N log N)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(N log N)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(N log N) Linearithmic</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(N^2)" ? "hsl(var(--primary))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(N^2)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(N²) Quadratic</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: detectedBigO === "O(2^N)" ? "hsl(var(--error))" : "rgba(255,255,255,0.2)" }} />
                      <span style={detectedBigO === "O(2^N)" ? { color: "#fff", fontWeight: "bold" } : {}}>O(2ⁿ) Exponential</span>
                    </div>
                  </div>
                </div>

                <div className={styles.explanationBox}>
                  <div className={styles.explanationTitle}>
                    <Cpu size={18} />
                    <span>Algorithmic Rationale Analysis</span>
                  </div>
                  <p className={styles.explanationText}>{analysis.complexity.explanation}</p>
                </div>
              </Tabs.Content>

              {/* TAB 2: BUGS & ISSUES LOG */}
              <Tabs.Content value="bugs" className={styles.tabContent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>Detected Code Anomalies</h3>
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                    Total: {analysis.bugs.length} issue(s) identified
                  </span>
                </div>

                {analysis.bugs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--success))", border: "1px dashed hsl(var(--border-glass))", borderRadius: "8px", background: "rgba(16, 185, 129, 0.02)" }}>
                    <CheckCircle2 size={36} style={{ marginBottom: "12px", display: "inline-block" }} />
                    <p style={{ fontWeight: 600 }}>Zero compile errors or warnings found!</p>
                    <p style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "4px" }}>The static analyzer evaluated your syntax rules as compliant and highly secure.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {analysis.bugs.map((bug, index) => (
                      <div 
                        key={index} 
                        className={`${styles.bugCard} ${
                          bug.severity === "critical" 
                            ? styles.bugCardCritical 
                            : bug.severity === "warning" 
                            ? styles.bugCardWarning 
                            : styles.bugCardInfo
                        }`}
                      >
                        <div className={styles.bugHeader}>
                          <div className={styles.bugMeta}>
                            <span className={`${styles.bugBadge} ${
                              bug.severity === "critical" 
                                ? styles.badgeCritical 
                                : bug.severity === "warning" 
                                : styles.badgeWarning 
                                : styles.badgeInfo
                            }`}>
                              {bug.severity}
                            </span>
                            {bug.line > 0 && (
                              <span className={styles.bugLine}>Line {bug.line}</span>
                            )}
                          </div>
                        </div>

                        <p className={styles.bugDesc}>{bug.description}</p>
                        
                        {bug.fix && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div className={styles.bugFixTitle}>
                              <CheckCircle2 size={14} />
                              <span>Actionable Correction</span>
                            </div>
                            <pre className={styles.bugFixCode}>{bug.fix}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Tabs.Content>

              {/* TAB 3: BEFORE/AFTER CODE DIFF IMPROVEMENTS */}
              <Tabs.Content value="refactoring" className={styles.tabContent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>Refactoring & Performance Improvements</h3>
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                    Optimizations: {analysis.improvements.length} suggestions
                  </span>
                </div>

                {analysis.improvements.map((imp, idx) => (
                  <div key={idx} className={styles.improvementCard}>
                    <div className={styles.improvementHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ChevronRight size={16} className="text-success" />
                        <h4 className={styles.improvementTitle}>{imp.description}</h4>
                      </div>
                      <span className={`${styles.improvementImpact} ${styles[`impact${imp.impact}`]}`}>
                        {imp.impact} Impact
                      </span>
                    </div>

                    <div className={styles.diffContainer}>
                      <div className={styles.diffHalf}>
                        <span className={styles.diffLabel}>Original Snippet</span>
                        <pre className={`${styles.diffBox} ${styles.diffBefore}`}>{imp.before_snippet}</pre>
                      </div>
                      <div className={styles.diffHalf}>
                        <span className={styles.diffLabel}>Refactored Solution</span>
                        <pre className={`${styles.diffBox} ${styles.diffAfter}`}>{imp.after_snippet}</pre>
                      </div>
                    </div>
                  </div>
                ))}

                <div 
                  className={styles.explanationBox} 
                  style={{ 
                    marginTop: "12px", 
                    border: "1px solid hsl(var(--primary) / 0.25)",
                    background: "linear-gradient(to right, rgba(0,0,0,0.4), hsl(var(--primary-glow)))" 
                  }}
                >
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} className="text-warning" />
                    <span>Complete Refactored Version</span>
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", margin: "6px 0 12px 0" }}>
                    This is the fully synthesized, highly scalable, and clean execution script generated by the AI:
                  </p>
                  <pre 
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      padding: "16px",
                      borderRadius: "6px",
                      border: "1px solid hsl(var(--border-glass))",
                      fontSize: "0.85rem",
                      fontFamily: "var(--font-mono)",
                      color: "hsl(var(--text-main))",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {analysis.refactored_code}
                  </pre>
                </div>
              </Tabs.Content>

              {/* TAB 4: INTERACTIVE AI CHAT ASSISTANT */}
              <Tabs.Content value="chat" className={styles.tabContent}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff" }}>Algorithmic Dialogue Terminal</h3>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                    Ask specific questions about logic branches, call stacks, memory requirements, or language features for this snippet.
                  </p>
                </div>

                <div className={styles.chatWrapper}>
                  <div className={styles.chatMessages}>
                    {chatHistory.length === 0 ? (
                      <div 
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "hsl(var(--text-muted))",
                          textAlign: "center",
                          padding: "20px",
                          gap: "12px"
                        }}
                      >
                        <MessageSquare size={32} style={{ opacity: 0.4 }} />
                        <p style={{ fontSize: "0.85rem", maxWidth: "260px" }}>
                          No conversation yet. Ask: <em>&ldquo;How can I write test cases for this?&rdquo;</em> or <em>&ldquo;Explain time complexity of the swap operation.&rdquo;</em>
                        </p>
                      </div>
                    ) : (
                      chatHistory.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`${styles.chatBubble} ${
                            msg.role === "user" ? styles.chatBubbleUser : styles.chatBubbleModel
                          }`}
                        >
                          {msg.content}
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className={`${styles.chatBubble} ${styles.chatBubbleModel}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Cpu size={14} className={styles.loadingSpinner} />
                        <span>Compiling assistant response...</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendChatMessage} className={styles.chatInputArea}>
                    <input
                      id="chat-message-input"
                      type="text"
                      className={styles.chatInput}
                      placeholder="Ask the compiler assistant a follow-up question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={chatLoading}
                    />
                    <button 
                      id="chat-send-button"
                      type="submit" 
                      className={styles.chatSendBtn} 
                      disabled={!chatInput.trim() || chatLoading}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          )}
        </section>
      </main>
    </div>
  );
}
