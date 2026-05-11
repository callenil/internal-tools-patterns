import Link from "next/link";
import { MaterialIcon } from "@/components/ui/material-icon";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--primary-tint-bg)] text-[color:var(--primary)]">
        <MaterialIcon name="search_off" size="text-3xl" />
      </span>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mb-6 text-sm text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist, was moved, or
        wasn&apos;t spelled quite right. Try one of the links below.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--primary-hover)]"
        >
          <MaterialIcon name="dashboard" size="text-base" />
          Back to dashboard
        </Link>
        <Link
          href="/help"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
        >
          <MaterialIcon name="help" size="text-base" />
          Help docs
        </Link>
      </div>
    </main>
  );
}
