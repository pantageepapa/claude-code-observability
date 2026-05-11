"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScopeBadge } from "@/components/ScopeBadge";
import type { Scope } from "@/lib/types";

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

const STARTER_BODY = `## Overview

Describe what this skill does and when Claude should use it.

## Steps

1. Step one
2. Step two
3. Step three

## Notes

Any additional context, caveats, or examples.
`.trimStart();

interface FormState {
  scope: Scope;
  name: string;
  description: string;
  body: string;
  error: string | null;
  submitting: boolean;
}

const initialState: FormState = {
  scope: "user",
  name: "",
  description: "",
  body: STARTER_BODY,
  error: null,
  submitting: false,
};

export default function NewSkillPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateName = (value: string): string | null => {
    if (value === "") return null; // no error while empty
    if (!NAME_RE.test(value))
      return "Only lowercase letters, digits, and hyphens. Must start with a letter or digit.";
    return null;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormState((s) => ({ ...s, name: value }));
    setNameError(validateName(value));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    if (!NAME_RE.test(formState.name)) {
      setNameError("Only lowercase letters, digits, and hyphens. Must start with a letter or digit.");
      return;
    }
    if (!formState.description.trim()) {
      setFormState((s) => ({ ...s, error: "Description is required." }));
      return;
    }

    setFormState((s) => ({ ...s, submitting: true, error: null }));

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: formState.scope,
          name: formState.name,
          description: formState.description.trim(),
          body: formState.body,
        }),
      });

      const data = (await res.json()) as { encodedId?: string; error?: string };

      if (!res.ok) {
        setFormState((s) => ({
          ...s,
          submitting: false,
          error: data.error ?? `Request failed with status ${res.status}`,
        }));
        return;
      }

      if (!data.encodedId) {
        setFormState((s) => ({
          ...s,
          submitting: false,
          error: "Server returned an unexpected response.",
        }));
        return;
      }

      // Success — redirect to the detail page
      router.push(`/skills/${data.encodedId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFormState((s) => ({ ...s, submitting: false, error: message }));
    }
  };

  const isNameValid = NAME_RE.test(formState.name);
  const isDescriptionValid = formState.description.trim().length > 0;
  const canSubmit = isNameValid && isDescriptionValid && !formState.submitting;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Dashboard
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          New skill
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Creates a <code className="font-mono text-xs">SKILL.md</code> file in the selected scope.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {/* Scope */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Scope
          </legend>
          <div className="flex gap-3">
            {(["user", "project"] as const).map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                  formState.scope === s
                    ? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value={s}
                  checked={formState.scope === s}
                  onChange={() => setFormState((prev) => ({ ...prev, scope: s }))}
                  className="sr-only"
                />
                <ScopeBadge scope={s} />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {s === "user"
                    ? "~/.claude/skills"
                    : "<project>/.claude/skills"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Name */}
        <div>
          <label
            htmlFor="skill-name"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="skill-name"
            type="text"
            value={formState.name}
            onChange={handleNameChange}
            placeholder="my-skill"
            required
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm shadow-sm focus:outline-none dark:bg-zinc-900 dark:text-zinc-100 ${
              nameError
                ? "border-red-400 focus:border-red-500 dark:border-red-600"
                : "border-zinc-300 focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
            }`}
            aria-describedby={nameError ? "name-error" : "name-hint"}
          />
          {nameError ? (
            <p id="name-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {nameError}
            </p>
          ) : (
            <p id="name-hint" className="mt-1 text-xs text-zinc-500">
              Lowercase letters, digits, and hyphens only. E.g.{" "}
              <code className="font-mono">code-review</code>
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="skill-description"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Description <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="skill-description"
            type="text"
            value={formState.description}
            onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
            placeholder="One-line summary of what this skill does"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
          />
        </div>

        {/* Body */}
        <div>
          <label
            htmlFor="skill-body"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Body
          </label>
          <textarea
            id="skill-body"
            value={formState.body}
            onChange={(e) => setFormState((s) => ({ ...s, body: e.target.value }))}
            rows={14}
            spellCheck={false}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            aria-label="Skill body markdown"
          />
          <p className="mt-1 text-xs text-zinc-500">Markdown. The frontmatter is added automatically.</p>
        </div>

        {/* Server-side error */}
        {formState.error && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          >
            <strong>Error:</strong> {formState.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {formState.submitting ? "Creating…" : "Create skill"}
          </button>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
