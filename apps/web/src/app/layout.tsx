import "./globals.css";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces"
});

export const metadata = {
  title: "Expense AI Tracker",
  description: "AI-assisted expense tracking across web + mobile"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
      <body className="min-h-screen text-fog">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
