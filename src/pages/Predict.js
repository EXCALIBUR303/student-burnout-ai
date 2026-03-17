import React from "react";
import "../App.css";

function Predict() {
  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2 style={styles.title}>Burnout Assessment</h2>

          <div style={styles.iframeWrapper}>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSe4N_jf95CRa4gBMb6q33RYywEC-gc5hCGw6doVzX6tarqfxg/viewform?embedded=true"
              title="Student Burnout Form"
              style={styles.iframe}
            >
              Loading…
            </iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "30px 16px 40px",
    boxSizing: "border-box",
  },

  wrapper: {
    width: "100%",
    maxWidth: "950px",
    display: "flex",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    background: "rgba(255, 255, 255, 0.10)",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box",
  },

  title: {
    textAlign: "center",
    marginBottom: "18px",
    color: "white",
    fontSize: "28px",
  },

  iframeWrapper: {
    width: "100%",
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
  },

  iframe: {
    width: "100%",
    minWidth: "100%",
    height: "1700px",
    border: "none",
    display: "block",
  },
};

export default Predict;