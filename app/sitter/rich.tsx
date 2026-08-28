import type { ReactNode } from 'react';

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const PHONE = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;

const safeHref = (href: string) => /^https?:\/\//i.test(href);

function withPhones(text: string, key: string): ReactNode[] {
  return text.split(PHONE).map((part, index) => index % 2 === 1
    ? <a key={key + '-tel' + index} className="sitter-tel" href={'tel:' + part.replace(/\D/g, '')}>{part}</a>
    : part);
}

function withBold(text: string, key: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).flatMap<ReactNode>((part, index) => index % 2 === 1
    ? [<strong key={key + '-b' + index}>{withPhones(part, key + '-b' + index)}</strong>]
    : withPhones(part, key + '-t' + index));
}

/** Renders **bold**, [markdown](links), and tappable phone numbers. */
export function rich(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  LINK.lastIndex = 0;
  let match = LINK.exec(text);
  while (match) {
    if (match.index > cursor) out.push(...withBold(text.slice(cursor, match.index), 'p' + index));
    const [full, label, href] = match;
    out.push(safeHref(href)
      ? <a key={'l' + index} className="sitter-tel" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
      : label);
    cursor = match.index + full.length;
    index += 1;
    match = LINK.exec(text);
  }
  if (cursor < text.length) out.push(...withBold(text.slice(cursor), 'p' + index));
  return out;
}
