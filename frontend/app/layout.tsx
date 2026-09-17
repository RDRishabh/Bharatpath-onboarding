import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";

export const metadata: Metadata = {
  title: "BharatPath",
  description: "BharatPath career and placement platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}