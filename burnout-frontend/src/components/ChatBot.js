import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Detect topic from user message
const detectTopic = (text) => {
  const t = text.toLowerCase();
  if (t.includes("sleep") || t.includes("tired") || t.includes("fatigue") || t.includes("insomnia")) return "sleep";
  if (t.includes("focus") || t.includes("concentrate") || t.includes("distract"))   return "focus";
  if (t.includes("overwhelm") || t.includes("too much") || t.includes("can't cope")) return "overwhelm";
  if (t.includes("stress") || t.includes("pressure") || t.includes("tense"))         return "stress";
  if (t.includes("anxious") || t.includes("anxiety") || t.includes("worry") || t.includes("panic")) return "anxiety";
  if (t.includes("study") || t.includes("exam") || t.includes("assignment") || t.includes("deadline")) return "study";
  if (t.includes("burnout") || t.includes("exhausted") || t.includes("give up") || t.includes("done")) return "burnout";
  if (t.includes("motivat") || t.includes("lazy") || t.includes("procrastinat"))     return "motivation";
  if (t.includes("lonely") || t.includes("isolated") || t.includes("alone") || t.includes("social"))  return "social";
  if (t.includes("mood") || t.includes("sad") || t.includes("depress"))              return "mood";
  if (t.includes("eat") || t.includes("food") || t.includes("meal"))                 return "food";
  return "general";
};

// First response per topic (called when backend fails or for direct messages)
const localReply = (text) => {
  const topic = detectTopic(text);
  return FIRST_REPLY[topic] || FIRST_REPLY.general;
};

const FIRST_REPLY = {
  sleep:      "Fatigue is one of the earliest burnout signals. Try a fixed wind-down time tonight — even 30 minutes earlier than usual can reset your sleep rhythm. What does your bedtime routine look like?",
  focus:      "Concentration drops when your brain is overloaded. Try the 45-15 rule: 45 minutes of focused work, then 15 minutes fully off-screen. Phone in another room makes a surprisingly big difference.",
  overwhelm:  "When everything piles up, narrow your focus to just one task for the next 25 minutes. Write the others down so your brain stops holding them. What's the one thing weighing on you most right now?",
  stress:     "Stress is a signal, not a verdict. Try box breathing right now: inhale 4s → hold 4s → exhale 4s → hold 4s. Do 4 cycles. Then identify the one stressor you actually control today.",
  anxiety:    "Anxiety often comes from focusing on things outside your control. Try 5-4-3-2-1 grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Brings you back to now.",
  study:      "Academic pressure is a top burnout driver. Instead of studying harder, study in shorter, more frequent sessions — 3 × 45 min beats one 3-hour block every time. When's your next deadline?",
  burnout:    "Burnout needs real rest, not just a short break. Schedule at least one full day this week with zero academic work. You can't pour from an empty cup — recovery is productive.",
  motivation: "Low motivation is usually depleted energy, not laziness. Sleep, regular meals, and 10 minutes outside are the fastest rebuilders. Start with the smallest possible first step — even 2 minutes.",
  social:     "Social connection is a direct stress buffer. You don't need big plans — even a 10-minute call with someone you trust helps significantly. Who's one person you could reach out to today?",
  mood:       "It's okay to not be okay. Low mood during a stressful period is very common. Try logging 3 small things that went okay today — it gently shifts your brain's focus. If this persists, please talk to a counsellor.",
  food:       "Skipping meals is a hidden stressor — blood sugar crashes amplify anxiety and kill focus. Even a small snack every 4 hours keeps your brain running steadily.",
  general:    "I'm here for you. Take one slow breath, relax your shoulders, and tell me what's been weighing on you most. There are no wrong answers here.",
};

// Context-aware follow-ups for quick reply buttons
const TOPIC_FOLLOWUPS = {
  sleep: {
    "Tell me more":           "The key is sleep consistency — waking at the same time every day, even weekends, anchors your circadian rhythm. Avoid caffeine after 2 pm and keep your room below 19°C. Even one extra hour makes a measurable difference in mood and focus.",
    "What should I try tonight?": "Tonight: put your phone in another room 45 min before bed, dim your lights, and try 4-7-8 breathing as you lie down (inhale 4s, hold 7s, exhale 8s). Do 4 cycles. Your body will start linking this routine to sleep.",
    "Why does this happen?":  "Burnout spikes cortisol at night — your stress hormone — which directly blocks melatonin release. That's why you feel tired but can't sleep. Chronic stress essentially jams the switch that tells your brain it's safe to rest.",
    "How long will it take?": "Sleep quality improves noticeably in 5–7 days of consistent sleep/wake times. Full circadian rhythm reset takes about 2 weeks of discipline. The first 3 nights are the hardest.",
  },
  focus: {
    "Tell me more":           "The prefrontal cortex — your focus centre — fatigues after about 45 minutes of deep work. Short breaks restore it fully, letting you sustain 4–6 hours of real focus per day instead of grinding through 8 hours of diminishing returns.",
    "What should I try tonight?": "Clear your desk completely, put your phone face-down in another room, and set a 45-minute timer. Work on just one thing. After the timer, take a 10-minute walk — no screens. This is the full reset cycle.",
    "Why does this happen?":  "When you're stressed or sleep-deprived, your working memory shrinks. The brain prioritises threat-detection over complex thinking — your concentration is literally the first casualty of a stressed nervous system.",
    "How long will it take?": "Most people notice sharper focus within 3–5 days of consistent sleep and structured work blocks. Deep focus capacity fully recovers in 2–3 weeks of deliberate practice.",
  },
  stress: {
    "Tell me more":           "Chronic stress keeps cortisol elevated, which impairs memory, focus, and immune function over time. The physical symptoms — tight chest, headaches, poor sleep — are all cortisol side effects, not just feelings in your head.",
    "What should I try tonight?": "Try a 'brain dump' tonight: spend 10 minutes writing everything on your mind — worries, tasks, random thoughts. It moves the load from working memory to paper and lets your brain genuinely downregulate before sleep.",
    "Why does this happen?":  "Stress is your brain's threat response. During exams or heavy workloads, it treats academic pressure the same as a physical danger — flooding your body with adrenaline and cortisol, which eventually exhausts your reserves.",
    "How long will it take?": "Acute stress subsides within hours of removing the stressor. Chronic stress recovery takes 2–4 weeks of consistent sleep, movement, and stress management techniques used daily.",
  },
  anxiety: {
    "Tell me more":           "Anxiety is your threat-detection system running hot. The 5-4-3-2-1 grounding technique works because naming physical sensations forces your brain to engage the rational prefrontal cortex, quieting the anxious amygdala.",
    "What should I try tonight?": "Before bed, write down your 3 biggest worries. Next to each, write one small action you could take. This converts vague anxiety into concrete plans and tells your brain the threat is 'handled' — allowing it to relax.",
    "Why does this happen?":  "Academic anxiety often starts with one overwhelming event, then generalises into anticipatory fear of all tasks. Your nervous system is trying to protect you from failure — it's just miscalibrated to the threat level.",
    "How long will it take?": "With grounding techniques and consistent sleep, anxiety symptoms reduce within 1–2 weeks. If it's persistent or severe, a counsellor can speed recovery significantly — that's a strength, not a weakness.",
  },
  study: {
    "Tell me more":           "Spaced repetition is the most evidence-backed study method: review material at increasing intervals (1 day, 3 days, 1 week, 2 weeks). Your brain encodes long-term memory when it's forced to recall, not when it passively re-reads.",
    "What should I try tonight?": "Write down the 3 most important concepts from today's study. Tomorrow morning, try to recall them without notes before looking. This one habit improves retention by 40–60% compared to re-reading alone.",
    "Why does this happen?":  "Academic pressure triggers the stress response, which narrows focus to short-term survival (finishing the task) rather than deep learning. That's why crammed knowledge evaporates after exams — it was never encoded properly.",
    "How long will it take?": "Switching to active recall shows measurably better retention within 2 weeks. It feels slower at first — that difficulty is the signal that it's actually working and building memory.",
  },
  burnout: {
    "Tell me more":           "Burnout happens in stages: enthusiasm → stagnation → frustration → apathy. Most people only notice at frustration or apathy. The recovery path reverses it: rest → reconnect → rebuild — and each stage takes time to move through.",
    "What should I try tonight?": "Do nothing academic tonight. Watch something you enjoy, eat a proper meal, go to bed on time. Recovery starts with one rest day — not a plan or a schedule. Just genuine rest. That's step one.",
    "Why does this happen?":  "Burnout is what happens when your output consistently exceeds your capacity to recover. You give more than you rest, recover, or receive. It's not a character flaw — it's a math problem that's been building.",
    "How long will it take?": "Mild burnout: 1–2 weeks of deliberate rest. Moderate: 1–3 months. Severe: 3–6 months. The earlier you catch and address it, the faster the recovery. You're doing the right thing by paying attention to it now.",
  },
  motivation: {
    "Tell me more":           "Motivation follows action, not the other way around. The 'motivation-action loop': you don't wait to feel motivated — you take the smallest possible action, which generates dopamine, which creates motivation. Start with 2 minutes.",
    "What should I try tonight?": "Set a 2-minute rule: commit to working on your hardest task for just 2 minutes. No phone, no distractions. Most people keep going past 2 minutes — but even if you stop, you've broken the avoidance cycle for today.",
    "Why does this happen?":  "Low motivation is usually a dopamine deficit from chronic stress. Your brain's reward system is depleted from overwork. Small wins — finishing a task, exercise, a good meal — are the fastest way to rebuild the dopamine baseline.",
    "How long will it take?": "Momentum builds quickly: most people feel meaningfully more motivated within 3–5 days of small consistent wins plus adequate sleep. The first day of action is always the hardest.",
  },
  social: {
    "Tell me more":           "Social connection buffers cortisol and triggers oxytocin — which actively counteracts the stress response. You don't need large groups or long events. Even a 10-minute genuine conversation reduces perceived stress measurably.",
    "What should I try tonight?": "Send a voice note or call one person you care about — even 5 minutes. Don't mention studying or stress unless you want to. The goal is human connection, not venting. That alone shifts your nervous system state.",
    "Why does this happen?":  "When stressed and overwhelmed, isolation feels safer because it reduces demands. But it also removes the social buffering that prevents stress from compounding. Withdrawal is the trap that makes burnout worse.",
    "How long will it take?": "The mood-lifting effect of social connection is often immediate. Sustained reduction in isolation-related stress builds over 1–2 weeks of consistent small social interactions.",
  },
  mood: {
    "Tell me more":           "Low mood during high-stress periods is extremely common and usually temporary. The 3-good-things exercise works by training your brain's attention — it's not toxic positivity, it's literally rewiring attentional bias over time.",
    "What should I try tonight?": "Before sleep, write 3 things that went okay today — even tiny ones (ate breakfast, replied to a message, got through a lecture). No minimising allowed. Over 2 weeks this measurably shifts baseline mood.",
    "Why does this happen?":  "Stress depletes serotonin and dopamine — the neurotransmitters that regulate mood. Combined with poor sleep, they produce a state that feels like permanent low mood but is actually a physiological deficit, not a personality trait.",
    "How long will it take?": "Mood lifts noticeably within 5–7 days of sleep improvement and the 3-good-things practice. If low mood persists beyond 2 weeks regardless of lifestyle changes, please consider speaking with a professional.",
  },
  general: {
    "Tell me more":           "The three highest-leverage interventions for burnout and stress — in order — are: 1) consistent sleep schedule, 2) daily movement (even a 20-min walk), and 3) reducing decision fatigue by simplifying your day. Which of these feels most doable right now?",
    "What should I try tonight?": "Tonight's three things: go to bed 30 minutes earlier than usual, put your phone on Do Not Disturb when you lie down, and write tomorrow's top 3 tasks on paper so your brain can let go of tracking them.",
    "Why does this happen?":  "Stress and burnout happen when sustained demands exceed your capacity to recover. It's not about being weak — it's about the math of output vs recovery time being out of balance for too long.",
    "How long will it take?": "Small changes show results in 5–7 days. Habit formation takes 3–4 weeks. Full recovery from significant burnout takes 1–3 months. But you'll feel meaningfully better long before full recovery.",
  },
  overwhelm: {
    "Tell me more":           "Overwhelm happens when the number of open decisions and tasks exceeds working memory. The fix isn't doing more — it's collapsing everything into one list and working sequentially. Your brain can only hold 4–7 items at once.",
    "What should I try tonight?": "Do a complete brain dump: set a timer for 10 minutes and write every task, worry, and obligation you're carrying. Then pick ONE item for tomorrow morning. Just one. Everything else is temporarily off your plate.",
    "Why does this happen?":  "Modern academic environments create what psychologists call 'cognitive overload' — too many competing demands with unclear priorities. Your brain can't focus because it's constantly context-switching between threats.",
    "How long will it take?": "The sense of overwhelm often lifts within hours of externalising your task list and choosing one priority. The underlying workload takes longer to resolve, but the mental burden eases quickly.",
  },
  food: {
    "Tell me more":           "Blood glucose directly affects cortisol levels and mood stability. Skipping meals causes glucose crashes that spike cortisol, which increases anxiety and impairs focus — creating a stress spiral that has nothing to do with your actual workload.",
    "What should I try tonight?": "Plan tomorrow's meals tonight — even if it's just deciding what you'll eat. Having a plan removes one decision from your morning and helps ensure you actually eat. Even simple, easy food counts.",
    "Why does this happen?":  "Students under pressure often deprioritise eating because it feels like 'wasted time.' But every skipped meal impairs cognitive function for 2–4 hours — making you study worse for longer, not better.",
    "How long will it take?": "The cognitive and mood benefits of regular eating are felt within 1–2 days. Blood sugar stability is nearly immediate. It's one of the fastest lifestyle interventions you can make.",
  },
};

// Render **bold** text in messages
const renderText = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
};

const getStarters = (burnoutResult) => {
  if (burnoutResult === "High Burnout") return ["I'm completely exhausted", "I can't keep up anymore", "How do I recover from burnout?", "I feel like giving up"];
  if (burnoutResult === "Medium Burnout") return ["I feel stressed about exams", "I can't focus on studying", "How do I manage my workload?", "I feel tired all the time"];
  return ["How do I stay motivated?", "How do I prevent burnout?", "I feel a bit overwhelmed", "Tips to study better?"];
};

const QUICK_REPLIES = ["Tell me more", "What should I try tonight?", "Why does this happen?", "How long will it take?"];

export default function ChatBot({ userContext = "", onClose, forceOpen }) {
  const burnoutResult = localStorage.getItem("burnoutResult") || null;
  const starters      = getStarters(burnoutResult);

  const greeting = burnoutResult
    ? `Hi! I can see your assessment came back as **${burnoutResult}**. I'm here to help — what's on your mind?`
    : "Hi! I'm your Burnout Support Assistant. How are you feeling today?";

  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [lastTopic, setLastTopic] = useState("general");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 640);
  const [messages, setMessages] = useState([{ sender: "bot", text: greeting, time: nowTime() }]);

  // Support external open/close control (e.g. from BottomNav)
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 250); }, [open]);

  const addBotMessage = (text) => {
    setMessages((p) => [...p, { sender: "bot", text, time: nowTime() }]);
    setLoading(false);
  };

  const sendMessage = async (text = input, isQuickReply = false) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setMessages((p) => [...p, { sender: "user", text: userText, time: nowTime() }]);
    setInput("");
    setLoading(true);

    // Quick replies: resolve from topic context instead of hitting backend
    if (isQuickReply) {
      const followup = TOPIC_FOLLOWUPS[lastTopic]?.[userText] || TOPIC_FOLLOWUPS.general[userText];
      setTimeout(() => addBotMessage(followup), 500 + Math.random() * 300);
      return;
    }

    // Regular message: detect topic, call backend
    const topic = detectTopic(userText);
    setLastTopic(topic);

    // Build context string from prop or localStorage burnout result
    const contextStr = userContext || (burnoutResult ? `${burnoutResult} risk.` : "");

    // Build history from current messages (before adding the new user message)
    const historyForBackend = messages.slice(-6).map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      text: m.text,
    }));

    try {
      const { data } = await axios.post("/chat", {
        message: userText,
        history: historyForBackend,
        user_context: contextStr,
      });
      const reply = (data.reply && data.reply.length > 20) ? data.reply : localReply(userText);
      setTimeout(() => addBotMessage(reply), 600 + Math.random() * 400);
    } catch {
      setTimeout(() => addBotMessage(localReply(userText)), 600);
    }
  };

  const variantColor = burnoutResult === "High Burnout" ? { bg: "rgba(239,68,68,0.2)", text: "#fca5a5" }
                     : burnoutResult === "Medium Burnout" ? { bg: "rgba(251,191,36,0.2)", text: "#fde68a" }
                     : { bg: "rgba(34,197,94,0.2)", text: "#86efac" };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            style={styles.fab}
            aria-label="Open chat"
          >
            <span style={{ fontSize: 24 }}>💬</span>
            <span style={styles.fabPulse} aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{ ...styles.wrapper, ...(isMobile ? styles.wrapperMobile : {}) }}
          >
            <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>

              {/* Header */}
              <div style={styles.header}>
                <div style={styles.headerLeft}>
                  <div style={styles.avatar}>🌿</div>
                  <div>
                    <div style={styles.headerTitle}>Burnout Support</div>
                    <div style={styles.headerSubtitle}>
                      <span style={styles.statusDot} /> Online · AI assistant
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {burnoutResult && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: variantColor.bg, color: variantColor.text, border: `1px solid ${variantColor.text}40` }}>
                      {burnoutResult}
                    </span>
                  )}
                  <button onClick={() => { setOpen(false); onClose && onClose(); }} style={styles.closeBtn} aria-label="Close">✕</button>
                </div>
              </div>

              {/* Messages */}
              <div style={styles.messages}>
                {messages.length === 1 && (
                  <motion.div style={styles.welcome} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div style={styles.welcomeTitle}>You're not alone.</div>
                    <div style={styles.welcomeText}>Start with one of these, or type your own.</div>
                    <div style={styles.starters}>
                      {starters.map((s, i) => (
                        <motion.button
                          key={s} style={styles.starterChip}
                          onClick={() => sendMessage(s)}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }} whileHover={{ y: -2 }}
                        >{s}</motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    style={{ ...styles.msgRow, justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                  >
                    {msg.sender === "bot" && (
                      <div style={styles.botAvatar}>🌿</div>
                    )}
                    <div style={{ ...styles.msgGroup, alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ ...styles.bubble, ...(msg.sender === "user" ? styles.userBubble : styles.botBubble) }}>
                        {renderText(msg.text)}
                      </div>
                      <div style={styles.timestamp}>{msg.time}</div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <motion.div style={styles.msgRow} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={styles.botAvatar}>🌿</div>
                    <div style={styles.msgGroup}>
                      <div style={{ ...styles.bubble, ...styles.botBubble, padding: "14px 18px" }}>
                        <div style={styles.typingDots}>
                          <span style={styles.dot} />
                          <span style={{ ...styles.dot, animationDelay: "0.15s" }} />
                          <span style={{ ...styles.dot, animationDelay: "0.3s" }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Context-aware quick replies */}
                {!loading && messages.length > 1 && messages[messages.length - 1].sender === "bot" && (
                  <motion.div style={styles.quickReplies} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                    {QUICK_REPLIES.map((qr) => (
                      <button key={qr} style={styles.quickChip} onClick={() => sendMessage(qr, true)}>{qr}</button>
                    ))}
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={styles.inputSection}>
                <div style={styles.inputArea}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type how you're feeling..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    style={styles.input}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    style={{ ...styles.sendBtn, ...((!input.trim() || loading) ? styles.sendBtnDisabled : {}) }}
                    aria-label="Send"
                  >➤</button>
                </div>
                <div style={styles.footerNote}>Not a replacement for professional help.</div>
              </div>
            </div>

            <style>{`
              @keyframes cb-bounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
                40% { transform: translateY(-6px); opacity: 1; }
              }
              @keyframes cb-fab-pulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.25); opacity: 0; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles = {
  fab: { position: "fixed", bottom: 22, right: 22, width: 60, height: 60, borderRadius: "50%", border: "none", background: "var(--grad-primary)", color: "#fff", cursor: "pointer", boxShadow: "0 14px 35px rgba(124,92,255,0.45)", zIndex: 1000, display: "grid", placeItems: "center", padding: 0 },
  fabPulse: { position: "absolute", inset: 0, borderRadius: "50%", background: "var(--accent-1)", animation: "cb-fab-pulse 2.2s ease-out infinite", zIndex: -1 },
  wrapper: { position: "fixed", right: 22, bottom: 22, zIndex: 1000, transformOrigin: "bottom right" },
  wrapperMobile: { right: 0, bottom: 0, left: 0, top: 0 },
  container: { width: 390, height: 650, maxHeight: "88vh", background: "var(--bg-elevated)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-strong)" },
  containerMobile: { width: "100vw", height: "100vh", maxHeight: "100vh", borderRadius: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--grad-primary)", color: "#fff", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.22)", display: "grid", placeItems: "center", fontSize: 18, backdropFilter: "blur(10px)" },
  botAvatar: { width: 28, height: 28, borderRadius: "50%", background: "var(--surface-strong)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0, alignSelf: "flex-end", marginRight: 6, marginBottom: 18 },
  headerTitle: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" },
  headerSubtitle: { fontSize: 11, opacity: 0.9, display: "flex", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: "#86efac", display: "inline-block", boxShadow: "0 0 6px #86efac" },
  closeBtn: { border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0 },
  messages: { flex: 1, overflowY: "auto", padding: "14px 14px 6px", background: "var(--bg)", display: "flex", flexDirection: "column" },
  welcome: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 14 },
  welcomeTitle: { fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  welcomeText: { fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 },
  starters: { display: "flex", flexWrap: "wrap", gap: 7 },
  starterChip: { border: "1px solid var(--border-strong)", background: "var(--bg-elevated)", color: "var(--text)", borderRadius: 999, padding: "7px 12px", fontSize: 12, cursor: "pointer", lineHeight: 1.2, width: "auto", fontWeight: 500, boxShadow: "none" },
  msgRow: { display: "flex", marginBottom: 8, alignItems: "flex-end" },
  msgGroup: { display: "flex", flexDirection: "column", maxWidth: "80%" },
  bubble: { padding: "10px 13px", borderRadius: 16, fontSize: 13.5, lineHeight: 1.6, wordBreak: "break-word" },
  botBubble: { background: "var(--surface-strong)", color: "var(--text)", border: "1px solid var(--border)", borderTopLeftRadius: 4 },
  userBubble: { background: "var(--grad-primary)", color: "#fff", borderTopRightRadius: 4, boxShadow: "0 4px 12px rgba(124,92,255,0.3)" },
  timestamp: { fontSize: 10, color: "var(--text-dim)", marginTop: 3, padding: "0 4px" },
  typingDots: { display: "inline-flex", gap: 4, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", animation: "cb-bounce 1.2s infinite ease-in-out" },
  quickReplies: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginLeft: 34, marginBottom: 4 },
  quickChip: { border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--accent-1)", borderRadius: 999, padding: "5px 12px", fontSize: 11.5, cursor: "pointer", width: "auto", boxShadow: "none", fontWeight: 600 },
  inputSection: { borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", padding: "10px 12px", flexShrink: 0 },
  inputArea: { display: "flex", alignItems: "center", gap: 8 },
  input: { flex: 1, border: "1px solid var(--border-strong)", borderRadius: 13, padding: "11px 13px", fontSize: 13.5, outline: "none", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit" },
  sendBtn: { width: 42, height: 42, borderRadius: 11, border: "none", background: "var(--grad-primary)", color: "#fff", fontSize: 15, cursor: "pointer", boxShadow: "0 6px 16px rgba(124,92,255,0.3)", padding: 0, flexShrink: 0 },
  sendBtnDisabled: { opacity: 0.4, cursor: "not-allowed", boxShadow: "none" },
  footerNote: { textAlign: "center", fontSize: 10, color: "var(--text-dim)", marginTop: 8 },
};
