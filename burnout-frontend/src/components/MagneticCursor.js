import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function MagneticCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 28, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 500, damping: 28, mass: 0.5 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    setVisible(true);

    const onMove = (e) => { x.set(e.clientX); y.set(e.clientY); };
    const onOver = (e) => {
      const t = e.target.closest("button, a, input, [role=button], .interactive");
      setHovering(!!t);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [x, y]);

  if (!visible) return null;

  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0,
        width: hovering ? 36 : 10, height: hovering ? 36 : 10,
        borderRadius: "50%",
        background: hovering ? "rgba(124,92,255,0.18)" : "var(--accent-1, #7c5cff)",
        mixBlendMode: hovering ? "screen" : "normal",
        translateX: "-50%", translateY: "-50%",
        x: sx, y: sy,
        pointerEvents: "none", zIndex: 9999,
        transition: "width 0.2s, height 0.2s, background 0.2s",
        border: hovering ? "1.5px solid var(--accent-1, #7c5cff)" : "none",
        boxShadow: hovering ? "0 0 16px rgba(124,92,255,0.4)" : "0 0 8px rgba(124,92,255,0.6)",
      }}
    />
  );
}
