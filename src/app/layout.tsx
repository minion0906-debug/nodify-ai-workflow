import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/lib/suppress-console-warnings";

const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body" });
const headlineFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-headline" });

export const metadata: Metadata = {
  title: "Nodify",
  description: "Visual Workflow Editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headlineFont.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="icon" href="/assets/images/favicon.ico" />
      </head>
      <body>
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
