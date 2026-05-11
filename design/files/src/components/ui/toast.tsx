"use client";
import { useEffect, useState } from "react";
import { MaterialIcon } from "./material-icon";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

let nextId = 1;

/** Fire a toast from anywhere — `showToast("CSV downloaded", "success")`. */
export function showToast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<Omit<Toast, "id">>("es:toast", { detail: { kind, message } })
  );
}

/**
 * Toast viewport. Mount once at root (layout) — listens for `es:toast`
 * window events and stacks them in the bottom-right. Each toast
 * auto-dismisses after 4.5 seconds; user can click X to close earlier.
 */
export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = nextId++;
      setToasts((prev) => [...prev, { ...detail, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    }
    window.addEventListener("es:toast", handler);
    return () => window.removeEventListener("es:toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border p-3 text-sm shadow-md ${
            t.kind === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : t.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          <MaterialIcon
            name={
              t.kind === "success"
                ? "check_circle"
                : t.kind === "error"
                  ? "error"
                  : "info"
            }
            size="text-base"
            className={
              t.kind === "success"
                ? "text-green-600"
                : t.kind === "error"
                  ? "text-red-600"
                  : "text-slate-500"
            }
          />
          <div className="flex-1 break-words">{t.message}</div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="shrink-0 text-slate-400 hover:text-slate-700"
          >
            <MaterialIcon name="close" size="text-sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
