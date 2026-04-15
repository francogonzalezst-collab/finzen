"use client";
export default function Error({ error }: { error: Error }) {
  return (
    <div style={{ padding: 20, color: "red", background: "#111", minHeight: "100vh", fontFamily: "monospace" }}>
      <h1>Error en Dashboard</h1>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error.message}</pre>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#888" }}>{error.stack}</pre>
    </div>
  );
}
