import React from 'react';
import { Link } from 'react-router-dom';
import { linkTarget } from '../lib/utils';

/**
 * Resolves a `[[method:id|label]]` token to a URL, or null when the target is
 * not part of the surface being rendered. The workspace links to its own
 * method pages; the public edition links to published edition pages only, so a
 * reference to an unpublished method degrades to plain text rather than a
 * link to nowhere.
 */
export type MethodHref = (id: string, label: string) => string | null;

function renderInline(text: string, keyPrefix: string, methodHref?: MethodHref): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\[method:[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  return parts.filter((part) => part !== '').map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    const methodMatch = /^\[\[method:([^\]|]+)\|([^\]]+)\]\]$/.exec(part);
    if (methodMatch) {
      const [, methodId, label] = methodMatch;
      if (methodHref) {
        const href = methodHref(methodId, label);
        return href ? (
          <Link key={key} to={href} className="method-ref">
            {label}
          </Link>
        ) : (
          <span key={key} className="method-ref unresolved">
            {label}
          </span>
        );
      }
      return (
        <Link key={key} to={`/method/${methodId}`} className="method-ref">
          {label}
        </Link>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      // The same rule the HTML export applies: a scheme that is not http(s) is
      // not activated, so the text stays exactly as written rather than
      // becoming a live `javascript:` or `data:` link.
      const target = linkTarget(href);
      if (!target) return <React.Fragment key={key}>{part}</React.Fragment>;
      if (target.kind === 'internal') {
        return (
          <Link key={key} to={target.href}>
            {label}
          </Link>
        );
      }
      return (
        <a key={key} href={target.href} target="_blank" rel="noreferrer noopener">
          {label}
        </a>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

interface MarkdownProps {
  content: string;
  className?: string;
  methodHref?: MethodHref;
}

export function Markdown({ content, className = '', methodHref }: MarkdownProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={`b-${key++}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(6, heading[1].length);
      const Tag = (`h${level}` as unknown) as keyof JSX.IntrinsicElements;
      blocks.push(<Tag key={`b-${key++}`}>{renderInline(heading[2], `h-${key}`, methodHref)}</Tag>);
      i += 1;
      continue;
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s-*_]*$/.test(line)) {
      blocks.push(<hr key={`b-${key++}`} />);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={`b-${key++}`}>
          {quote.map((q, qi) => (
            <p key={qi}>{renderInline(q, `q-${key}-${qi}`, methodHref)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={`b-${key++}`}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item, `ul-${key}-${ii}`, methodHref)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={`b-${key++}`}>
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item, `ol-${key}-${ii}`, methodHref)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`b-${key++}`}>
        {paragraph.map((textLine, li) => (
          <React.Fragment key={li}>
            {renderInline(textLine, `p-${key}-${li}`, methodHref)}
            {li < paragraph.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  if (!content.trim()) {
    return <div className={`markdown ${className}`}><p className="muted">Nothing written here yet.</p></div>;
  }

  return <div className={`markdown ${className}`}>{blocks}</div>;
}
