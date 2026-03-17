import React from "react";
import ReactFlow, { MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import "../App.css";

function Flowchart() {
  const nodes = [
    {
      id: "1",
      position: { x: 260, y: 10 },
      data: { label: "Student Inputs" },
      style: {
        background: "#4e73df",
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: 140,
        textAlign: "center",
      },
    },

    {
      id: "2",
      position: { x: 90, y: 140 },
      data: { label: "Sleep Hours" },
      style: {
        background: "#9333ea",
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: 130,
        textAlign: "center",
      },
    },

    {
      id: "3",
      position: { x: 430, y: 140 },
      data: { label: "Study Hours" },
      style: {
        background: "#1cc88a",
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: 130,
        textAlign: "center",
      },
    },

    {
      id: "4",
      position: { x: 260, y: 280 },
      data: { label: "Stress Level" },
      style: {
        background: "#6366f1",
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: 140,
        textAlign: "center",
      },
    },

    {
      id: "5",
      position: { x: 260, y: 410 },
      data: { label: "ML Burnout Model" },
      style: {
        background: "#f59e0b",
        color: "white",
        padding: 10,
        borderRadius: 10,
        width: 150,
        textAlign: "center",
      },
    },

    {
      id: "6",
      position: { x: 255, y: 540 },
      data: { label: "Burnout Prediction Result" },
      style: {
        background: "#ef4444",
        color: "white",
        padding: 12,
        borderRadius: 10,
        width: 160,
        textAlign: "center",
      },
    },
  ];

  const edges = [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#9333ea", strokeWidth: 2 },
    },
    {
      id: "e1-3",
      source: "1",
      target: "3",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#1cc88a", strokeWidth: 2 },
    },
    {
      id: "e2-4",
      source: "2",
      target: "4",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#9333ea", strokeWidth: 2 },
    },
    {
      id: "e3-4",
      source: "3",
      target: "4",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#1cc88a", strokeWidth: 2 },
    },
    {
      id: "e4-5",
      source: "4",
      target: "5",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#f59e0b", strokeWidth: 2 },
    },
    {
      id: "e5-6",
      source: "5",
      target: "6",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#ef4444", strokeWidth: 2 },
    },
  ];

  return (
    <div className="container">
      <div className="card" style={{ width: "950px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "24px" }}>
          Burnout Prediction System Flow
        </h2>

        <div
          style={{
            height: "620px",
            borderRadius: "18px",
            overflow: "hidden",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "10px",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          />
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "24px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <h3
            style={{
              marginBottom: "12px",
              fontSize: "24px",
              fontWeight: "700",
            }}
          >
            AI Explanation
          </h3>

          <p
            style={{
              fontSize: "18px",
              lineHeight: "1.8",
              margin: 0,
            }}
          >
            The burnout prediction system collects student data such as
            <strong> sleep hours</strong> and <strong>study workload</strong>.
            These factors influence the <strong>stress level</strong>, which is
            analyzed by the machine learning model. Based on these patterns,
            the system predicts the student&apos;s burnout risk level.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Flowchart;