"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { HealthCheck } from "@/lib/health/types";

const STORAGE_PREFIX = "health:suppressed:";

interface HealthSummaryLinkProps {
  checks: HealthCheck[];
  projectEncoded?: string;
}

export function HealthSummaryLink({ checks, projectEncoded }: HealthSummaryLinkProps) {
  const [activeIssueCount, setActiveIssueCount] = useState<number | null>(null);

  useEffect(() => {
    const failedChecks = checks.filter((c) => !c.passed);
    const active = failedChecks.filter(
      (c) => localStorage.getItem(STORAGE_PREFIX + c.id) !== "1",
    );
    setActiveIssueCount(active.length);
  }, [checks]);

  if (activeIssueCount === null) {
    // Pre-hydration: render nothing to avoid a flash with wrong count
    return null;
  }

  const href = projectEncoded
    ? `/health?project=${encodeURIComponent(projectEncoded)}`
    : "/health";

  if (activeIssueCount === 0) {
    return (
      <Link
        href={href}
        className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
      >
        All health checks passed · View health →
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
    >
      {activeIssueCount} issue{activeIssueCount === 1 ? "" : "s"} found · View health →
    </Link>
  );
}
