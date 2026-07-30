import Link from "next/link";
import React from "react";

/**
 * The markdown subset this site renders.
 *
 * One implementation, imported by both the published page and the admin
 * preview. There were two copies of this — one in the blog route and one in
 * Fields.tsx — and they had already drifted: both claimed in their comments to
 * render bold, neither did, so every **word** in a post came out with the
 * asterisks still attached.
 *
 * Deliberately small rather than a full parser. Headings, lists, blockquotes,
 * inline bold, italic, code and links cover everything actually written here,
 * and a markdown library is a large dependency plus an HTML-injection surface
 * for a feature this size.
 *
 * Nothing is rendered as raw HTML at any point — every branch returns React
 * elements, so a post containing a script tag renders it as text.
 */

/** Inline: **bold**, *italic*, `code`, [text](href). */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // One pass, alternation ordered so ** is tried before *.
  const pattern =
    /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;

  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${n++}`;

    if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = token.slice(split + 2, -1);
      // Internal links route through next/link; external ones get the
      // noopener pair, because a target=_blank without it hands the opened
      // page a handle back to this one.
      out.push(
        href.startsWith("/") ? (
          <Link key={key} href={href}>
            {label}
          </Link>
        ) : (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ),
      );
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Blocks: # heading, - list, 1. list, > quote, --- rule, paragraph. */
export function renderMarkdown(source: string): React.ReactNode {
  return source.split(/\n{2,}/).map((block, i) => {
    const text = block.trim();
    if (!text) return null;
    const key = `b${i}`;

    if (text === "---" || text === "***") return <hr key={key} />;

    if (text.startsWith("### ")) {
      return <h3 key={key}>{inline(text.slice(4), key)}</h3>;
    }
    if (text.startsWith("## ")) {
      return <h2 key={key}>{inline(text.slice(3), key)}</h2>;
    }
    // A single # inside a post body is a section, not a page title — the page
    // already has its own h1, and a second one flattens the outline.
    if (text.startsWith("# ")) {
      return <h2 key={key}>{inline(text.slice(2), key)}</h2>;
    }

    if (text.startsWith("> ")) {
      return (
        <blockquote key={key}>
          {inline(text.replace(/^>\s?/gm, ""), key)}
        </blockquote>
      );
    }

    if (/^[-*]\s/.test(text)) {
      return (
        <ul key={key}>
          {text.split("\n").map((line, j) => (
            <li key={`${key}-${j}`}>
              {inline(line.replace(/^[-*]\s*/, ""), `${key}-${j}`)}
            </li>
          ))}
        </ul>
      );
    }

    if (/^\d+\.\s/.test(text)) {
      return (
        <ol key={key}>
          {text.split("\n").map((line, j) => (
            <li key={`${key}-${j}`}>
              {inline(line.replace(/^\d+\.\s*/, ""), `${key}-${j}`)}
            </li>
          ))}
        </ol>
      );
    }

    // Single newlines inside a paragraph are a soft wrap in the source, not a
    // break the reader should see.
    return <p key={key}>{inline(text.replace(/\n/g, " "), key)}</p>;
  });
}
