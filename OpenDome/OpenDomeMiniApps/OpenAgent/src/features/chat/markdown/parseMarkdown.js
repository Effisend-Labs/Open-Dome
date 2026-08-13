/** Gemini-style markdown → blocks. No extra deps. */

const HEADING = /^(#{1,3})\s+(.+)$/;
const BOLD_LINE = /^\*\*(.+?)\*\*:?\s*$/;
const STEP = /^(\d+)[.)]\s+(.+)$/;
const BULLET = /^[-*•]\s+(.+)$/;
const HR = /^(-{3,}|\*{3,}|_{3,})$/;
const FENCE = /^```/;
const STEP_BOLD = /^\*\*(.+?)\*\*:?\s*([\s\S]*)$/;
const STEP_COLON = /^([^:*]{2,48}):\s+([\s\S]+)$/;
const SPECIAL = /^(#{1,3}\s+|```|\d+[.)]\s+|[-*•]\s+)/;

export function splitStep(raw) {
  const text = String(raw || '').trim();
  const bold = text.match(STEP_BOLD);
  if (bold) return { title: bold[1].trim(), body: bold[2].trim() };
  const colon = text.match(STEP_COLON);
  if (colon) return { title: colon[1].trim(), body: colon[2].trim() };
  return { title: '', body: text };
}

export function parseInlines(text) {
  const src = String(text || '');
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match = re.exec(src);
  while (match) {
    if (match.index > last) parts.push({ type: 'text', text: src.slice(last, match.index) });
    if (match[2] != null) parts.push({ type: 'bold', text: match[2] });
    else if (match[3] != null) parts.push({ type: 'italic', text: match[3] });
    else if (match[4] != null) parts.push({ type: 'code', text: match[4] });
    else parts.push({ type: 'link', text: match[5], href: match[6] });
    last = match.index + match[0].length;
    match = re.exec(src);
  }
  if (last < src.length) parts.push({ type: 'text', text: src.slice(last) });
  return parts.length ? parts : [{ type: 'text', text: src }];
}

function peekNonEmpty(lines, from) {
  for (let i = from; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t) return t;
  }
  return '';
}

export function parseMarkdown(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (FENCE.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const body = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', lang, text: body.join('\n') });
      continue;
    }

    if (HR.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, inlines: parseInlines(heading[2]) });
      i += 1;
      continue;
    }

    if (BOLD_LINE.test(trimmed)) {
      blocks.push({ type: 'heading', level: 3, inlines: parseInlines(trimmed) });
      i += 1;
      continue;
    }

    if (STEP.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) {
          if (STEP.test(peekNonEmpty(lines, i + 1))) {
            i += 1;
            continue;
          }
          break;
        }
        const step = t.match(STEP);
        if (step) {
          items.push(splitStep(step[2]));
          i += 1;
          continue;
        }
        if (/^\s{2,}/.test(lines[i]) && items.length) {
          const last = items[items.length - 1];
          last.body = `${last.body} ${t}`.trim();
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: 'steps', items });
      continue;
    }

    if (BULLET.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const bullet = t.match(BULLET);
        if (!bullet) break;
        items.push(bullet[1]);
        i += 1;
      }
      blocks.push({ type: 'bullets', items });
      continue;
    }

    const para = [trimmed];
    i += 1;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || SPECIAL.test(t) || HR.test(t) || BOLD_LINE.test(t)) break;
      para.push(t);
      i += 1;
    }
    blocks.push({ type: 'paragraph', inlines: parseInlines(para.join(' ')) });
  }

  return blocks;
}
