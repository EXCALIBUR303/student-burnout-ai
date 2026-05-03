import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

export default function AnimatedNumber({ value, duration = 1.2, decimals = 0, suffix = "", prefix = "" }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (n) =>
    `${prefix}${decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString()}${suffix}`
  );

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, duration, mv]);

  return <motion.span>{rounded}</motion.span>;
}
