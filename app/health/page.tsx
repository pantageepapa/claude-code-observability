import Link from "next/link";
import { resolveProject } from "@/lib/paths";
import { runAllChecks } from "@/lib/health/checks";
import { HealthCheckPanel } from "@/components/HealthCheckPanel";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function HealthPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { absolute } = await resolveProject(params.project);

  const checks = await runAllChecks(absolute);

  const failedCount = checks.filter((c) => !c.passed).length;
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Dashboard
          </Link>
          <span>/</span>
          <span>Health</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup Health</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Mechanical checks for your CLAUDE.md and Skills configuration.
          {" "}
          {failedCount === 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              All {passedCount} checks passed.
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">
              {failedCount} issue{failedCount === 1 ? "" : "s"} found.
            </span>
          )}
        </p>
      </header>

      <HealthCheckPanel checks={checks} />

      <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Mechanical checks only. No external API calls. AI-assisted checks coming in v2.
      </footer>
    </div>
  );
}
