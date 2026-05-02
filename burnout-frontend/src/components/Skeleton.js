import React from "react";

/**
 * Reusable skeleton. Usage:
 *   <Skeleton h={24} w="60%" />
 *   <Skeleton h={180} radius={12} />
 */
export default function Skeleton({
  w = "100%",
  h = 14,
  radius = 8,
  style = {},
}) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, borderRadius: radius, ...style }}
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton w={70} h={12} />
        <Skeleton w={38} h={38} radius={10} />
      </div>
      <Skeleton w="55%" h={34} />
      <Skeleton w="40%" h={12} />
    </div>
  );
}

export function ChartSkeleton({ height = 320 }) {
  return (
    <div className="chart-card">
      <Skeleton w="40%" h={18} style={{ marginBottom: 20 }} />
      <Skeleton h={height} radius={12} />
    </div>
  );
}