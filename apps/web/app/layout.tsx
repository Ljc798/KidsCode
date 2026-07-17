import type { Metadata } from "next";
import "./globals.css";
import ChatWidget from "@/app/components/ChatWidget"

export const metadata: Metadata = {
  title: "KidsCode",
  description: "KidsCode",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
