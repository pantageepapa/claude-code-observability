"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownView } from "@/components/MarkdownView";

interface MarkdownEditorProps {
  initialContent: string;
  encodedPath: string;
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; mtime: string; at: number }
  | { kind: "error"; message: string };

function useSaveStatusLabel(status: SaveStatus): string {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (status.kind !== "saved") return;
    // Refresh the "X ago" label every 10 seconds
    const id = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [status]);

  if (status.kind === "idle") return "";
  if (status.kind === "saving") return "Saving…";
  if (status.kind === "error") return `Error — ${status.message}`;
  // saved
  const secondsAgo = Math.round((Date.now() - status.at) / 1000);
  if (secondsAgo < 5) return "Saved";
  return `Saved · ${secondsAgo}s ago`;
}

export function MarkdownEditor({ initialContent, encodedPath }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusLabel = useSaveStatusLabel(saveStatus);

  const save = useCallback(
    async (text: string) => {
      setSaveStatus({ kind: "saving" });
      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encodedPath, content: text }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { mtime: string };
        setSaveStatus({ kind: "saved", mtime: data.mtime, at: Date.now() });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setSaveStatus({ kind: "error", message });
      }
    },
    [encodedPath],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setContent(text);

      // Debounce auto-save: 700 ms after last keystroke
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void save(text);
      }, 700);
    },
    [save],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const statusColor =
    saveStatus.kind === "error"
      ? "text-red-500 dark:text-red-400"
      : saveStatus.kind === "saving"
        ? "text-zinc-400 dark:text-zinc-500"
        : "text-zinc-400 dark:text-zinc-500";

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="rounded border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {preview ? "Edit" : "Preview"}
        </button>

        {/* Save status indicator */}
        {saveStatus.kind !== "idle" && saveStatus.kind !== "error" && (
          <span className={`text-xs ${statusColor}`} aria-live="polite">
            {saveStatusLabel}
          </span>
        )}
      </div>

      {/* Editor or Preview */}
      {preview ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {content ? (
            <MarkdownView body={content} />
          ) : (
            <p className="text-sm italic text-zinc-400">No content.</p>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={handleChange}
          spellCheck={false}
          className="min-h-[400px] w-full rounded-lg border border-zinc-200 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-800 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500"
          aria-label="Markdown editor"
        />
      )}

      {/* Inline error shown below editor */}
      {saveStatus.kind === "error" && (
        <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>
            <strong>Save failed:</strong> {saveStatus.message}
          </span>
          <button
            type="button"
            onClick={() => void save(content)}
            className="ml-4 rounded border border-red-300 px-2 py-0.5 text-xs hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
