export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "72px 24px" }}>
      <p
        style={{
          margin: 0,
          color: "#0152f1",
          fontWeight: 700,
          letterSpacing: "-0.3px",
        }}
      >
        AISA
      </p>
      <h1 style={{ fontSize: 32, margin: "8px 0 12px" }}>Gestão da produção</h1>
      <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
        A base da aplicação está no ar. A regra de ordem, corte e kanban entra
        na fase seguinte.
      </p>
      <p>
        <a href="/health" style={{ color: "#0140c4" }}>
          Saúde do serviço
        </a>
      </p>
    </main>
  );
}
