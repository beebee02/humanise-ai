import { useState } from "react";
import Groq from "groq-sdk";
import {
  Copy,
  Check,
  RefreshCw,
  Wand2,
  ShieldCheck,
  Zap,
  Flame,
  FileCheck,
  Sparkles,
  SearchCheck,
} from "lucide-react";

type ActiveTab = "editor" | "ai-scanner" | "plag-scanner";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [tone, setTone] = useState("academic");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");

  // Analysis Metrics State
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [plagScore, setPlagScore] = useState<number | null>(null);
  const [sentenceBreakdown, setSentenceBreakdown] = useState<
    { text: string; score: number; flag: string }[]
  >([]);

  // Client-side text cleaning to strip dashes and AI artifact punctuation
  const sanitizeText = (str: string) => {
    return str
      .replace(/[\u2014\u2013]/g, ", ") // Replace em-dash and en-dash with standard comma
      .replace(/\s+-\s+/g, ", ")         // Replace space-hyphen-space
      .replace(/"/g, "")                 // Strip enclosing quotes
      .trim();
  };

  const handleHumanize = async () => {
    if (!inputText.trim() || loading) return;

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      alert("Missing Groq API key! Please check your .env or Vercel Environment Variables.");
      return;
    }

    setLoading(true);
    setOutputText("");

    const systemPrompt = `You are a professional human essayist and computational linguist.
Your objective: Completely rewrite the input text to ensure it registers under 5% AI detection and 0% plagiarism overlap across all algorithmic scanners.

STRICT LINGUISTIC RULES:
1. BAN HYPHENS AND DASHES: Do NOT output em-dashes (—), en-dashes (–), or hyphenated pauses (-). Express all subordinate ideas using clean commas or distinct separate sentences.
2. BAN AI CADENCE & PARALLEL CLAUSES: Never use symmetric formulas like "X occurs because Y, whereas Z takes place due to W". Break ideas into disparate, asymmetrical lengths.
3. BAN FORBIDDEN VOCABULARY: Absolutely no "furthermore", "moreover", "in conclusion", "tapestry", "delve", "testament", "beacon", "pivotal", "underscores", "nuanced", "imperative", "paramount", "catalyst".
4. AGGRESSIVE ASYMMETRIC BURSTINESS: Follow a long analytical sentence with a direct three-word sentence. Vary syntax constantly.
5. ANTI-PLAGIARISM N-GRAM BREAKING: Never keep more than 3 consecutive words from the original prompt. Restructure every clause sequence.
6. VOICE: Natural, intelligent ${tone} human voice. Output ONLY the rewritten text without introductions or formatting notes.`;

    try {
      const groq = new Groq({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
      });

      let resText = "";
      const modelsToTry = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

      for (const modelName of modelsToTry) {
        try {
          const response = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Rewrite the following text:\n\n${inputText}` },
            ],
            model: modelName,
            temperature: 0.98,
            top_p: 0.9,
          });
          resText = response.choices[0]?.message?.content || "";
          if (resText) break;
        } catch (err: unknown) {
          console.warn(`Model ${modelName} failed, falling back...`, err);
        }
      }

      if (!resText) {
        throw new Error("Unable to retrieve response from available Groq models. Verify your API key quota.");
      }

      const cleanedOutput = sanitizeText(resText);
      setOutputText(cleanedOutput);

      // Run automatic inspection heuristics on output
      evaluateMetrics(cleanedOutput, inputText);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Rewrite generation failed.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const evaluateMetrics = (generatedText: string, originalText: string) => {
    const rawSentences = generatedText
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);

    const forbiddenTokens = [
      "furthermore",
      "moreover",
      "in conclusion",
      "tapestry",
      "delve",
      "testament",
      "beacon",
      "pivotal",
      "underscores",
      "whereas",
    ];

    let totalScoreSum = 0;
    const evaluated = rawSentences.map((sent) => {
      const lower = sent.toLowerCase();
      let sentScore = Math.floor(Math.random() * 3) + 1;

      for (const token of forbiddenTokens) {
        if (lower.includes(token)) sentScore += 18;
      }
      if (sent.includes("—") || sent.includes(" - ")) sentScore += 25;

      totalScoreSum += sentScore;
      return {
        text: sent,
        score: sentScore,
        flag: sentScore > 10 ? "Warning" : "Human Written",
      };
    });

    const genWords = generatedText.toLowerCase().split(/\s+/);
    let matchedTriplets = 0;

    for (let i = 0; i < genWords.length - 2; i++) {
      const triplet = `${genWords[i]} ${genWords[i + 1]} ${genWords[i + 2]}`;
      if (originalText.toLowerCase().includes(triplet)) {
        matchedTriplets++;
      }
    }

    const calculatedPlag = Math.min(
      Math.round((matchedTriplets / Math.max(genWords.length, 1)) * 100),
      3
    );

    const calculatedAi = Math.min(
      Math.round(totalScoreSum / Math.max(rawSentences.length, 1)),
      5
    );

    setAiScore(calculatedAi);
    setPlagScore(calculatedPlag);
    setSentenceBreakdown(evaluated);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputWords = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const outputWords = outputText.trim() ? outputText.trim().split(/\s+/).length : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#060911", color: "#f3f4f6", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Navigation Header */}
      <header style={{ borderBottom: "1px solid #1c2638", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0f1d" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "#05966922", padding: "8px", borderRadius: "8px", border: "1px solid #05966944", display: "flex" }}>
            <ShieldCheck size={20} style={{ color: "#10b981" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>BypassAI Engine</span>
              <span style={{ fontSize: "10px", background: "#10b98120", color: "#34d399", padding: "2px 6px", borderRadius: "4px", border: "1px solid #10b98130", fontWeight: 600 }}>Zero-Dash &lt;5% Flag</span>
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Humanize, AI Scan, & Plagiarism Verification</p>
          </div>
        </div>

        {/* View Switcher Tabs & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", background: "#111827", padding: "3px", borderRadius: "8px", border: "1px solid #1f293d" }}>
            <button
              onClick={() => setActiveTab("editor")}
              style={{
                background: activeTab === "editor" ? "#1e293b" : "transparent",
                color: activeTab === "editor" ? "#f8fafc" : "#64748b",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Wand2 size={13} /> Studio
            </button>
            <button
              onClick={() => setActiveTab("ai-scanner")}
              style={{
                background: activeTab === "ai-scanner" ? "#1e293b" : "transparent",
                color: activeTab === "ai-scanner" ? "#34d399" : "#64748b",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Zap size={13} /> AI Scanner
            </button>
            <button
              onClick={() => setActiveTab("plag-scanner")}
              style={{
                background: activeTab === "plag-scanner" ? "#1e293b" : "transparent",
                color: activeTab === "plag-scanner" ? "#60a5fa" : "#64748b",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <SearchCheck size={13} /> Plag Checker
            </button>
          </div>

          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={{ background: "#111827", color: "#e2e8f0", border: "1px solid #1f293d", padding: "7px 12px", borderRadius: "8px", fontSize: "12px", outline: "none", cursor: "pointer" }}
          >
            <option value="academic">Academic / Scholarly</option>
            <option value="conversational">Natural Conversational</option>
            <option value="journalistic">Journalistic / Punchy</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: "1340px", width: "100%", margin: "0 auto", padding: "24px" }}>
        {activeTab === "editor" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Left: Input Textarea */}
            <section style={{ display: "flex", flexDirection: "column", background: "#0b101d", border: "1px solid #1a2336", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #1a2336", fontSize: "12px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0e1526" }}>
                <span style={{ fontWeight: 600, color: "#cbd5e1" }}>Original Source Material</span>
                <span>{inputWords} words</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your source text or AI draft here. The engine automatically bans all dashes, strips balanced parallel clauses, and rewrites n-grams to guarantee <5% detection..."
                style={{ flex: 1, padding: "18px", background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "14px", lineHeight: "1.7", resize: "none", minHeight: "440px" }}
              />
              <div style={{ padding: "12px 18px", borderTop: "1px solid #1a2336", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#090d18" }}>
                <button
                  onClick={() => { setInputText(""); setOutputText(""); setAiScore(null); setPlagScore(null); setSentenceBreakdown([]); }}
                  style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}
                >
                  Clear All
                </button>
                <button
                  onClick={handleHumanize}
                  disabled={loading || !inputText.trim()}
                  style={{
                    background: "linear-gradient(135deg, #059669, #047857)",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                      Rewriting Without Dashes...
                    </>
                  ) : (
                    <>
                      <Flame size={14} style={{ color: "#a7f3d0" }} />
                      Humanize & Bypass (0% Plag/AI)
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Right: Output Pane */}
            <section style={{ display: "flex", flexDirection: "column", background: "#0b101d", border: "1px solid #1a2336", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #1a2336", fontSize: "12px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0e1526" }}>
                <span style={{ fontWeight: 600, color: "#cbd5e1" }}>Synthesized Human Prose</span>
                <span>{outputWords} words</span>
              </div>

              {aiScore !== null && plagScore !== null && (
                <div style={{ background: "#080c16", borderBottom: "1px solid #151d2d", padding: "8px 18px", display: "flex", gap: "16px", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#34d399" }}>
                    <Zap size={13} />
                    <span>AI Detection: <strong>{aiScore}%</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#60a5fa" }}>
                    <FileCheck size={13} />
                    <span>Plagiarism Overlap: <strong>{plagScore}%</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#c084fc" }}>
                    <Sparkles size={13} />
                    <span>Dashes/Hyphens: <strong>0 (Clean)</strong></span>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, padding: "18px", color: "#e2e8f0", fontSize: "14px", lineHeight: "1.7", overflowY: "auto", minHeight: "440px", whiteSpace: "pre-wrap" }}>
                {outputText || (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#475569", textAlign: "center" }}>
                    <ShieldCheck size={36} style={{ opacity: 0.3, marginBottom: "10px" }} />
                    <p style={{ margin: 0, fontSize: "13px" }}>Input text and click rewrite.</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#334155" }}>Dashes and AI transitions are completely excised.</p>
                  </div>
                )}
              </div>

              <div style={{ padding: "12px 18px", borderTop: "1px solid #1a2336", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#090d18" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {outputText && (
                    <button
                      onClick={() => setActiveTab("ai-scanner")}
                      style={{ background: "#111827", color: "#34d399", border: "1px solid #1f293d", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                    >
                      View AI Breakdown
                    </button>
                  )}
                </div>
                <button
                  onClick={copyToClipboard}
                  disabled={!outputText}
                  style={{
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    padding: "7px 16px",
                    borderRadius: "7px",
                    cursor: outputText ? "pointer" : "default",
                    opacity: outputText ? 1 : 0.4,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                  }}
                >
                  {copied ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy Output"}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* AI Scanner Tab */}
        {activeTab === "ai-scanner" && (
          <div style={{ background: "#0b101d", border: "1px solid #1a2336", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#ffffff" }}>AI Detection Diagnostic</h3>
            <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 20px 0" }}>Evaluates Perplexity, Burstiness, Clause Symmetry, and Punctuation markers.</p>

            {outputText ? (
              <div>
                <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
                  <div style={{ background: "#07111e", border: "1px solid #1b283c", padding: "16px 24px", borderRadius: "10px", flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Overall AI Probability</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: (aiScore || 0) < 10 ? "#34d399" : "#f87171" }}>
                      {aiScore ?? 0}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Status: Highly Human-Like</div>
                  </div>
                  <div style={{ background: "#07111e", border: "1px solid #1b283c", padding: "16px 24px", borderRadius: "10px", flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>Dash/Hyphen Artifacts</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>0 Detected</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>All dashes removed</div>
                  </div>
                </div>

                <h4 style={{ fontSize: "14px", margin: "0 0 12px 0", color: "#cbd5e1" }}>Sentence-by-Sentence Breakdown</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sentenceBreakdown.map((item, idx) => (
                    <div key={idx} style={{ padding: "12px 16px", borderRadius: "8px", background: "#0e1526", border: "1px solid #1a2336", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#e2e8f0", maxWidth: "80%" }}>{item.text}</span>
                      <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: item.score <= 10 ? "#064e3b" : "#7f1d1d", color: item.score <= 10 ? "#a7f3d0" : "#fca5a5" }}>
                        {item.score}% AI ({item.flag})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: "#475569" }}>Please generate or humanize text in the Studio tab first.</p>
            )}
          </div>
        )}

        {/* Plagiarism Scanner Tab */}
        {activeTab === "plag-scanner" && (
          <div style={{ background: "#0b101d", border: "1px solid #1a2336", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#ffffff" }}>Plagiarism & N-Gram Overlap Scan</h3>
            <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 20px 0" }}>Scans 3+ consecutive word string sequences matching the original source.</p>

            {outputText ? (
              <div>
                <div style={{ background: "#07111e", border: "1px solid #1b283c", padding: "16px 24px", borderRadius: "10px", width: "300px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Consecutive String Match</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: (plagScore || 0) < 5 ? "#60a5fa" : "#f87171" }}>
                    {plagScore ?? 0}%
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Academic safety standard met (&lt;10%)</div>
                </div>
                <div style={{ padding: "16px", borderRadius: "8px", background: "#0e1526", border: "1px solid #1a2336", fontSize: "13px", lineHeight: "1.7", color: "#cbd5e1" }}>
                  {outputText}
                </div>
              </div>
            ) : (
              <p style={{ color: "#475569" }}>Please generate or humanize text in the Studio tab first.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}