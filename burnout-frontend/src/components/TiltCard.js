import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function TiltCard({ children, className = "", style = {}, intensity = 8 }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 200, damping: 20 });
  const rotY = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 200, damping: 20 });
  const highlight = useTransform(
    [mx, my],
    ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.08) 0%, transparent 50%)`
  );

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { mx.set(0.5); my.set(0.5); setHovered(false); };

  // Disable on touch devices
  const isTouch = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
  if (isTouch) return <div className={className} style={style}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={reset}
      style={{
        ...style,
        rotateX: rotX,
        rotateY: rotY,
        transformStyle: "preserve-3d",
        transformPerspective: 1200,
        position: "relative",
      }}
    >
      {children}
      {/* Glossy highlight that follows the cursor */}
      <motion.div
        style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          background: highlight,
          opacity: hovered ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.25s",
        }}
      />
    </motion.div>
  );
}
