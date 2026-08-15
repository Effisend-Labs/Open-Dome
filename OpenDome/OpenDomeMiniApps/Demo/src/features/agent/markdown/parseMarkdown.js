/** Small Gemini-markdown parser for native message rendering. */

const HEADING = /^(#{1,3})\s+(.+)$/;
const BOLD_LINE = /^\*\*(.+?)\*\*:?\s*$/;
const STEP = /^(\d+)[.)]\s+(.+)$/;
const BULLET = /^[-*•]\s+(.+)$/;
const HR = /^(-{3,}|\*{3,}|_{3,})$/;
const FENCE = /^```/;
const STEP_BOLD = /^\*\*(.+?)\*\*:?\s*([\s\S]*)$/;
const STEP_COLON = /^([^:*]{2,48}):\s+([\s\S]+)$/;
const SPECIAL = /^(#{1,3}\s+|```|\d+[.)]\s+|[-*•]\s+)/;

function cleanTitle(value) {
  return String(value || '').trim().replace(/:$/, '');
}

export function splitStep(raw) {
  const text = String(raw || '').trim();
  const bold = text.match(STEP_BOLD);
  if (bold) return { title: cleanTitle(bold[1]), body: bold[2].trim() };
  const colon = text.match(STEP_COLON);
  if (colon) return { title: cleanTitle(colon[1]), body: colon[2].trim() };
  return { title: '', body: text };
}

export function parseInlines(text) {
  const source = String(text || '');
  const parts = [];
  const inline = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match = inline.exec(source);

  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', text: source.slice(last, match.index) });
    }
    if (match[2] != null) parts.push({ type: 'bold', text: match[2] });
    else if (match[3] != null) parts.push({ type: 'italic', text: match[3] });
    else if (match[4] != null) parts.push({ type: 'code', text: match[4] });
    else parts.push({ type: 'link', text: match[5], href: match[6] });
    last = match.index + match[0].length;
    match = inline.exec(source);
  }

  if (last < source.length) parts.push({ type: 'text', text: source.slice(last) });
  return parts.length ? parts : [{ type: 'text', text: source }];
}

function nextNonEmptyLine(lines, start) {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line) return line;
  }
  return '';
}

export function parseMarkdown(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (FENCE.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const body = [];
      index += 1;
      while (index < lines.length && !FENCE.test(lines[index].trim())) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', lang, text: body.join('\n') });
      continue;
    }

    if (HR.test(trimmed)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        inlines: parseInlines(heading[2]),
      });
      index += 1;
      continue;
    }

    const boldLine = trimmed.match(BOLD_LINE);
    if (boldLine) {
      blocks.push({ type: 'heading', level: 2, inlines: parseInlines(boldLine[1]) });
      index += 1;
      continue;
    }

    if (STEP.test(trimmed)) {
      const items = [];
      while (index < lines.length) {
        const line = lines[index].trim();
        if (!line) {
          if (STEP.test(nextNonEmptyLine(lines, index + 1))) {
            index += 1;
            continue;
          }
          break;
        }
        const step = line.match(STEP);
        if (step) {
          items.push(splitStep(step[2]));
          index += 1;
          continue;
        }
        if (/^\s{2,}/.test(lines[index]) && items.length) {
          const lastItem = items[items.length - 1];
          lastItem.body = `${lastItem.body} ${line}`.trim();
          index += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: 'steps', items });
      continue;
    }

    if (BULLET.test(trimmed)) {
      const items = [];
      while (index < lines.length) {
        const bullet = lines[index].trim().match(BULLET);
        if (!bullet) break;
        items.push(bullet[1]);
        index += 1;
      }
      blocks.push({ type: 'bullets', items });
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line || SPECIAL.test(line) || HR.test(line) || BOLD_LINE.test(line)) break;
      paragraph.push(line);
      index += 1;
    }
    blocks.push({ type: 'paragraph', inlines: parseInlines(paragraph.join(' ')) });
  }

  return blocks;
}
