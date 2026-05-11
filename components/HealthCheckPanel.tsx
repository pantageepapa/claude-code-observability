"use client";

import { useState, useEffect } from "react";
import type { HealthCheck, Severity } from "@/lib/health/types";

const STORAGE_PREFIX = "health:suppressed:";

function storageKey(id: string): string {
  return STORAGE_PREFIX + id;
}

function severityLabel(severity: Severity): string {
  switch (severity) {
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

function severityBadgeClass(severity: Severity): string {
  switch (severity) {
    case "error":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "info":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

function severityBorderClass(severity: Severity): string {
  switch (severity) {
    case "error":
      return "border-red-200 dark:border-red-900";
    case "warning":
      return "border-amber-200 dark:border-amber-900";
    case "info":
      return "border-blue-200 dark:border-blue-900";
  }
}

interface CheckCardProps {
  check: HealthCheck;
  dismissed: boolean;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
  visible: boolean;
}

function CheckCard({ check, dismissed, onDismiss, onRestore, visible }: CheckCardProps) {
  if (!visible) return null;

  return (
    <div
      className={`rounded-lg border p-4 ${severityBorderClass(check.severity)} bg-white dark:bg-zinc-900 ${dismissed ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {check.passed ? (
            <span className="text-green-500" aria-label="Passed">✓</span>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(check.severity)}`}
            >
              {severityLabel(check.severity)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {check.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {check.detail}
          </p>
        </div>
        {!check.passed && (
          <div className="shrink-0">
            {dismissed ? (
              <button
                type="button"
                onClick={() => onRestore(check.id)}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDismiss(check.id)}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SEVERITY_ORDER: Severity[] = ["error", "warning", "info"];

interface HealthCheckPanelProps {
  checks: HealthCheck[];
}

export function HealthCheckPanel({ checks }: HealthCheckPanelProps) {
  // dismissed is populated from localStorage after mount to avoid hydration mismatch
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = new Set<string>();
    for (const check of checks) {
      if (typeof localStorage !== "undefined") {
        if (localStorage.getItem(storageKey(check.id)) === "1") {
          stored.add(check.id);
        }
      }
    }
    setDismissed(stored);
    setHydrated(true);
  }, [checks]);

  function handleDismiss(id: string) {
    localStorage.setItem(storageKey(id), "1");
    setDismissed((prev) => new Set([...prev, id]));
  }

  function handleRestore(id: string) {
    localStorage.removeItem(storageKey(id));
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const failedChecks = checks.filter((c) => !c.passed);
  const passedChecks = checks.filter((c) => c.passed);
  const dismissedCount = failedChecks.filter((c) => dismissed.has(c.id)).length;
  const activeFailedChecks = failedChecks.filter((c) => !dismissed.has(c.id));

  if (!hydrated) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
        Loading health checks…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-green-600 dark:text-green-400">{passedChecks.length}</span> passed
        </span>
        <span className="text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-red-600 dark:text-red-400">{activeFailedChecks.length}</span> issues
        </span>
        {dismissedCount > 0 && (
          <span className="text-zinc-500">
            {dismissedCount} dismissed
          </span>
        )}
      </div>

      {/* Findings grouped by severity */}
      {SEVERITY_ORDER.map((severity) => {
        const group = failedChecks.filter((c) => c.severity === severity);
        if (group.length === 0) return null;

        const visibleGroup = group.filter((c) => !dismissed.has(c.id));
        if (visibleGroup.length === 0) return null;

        return (
          <section key={severity}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {severityLabel(severity)}s ({visibleGroup.length})
            </h2>
            <div className="space-y-3">
              {group.map((check) => (
                <CheckCard
                  key={check.id}
                  check={check}
                  dismissed={dismissed.has(check.id)}
                  onDismiss={handleDismiss}
                  onRestore={handleRestore}
                  visible={!dismissed.has(check.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Passed checks (collapsed by default) */}
      {passedChecks.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Passed ({passedChecks.length})
          </h2>
          <div className="space-y-2">
            {passedChecks.map((check) => (
              <CheckCard
                key={check.id}
                check={check}
                dismissed={false}
                onDismiss={handleDismiss}
                onRestore={handleRestore}
                visible
              />
            ))}
          </div>
        </section>
      )}

      {/* Dismissed items toggle */}
      {dismissedCount > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDismissed((v) => !v)}
            className="text-xs text-zinc-400 underline hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {showDismissed ? "Hide" : "Show"} {dismissedCount} dismissed
          </button>
          {showDismissed && (
            <div className="mt-3 space-y-3">
              {failedChecks
                .filter((c) => dismissed.has(c.id))
                .map((check) => (
                  <CheckCard
                    key={check.id}
                    check={check}
                    dismissed
                    onDismiss={handleDismiss}
                    onRestore={handleRestore}
                    visible
                  />
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
