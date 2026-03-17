import React, { useEffect, useRef, useState } from "react";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I’m your Supportive AI Assistant. How are you feeling today?",
      time: getCurrentTime(),
    },
  ]);

  const messagesEndRef = useRef(null);

  const starterPrompts = [
    "I feel tired all the time",
    "I can’t focus on studying",
    "I feel overwhelmed",
    "How do I reduce burnout?",
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      input::placeholder {
        color: #64748b;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  function getCurrentTime() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      sender: "user",
      text: text.trim(),
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const botReply = {
        sender: "bot",
        text: "I’m here for you. It sounds like you may be dealing with a lot right now. Try taking one slow breath, relaxing your shoulders, and tell me what has been feeling most overwhelming lately.",
        time: getCurrentTime(),
      };
      setMessages((prev) => [...prev, botReply]);
      setLoading(false);
    }, 1200);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={styles.floatingButton}
          aria-label="Open chatbot"
        >
          <span style={styles.floatingIcon}>💬</span>
        </button>
      )}

      <div
        style={{
          ...styles.chatWrapper,
          ...(open ? styles.chatOpen : styles.chatClosed),
          ...(isMobile ? styles.chatWrapperMobile : {}),
        }}
      >
        <div
          style={{
            ...styles.chatContainer,
            ...(isMobile ? styles.chatContainerMobile : {}),
          }}
        >
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.avatar}>🌿</div>
              <div>
                <div style={styles.headerTitle}>Burnout Support Bot</div>
                <div style={styles.headerSubtitle}>
                  <span style={styles.statusDot}></span>
                  Supportive AI Assistant
                </div>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={styles.closeButton}
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>

          <div style={styles.messagesArea}>
            {messages.length === 1 && (
              <div style={styles.welcomeCard}>
                <div style={styles.welcomeTitle}>You’re not alone.</div>
                <div style={styles.welcomeText}>
                  Start with one of these common feelings or questions.
                </div>

                <div style={styles.promptContainer}>
                  {starterPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      style={styles.promptButton}
                      onClick={() => sendMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.messageRow,
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.messageGroup,
                    alignItems:
                      msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(msg.sender === "user"
                        ? styles.userBubble
                        : styles.botBubble),
                    }}
                  >
                    {msg.text}
                  </div>
                  <div style={styles.timestamp}>{msg.time}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.messageRow}>
                <div style={styles.messageGroup}>
                  <div style={{ ...styles.messageBubble, ...styles.botBubble }}>
                    <span style={styles.typingDots}>
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                    <span style={{ marginLeft: "8px" }}>Typing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputSection}>
            <div style={styles.inputArea}>
              <input
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
                style={{
                  ...styles.sendButton,
                  ...((!input.trim() || loading) && styles.sendButtonDisabled),
                }}
                aria-label="Send message"
              >
                ➤
              </button>
            </div>

            <div style={styles.footerNote}>
              Not a replacement for professional help.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  floatingButton: {
    position: "fixed",
    bottom: "22px",
    right: "22px",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #6d83f2, #8b5cf6)",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 14px 35px rgba(79, 70, 229, 0.35)",
    zIndex: 1000,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  floatingIcon: {
    fontSize: "26px",
  },

  chatWrapper: {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    zIndex: 1000,
    transition: "all 0.3s ease",
    transformOrigin: "bottom right",
  },

  chatOpen: {
    opacity: 1,
    transform: "translateY(0) scale(1)",
    pointerEvents: "auto",
  },

  chatClosed: {
    opacity: 0,
    transform: "translateY(20px) scale(0.96)",
    pointerEvents: "none",
  },

  chatWrapperMobile: {
    right: 0,
    bottom: 0,
    left: 0,
    top: 0,
  },

  chatContainer: {
    width: "370px",
    height: "620px",
    maxHeight: "90vh",
    background: "#f8fbff",
    borderRadius: "24px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
    border: "1px solid rgba(255,255,255,0.6)",
    backdropFilter: "blur(10px)",
  },

  chatContainerMobile: {
    width: "100vw",
    height: "100vh",
    maxHeight: "100vh",
    borderRadius: "0",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 18px",
    background: "linear-gradient(135deg, #7c93ff, #9b8cff)",
    color: "white",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  headerTitle: {
    fontSize: "17px",
    fontWeight: "700",
  },

  headerSubtitle: {
    fontSize: "12px",
    opacity: 0.95,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "3px",
  },

  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#86efac",
    display: "inline-block",
  },

  closeButton: {
    border: "none",
    background: "rgba(255,255,255,0.16)",
    color: "white",
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    background:
      "linear-gradient(to bottom, rgba(255,255,255,0.65), rgba(241,245,249,0.85))",
  },

  welcomeCard: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  welcomeTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "6px",
  },

  welcomeText: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "14px",
    lineHeight: "1.5",
  },

  promptContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  promptButton: {
    border: "1px solid #dbe4ff",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "13px",
    cursor: "pointer",
    lineHeight: "1.3",
  },

  messageRow: {
    display: "flex",
    marginBottom: "14px",
  },

  messageGroup: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "82%",
  },

  messageBubble: {
    padding: "12px 15px",
    borderRadius: "18px",
    fontSize: "14px",
    lineHeight: "1.5",
    wordBreak: "break-word",
  },

  botBubble: {
    background: "#ffffff",
    color: "#1e293b",
    borderTopLeftRadius: "8px",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e5e7eb",
  },

  userBubble: {
    background: "linear-gradient(135deg, #6d83f2, #8b5cf6)",
    color: "white",
    borderTopRightRadius: "8px",
    boxShadow: "0 8px 20px rgba(99, 102, 241, 0.24)",
  },

  timestamp: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "5px",
    padding: "0 4px",
  },

  inputSection: {
    borderTop: "1px solid #e2e8f0",
    background: "rgba(255,255,255,0.95)",
    padding: "12px",
  },

  inputArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  input: {
    flex: 1,
    border: "1px solid #dbe4ff",
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },

  sendButton: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #6d83f2, #8b5cf6)",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(99, 102, 241, 0.26)",
  },

  sendButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  footerNote: {
    textAlign: "center",
    fontSize: "11px",
    color: "#64748b",
    marginTop: "10px",
  },

  typingDots: {
    display: "inline-block",
    letterSpacing: "2px",
    fontWeight: "bold",
  },
};