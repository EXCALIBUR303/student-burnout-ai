import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext();

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    // Mark leaving first (triggers exit animation), then strip after
    setToasts((curr) =>
      curr.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, 240);
  }, []);

  const push = useCallback(
    ({ type = "info", title, message, duration = 3800 }) => {
      const id = ++idCounter;
      setToasts((curr) => [...curr, { id, type, title, message, leaving: false }]);
      if (duration > 0) setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const toast = {
    success: (title, message) => push({ type: "success", title, message }),
    error:   (title, message) => push({ type: "error",   title, message }),
    info:    (title, message) => push({ type: "info",    title, message }),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, remove }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};