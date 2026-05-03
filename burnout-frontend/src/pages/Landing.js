import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../App.css";

/* ── AnimCounter: counts up to `end` when element enters the viewport ──────── */
function AnimCounter({ end, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Data ───────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🧠",
    gradient: "linear-gradient(135deg, #7c5cff 0%, #00d4ff 100%)",
    title: "Pattern recognition",
    desc: "Our XGBoost model detects early burnout signals across sleep, focus, stress, and social patterns — trained on real student data.",
  },
  {
    icon: "📊",
    gradient: "linear-gradient(135deg, #00d4ff 0%, #22c55e 100%)",
    title: "Live dashboard",
    desc: "See your trends over time with interactive charts, stress distributions, and GPA correlations updated live.",
  },
  {
    icon: "🌱",
    gradient: "linear-gradient(135deg, #22c55e 0%, #ffd166 100%)",
    title: "Recovery playbook",
    desc: "A personalized recovery flow that adapts to your risk level and tracks your progress day by day.",
  },
  {
    icon: "🤖",
    gradient: "linear-gradient(135deg, #ff4d8f 0%, #7c5cff 100%)",
    title: "AI counselor",
    desc: "An always-on AI chatbot trained on burnout research, ready to listen 24/7 and give evidence-based guidance.",
  },
];

const STEPS = [
  { n: "01", icon: "📝", title: "Take the assessment", desc: "Answer questions about your daily patterns — study, sleep, social life, physical activity. Takes under 2 minutes." },
  { n: "02", icon: "⚡", title: "Get your risk score",  desc: "Our AI model classifies your burnout level — Low, Moderate, or High — with personalised explanations." },
  { n: "03", icon: "🎯", title: "Follow your plan",     desc: "Work through a recovery flow tailored to your score. Track progress, earn badges, chat with your AI counselor." },
];

const TESTIMONIALS = [
  {
    name: "Priya S.", role: "3rd year · Computer Science", avatar: "👩‍💻", rating: 5,
    text: "I didn't realize how burnt out I was until this app showed me my patterns. The recovery plan actually helped — I went from high risk to low in 3 weeks.",
  },
  {
    name: "Marcus T.", role: "2nd year · Medicine", avatar: "👨‍⚕️", rating: 5,
    text: "The daily tips and chatbot are genuinely useful. It doesn't feel like a generic wellness app — it understands student life specifically.",
  },
  {
    name: "Aisha K.", role: "Masters · Data Science", avatar: "👩‍🔬", rating: 5,
    text: "The dashboard breakdown was eye-opening. Seeing my stress compared to thousands of other students made me take action.",
  },
];

const PRIVACY_PILLS = [
  { icon: "🔒", label: "No account required" },
  { icon: "🛡️", label: "Zero data sold" },
  { icon: "🌐", label: "Open source model" },
  { icon: "💨", label: "Anonymous by default" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  /* auto-rotate testimonials every 4 s */
  useEffect(() => {
    const t = setInterval(
      () => setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length),
      4000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing">

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <motion.div className="eyebrow"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <span className="eyebrow-dot" />
          AI model · trained on 10,000+ student behaviour patterns
        </motion.div>

        <motion.h1 className="hero-title" initial="hidden" animate="show" custom={1} variants={fadeUp}>
          Stop burning out{" "}
          <span className="grad-text-rainbow">before it stops you.</span>
        </motion.h1>

        <motion.p className="hero-sub" initial="hidden" animate="show" custom={2} variants={fadeUp}>
          An AI companion built for students. Predict your burnout risk in under two minutes,
          understand <em>why</em>, and get a recovery plan that actually adapts to you.
        </motion.p>

        <motion.div className="cta-row" initial="hidden" animate="show" custom={3} variants={fadeUp}>
          <button onClick={() => navigate("/predict")}>Start free assessment →</button>
          <button className="btn-ghost" onClick={() => navigate("/login")}>I have an account</button>
        </motion.div>

        {/* Floating mock-result preview card */}
        <motion.div className="hero-preview-card"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <div className="preview-header">
            <div className="preview-dot" style={{ background: "#ef4444" }} />
            <div className="preview-dot" style={{ background: "#f59e0b" }} />
            <div className="preview-dot" style={{ background: "#22c55e" }} />
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              prediction result
            </span>
          </div>
          <div className="preview-body">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #00d4ff)",
                display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0,
              }}>✅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--success)", fontSize: 17, lineHeight: 1.2 }}>Low Risk</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Confidence: 94%</div>
              </div>
              <div className="badge badge-success" style={{ fontSize: 11 }}>Healthy</div>
            </div>
            <div style={{ height: 6, background: "var(--surface-strong)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: "28%" }}
                transition={{ delay: 1.1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: "100%", background: "linear-gradient(90deg,#22c55e,#00d4ff)", borderRadius: 3 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
              <span>Risk score: 28 / 100</span>
              <span>↑ Better than 72% of students</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {[["📚","Study","7.2h"],["😴","Sleep","7.8h"],["🏃","Activity","1.1h"],["👥","Social","2.4h"]].map(([e,l,v]) => (
                <div key={l} style={{
                  padding: "5px 9px", background: "var(--surface-strong)",
                  borderRadius: 8, fontSize: 11, display: "flex", gap: 5, alignItems: "center",
                }}>
                  <span>{e}</span>
                  <span style={{ color: "var(--text-dim)" }}>{l}:</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Trust metrics */}
        <motion.div className="hero-metrics" initial="hidden" animate="show" custom={5} variants={fadeUp}>
          <div className="hero-metric">
            <div className="hero-metric-value mono"><AnimCounter end={92} suffix="%" /></div>
            <div className="hero-metric-label">Model accuracy</div>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <div className="hero-metric-value mono"><AnimCounter end={2} suffix=" min" /></div>
            <div className="hero-metric-label">Average time</div>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <div className="hero-metric-value mono"><AnimCounter end={10000} suffix="+" /></div>
            <div className="hero-metric-label">Students supported</div>
          </div>
        </motion.div>
      </section>

      {/* ===== PRIVACY PILLS ===== */}
      <motion.div className="privacy-pills-row"
        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5 }}>
        {PRIVACY_PILLS.map((p) => (
          <div key={p.label} className="privacy-pill">
            <span>{p.icon}</span><span>{p.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ===== FEATURES 2×2 ===== */}
      <section style={{ marginBottom: 80 }}>
        <div className="section-label">What it does</div>
        <h2 className="section-title">Built for how students actually live</h2>

        <div className="feature-grid-2x2">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="feature-card-v2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}>
              <div className="feature-icon-v2" style={{ background: f.gradient }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{ marginBottom: 80 }}>
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to feeling better</h2>

        <div className="steps-grid-v2">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} className="step-card-v2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}>
              <div className="step-icon-row">
                <span className="step-num mono">{s.n}</span>
                <span className="step-emoji">{s.icon}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              {i < STEPS.length - 1 && <div className="step-connector" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section style={{ marginBottom: 80 }}>
        <div className="section-label">Real stories</div>
        <h2 className="section-title">Students who took back control</h2>

        <div className="testimonials-wrapper">
          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial} className="testimonial-card"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <div className="testimonial-stars">
                {"★".repeat(TESTIMONIALS[activeTestimonial].rating)}
              </div>
              <p className="testimonial-text">"{TESTIMONIALS[activeTestimonial].text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{TESTIMONIALS[activeTestimonial].avatar}</div>
                <div>
                  <div className="testimonial-name">{TESTIMONIALS[activeTestimonial].name}</div>
                  <div className="testimonial-role">{TESTIMONIALS[activeTestimonial].role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="testimonial-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`testimonial-dot${i === activeTestimonial ? " active" : ""}`}
                onClick={() => setActiveTestimonial(i)}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <motion.section className="landing-cta-block"
        initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="cta-glow" aria-hidden="true" />
        <div className="cta-badge">🎓 Free for all students</div>
        <h2 style={{ position: "relative", marginBottom: 12 }}>
          Your wellbeing shouldn't wait for winter break.
        </h2>
        <p style={{ position: "relative", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Free. Private. Two minutes. Start with one honest snapshot of how you're really doing.
        </p>
        <div className="cta-row" style={{ position: "relative", marginTop: 28 }}>
          <button onClick={() => navigate("/predict")}>Take the assessment →</button>
          <button className="btn-ghost" onClick={() => navigate("/dashboard")}>View live dashboard</button>
        </div>
      </motion.section>

    </div>
  );
}
