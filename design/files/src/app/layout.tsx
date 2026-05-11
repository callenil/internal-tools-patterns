import type { Metadata } from "next";
import "./globals.css";
import { NavigationProgress } from "@/components/navigation-progress";
import { ToastViewport } from "@/components/ui/toast";

export const metadata: Metadata = {
  // Brand-first so narrow tabs still show the app name before truncation
  // — helps spot the right tab when many are open. Per-page metadata.title
  // fills in the %s with the page name (e.g. "Dashboard", "Help").
  //
  // INSTALL NOTE: Replace <APP_NAME> with the project's actual name
  // (e.g. "Tender Hunt", "Forge", "ScrapeGlobal") and edit the
  // description to fit. These are the only two strings you change.
  title: {
    default: "<APP_NAME>",
    template: "<APP_NAME> — %s",
  },
  description: "<one-line app description>",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Material Symbols Outlined — single icon set across the app.
            Loaded once here so every page can use <span class="material-
            symbols-outlined">name</span>. Matches ScrapeGlobal's pattern
            since the in-CSS @import was silently failing under Next 16 +
            Turbopack and leaking literal icon-name text into the UI. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-full flex flex-col">
        {/* Skip-to-main: hidden until keyboard-Tab focuses it, then jumps
            past the nav. WCAG 2.4.1 best practice for screen-reader and
            keyboard users. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-[var(--primary)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>

        <NavigationProgress />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
