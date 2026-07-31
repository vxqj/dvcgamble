import "./globals.css";
import StatusBanner from "../components/StatusBanner";

export const metadata = {
  title: "DVC GAMBLE — Card Unbox",
  description: "Buy packs. Open packs. Chase the ???.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StatusBanner />
        {children}
      </body>
    </html>
  );
}