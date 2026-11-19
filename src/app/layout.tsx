import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOX · Dashboard (demonstração)",
  description: "Demonstração navegável do novo dashboard do lojista VOX, com dados fictícios.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE ?? ""}/vox-logo.png`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('vox-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
