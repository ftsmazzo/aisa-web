import type { ReactNode } from "react";

export default function Moldura({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ margin: 0, color: "#0152f1", fontWeight: 700 }}>AISA</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 8px" }}>{titulo}</h1>
      <p style={{ color: "#6b7280", lineHeight: 1.6, marginTop: 0 }}>{texto}</p>
      {children}
    </main>
  );
}

export function Campo({
  id,
  rotulo,
  tipo,
  autoComplete,
}: {
  id: string;
  rotulo: string;
  tipo: string;
  autoComplete: string;
}) {
  return (
    <label
      htmlFor={id}
      style={{ display: "block", marginBottom: 14, fontWeight: 600 }}
    >
      {rotulo}
      <input
        id={id}
        name={id}
        type={tipo}
        autoComplete={autoComplete}
        required
        style={{
          display: "block",
          width: "100%",
          marginTop: 6,
          padding: "12px 14px",
          border: "1px solid #dde3ee",
          borderRadius: 8,
          background: "#fff",
          font: "inherit",
          fontWeight: 400,
        }}
      />
    </label>
  );
}

export function Botao({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      style={{
        minHeight: 44,
        width: "100%",
        border: 0,
        borderRadius: 8,
        background: "#0152f1",
        color: "#fff",
        font: "inherit",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Aviso({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p
      role="alert"
      style={{
        background: "#fff4f2",
        color: "#9f1239",
        padding: "10px 12px",
        borderRadius: 8,
      }}
    >
      {texto}
    </p>
  );
}
