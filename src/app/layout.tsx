export const metadata = {
  title: "Check-in UMADJUF",
  description: "Check-in por nome com equipe e persistência",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#0b0f17",
          color: "#e6edf3",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
