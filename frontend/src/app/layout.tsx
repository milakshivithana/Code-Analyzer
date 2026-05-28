import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Powered Code Analyzer | Big-O, Bugs & Performance Optimizations",
  description: "An advanced, interactive developer platform to analyze source code for bugs, visualize Big-O time and space complexities, view refactored side-by-side differences, and chat with an AI assistant.",
  keywords: ["Code Analyzer", "Big O Complexity", "Bug Finder", "Code Refactoring", "Gemini API", "Static Code Analysis"],
  authors: [{ name: "Milakshi Vithana" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
