import React from "react";
import { useToast } from "../context/ToastContext";

const ICONS = { success: "✓", error: "⚠", info: "ℹ" };

export default function Toaster() {
  const { toasts, remove } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type} ${t.leaving ? "leaving" : ""}`}
          role="status"
        >
          <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
          <div className="toast-body">
            {t.title && <div className="toast-title">{t.title}</div>}
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
          <button
            className="toast-close"
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}