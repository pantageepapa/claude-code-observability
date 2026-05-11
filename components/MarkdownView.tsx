interface MarkdownViewProps {
  body: string;
  className?: string;
}

/**
 * Renders raw markdown text as styled prose.
 * No external markdown-to-HTML library is added; the text is rendered in a
 * <pre> block with prose-like styling so it remains readable without
 * introducing a heavy dependency.  Full markdown rendering can be layered on
 * later if desired.
 */
export function MarkdownView({ body, className = "" }: MarkdownViewProps) {
  return (
    <pre
      className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 ${className}`}
    >
      {body}
    </pre>
  );
}
