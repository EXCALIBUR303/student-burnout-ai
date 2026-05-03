import React from "react";
import { motion } from "framer-motion";

const blob = (color) => ({
  background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)`,
  position: "absolute",
  width: "55vw",
  height: "55vw",
  borderRadius: "50%",
  filter: "blur(80px)",
  mixBlendMode: "screen",
  opacity: 0.55,
  willChange: "transform",
  pointerEvents: "none",
});

export default function AuroraBackground() {
  const blobs = [
    { color: "rgba(124, 92, 255, 0.85)",  path: [["10%", "10%"], ["60%", "20%"], ["30%", "60%"]], dur: 22 },
    { color: "rgba(0, 212, 255, 0.80)",   path: [["70%", "70%"], ["20%", "60%"], ["80%", "30%"]], dur: 28 },
    { color: "rgba(245, 100, 200, 0.65)", path: [["40%", "80%"], ["80%", "40%"], ["20%", "20%"]], dur: 34 },
    { color: "rgba(34, 197, 94, 0.45)",   path: [["20%", "40%"], ["60%", "80%"], ["50%", "20%"]], dur: 40 },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: -2, overflow: "hidden",
      background: "radial-gradient(ellipse at top, #0d0a1f 0%, #050409 75%)",
    }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          style={blob(b.color)}
          initial={{ x: b.path[0][0], y: b.path[0][1] }}
          animate={{
            x: [b.path[0][0], b.path[1][0], b.path[2][0], b.path[0][0]],
            y: [b.path[0][1], b.path[1][1], b.path[2][1], b.path[0][1]],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Grain overlay for depth */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        opacity: 0.04, mixBlendMode: "overlay",
      }} />
    </div>
  );
}
