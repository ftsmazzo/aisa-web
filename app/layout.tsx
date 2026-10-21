import type { ReactNode } from "react";

export const metadata = {
  title: "AISA",
  description: "Gestão da produção",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f6f8fc",
          color: "#14192b",
          fontFamily: "Inter, Segoe UI, sans-serif",
        }}
      >
        <style>{`
          input, button, a { font: inherit; }
          input:focus-visible, button:focus-visible, a:focus-visible {
            outline: 2px solid #0152f1;
            outline-offset: 2px;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
