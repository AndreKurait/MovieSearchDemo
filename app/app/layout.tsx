import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Search",
  description: "Discover movies with AI-powered semantic search",
};

// Inline script to set theme before paint to prevent flash
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme') || 'dark';
    document.body.className = theme;
  } catch(e) {
    document.body.className = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
