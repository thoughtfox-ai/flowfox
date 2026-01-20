import type { Metadata } from "next";
import { Inter, Montserrat, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FlowFox",
    template: "%s | FlowFox",
  },
  description: "ThoughtFox internal project management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${montserrat.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
