import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../App.css";

const FEATURES = [
  {
    icon: "🧠",
    title: "Pattern recognition",
    desc: "An adaptive questionnaire detects early burnout signals across sleep, focus, stress, and social patterns.",
  },
  {
    icon: "📈",
    title: "Live dashboard",
    desc: "See your trends over time with interactive charts, stress distributions, and GPA correlations at a glance.",
  },
  {
    icon: "🌱",
    title: "Recovery playbook",
    desc: "A personalized recovery flow that adapts to your risk level and tracks your progress day by day.",
  },
];

const STEPS = [
  { n: "01", title: "Take the assessment", desc: "Answer 10 short questions about your daily patterns. Takes under 2 minutes." },
  { n: "02", title: "Get your risk score", desc: "Our model classifies your burnout level — Low, Moderate, or High — with explanations." },
  { n: "03", title: "Follow your plan", desc: "Work through a recovery flow tailored to your score. Build streaks, unlock badges." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* =============== HERO =============== */}
      <section className="landing-hero">
        <motion.div
          className="eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="eyebrow-dot" />
          AI model · trained on student behavior patterns
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          custom={1}
          variants={fadeUp}
        >
          Stop burning out <span className="grad-text-rainbow">before it stops you.</span>
        </motion.h1>

        <motion.p
          className="hero-sub"
          initial="hidden"
          animate="show"
          custom={2}
          variants={fadeUp}
        >
          An AI companion for students. Predict your burnout risk in under two minutes,
          understand <em>why</em>, and get a recovery plan that adapts to you.
        </motion.p>

        <motion.div
          className="cta-row"
          initial="hidden"
          animate="show"
          custom={3}
          variants={fadeUp}
        >
          <button onClick={() => navigate("/predict")}>
            Start assessment →
          </button>
          <button className="btn-ghost" onClick={() => navigate("/login")}>
            I have an account
          </button>
        </motion.div>

        {/* Trust metrics */}
        <motion.div
          className="hero-metrics"
          initial="hidden"
          animate="show"
          custom={4}
          variants={fadeUp}
        >
          <div className="hero-metric">
            <div className="hero-metric-value mono">92%</div>
            <div className="hero-metric-label">Model accuracy</div>
          </div>
          <div className="hero-metric">
            <div className="hero-metric-value mono">2 min</div>
            <div className="hero-metric-label">Average time</div>
          </div>
          <div className="hero-metric">
            <div className="hero-metric-value mono">10k+</div>
            <div className="hero-metric-label">Students supported</div>
          </div>
        </motion.div>
      </section>

      {/* =============== FEATURES =============== */}
      <section>
        <div className="section-label">What it does</div>
        <h2 className="section-title">Built for how students actually live</h2>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =============== HOW IT WORKS =============== */}
      <section>
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to feeling better</h2>

        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              className="step-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <span className="step-num mono">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =============== FINAL CTA =============== */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          marginTop: 40,
          padding: "48px 32px",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border-strong)",
          background: "var(--surface)",
          backdropFilter: "blur(20px)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 0%, rgba(124,92,255,0.25), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <h2 style={{ position: "relative", marginBottom: 12 }}>
          Your wellbeing shouldn't wait for winter break.
        </h2>
        <p style={{ position: "relative", marginBottom: 28, maxWidth: 520, margin: "0 auto 28px" }}>
          Free. Private. Two minutes. Start with one honest snapshot of how you're really doing.
        </p>
        <div className="cta-row" style={{ position: "relative" }}>
          <button onClick={() => navigate("/predict")}>Take the assessment</button>
        </div>
      </motion.section>
    </div>
  );
}