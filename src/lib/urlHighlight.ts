export interface TextSegment {
  text: string;
  isUrl: boolean;
}

const CLIENT_URL_PATTERN =
  /(https?:\/\/[^\s<>"{}|\\^`[\]]+|\bwww\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s<>"{}|\\^`[\]]*)?)/gi;

export function splitBodyWithUrls(body: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(CLIENT_URL_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];

    if (index > lastIndex) {
      segments.push({ text: body.slice(lastIndex, index), isUrl: false });
    }

    // Separate trailing punctuation from the highlighted URL
    const trimmed = raw.replace(/[.,;:!?)}\]"'>]+$/, '');
    const trailing = raw.slice(trimmed.length);

    if (trimmed) {
      segments.push({ text: trimmed, isUrl: true });
    }
    if (trailing) {
      segments.push({ text: trailing, isUrl: false });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), isUrl: false });
  }

  return segments.length > 0 ? segments : [{ text: body, isUrl: false }];
}

export function formatShortTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFullDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
