import React from "react";

/**
 * Small pill. Variants: default | success | warning | danger | info
 * <Badge variant="success">Active</Badge>
 * <Badge icon="🔥">5 day streak</Badge>
 */
export default function Badge({ children, variant = "default", icon, style = {} }) {
  const cls = variant === "default" ? "badge" : `badge badge-${variant}`;
  return (
    <span className={cls} style={style}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}