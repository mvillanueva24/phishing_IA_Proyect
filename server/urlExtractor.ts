export interface UrlExtractionResult {
  urlCount: number;
  urls: string[];
}

// Matches explicit http(s):// links, www. links, and bare domain links while ignoring email addresses
const URL_REGEX =
  /(?:https?:\/\/[^\s<>"{}|\\^`[\]]+)|(?:\bwww\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s<>"{}|\\^`[\]]*)?)|(?:(?<![@\w/.-])(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|edu|gov|io|co|es|mx|pe|ar|cl|ec|bo|uy|py|ve|xyz|top|info|biz|ly|gl|me|ru|cn|tk|ml|ga|cf|app|dev|site|online|shop|click|link|bank|pro|vip|icu|work|support|security|login|verify)(?:\/[^\s<>"{}|\\^`[\]]*)?)/gi;

const TRAILING_PUNCTUATION = /[.,;:!?)}\]"'>]+$/;

function cleanMatchedUrl(raw: string): string {
  let cleaned = raw.trim();
  while (TRAILING_PUNCTUATION.test(cleaned)) {
    // Preserve balanced closing parentheses inside URLs like Wikipedia links
    if (cleaned.endsWith(')')) {
      const openCount = (cleaned.match(/\(/g) ?? []).length;
      const closeCount = (cleaned.match(/\)/g) ?? []).length;
      if (closeCount <= openCount) break;
    }
    cleaned = cleaned.replace(TRAILING_PUNCTUATION, '');
  }
  return cleaned;
}

/**
 * Detects and counts all URLs appearing in the email subject and body.
 * Matches how the BETO model expects subject, body, and url_count.
 */
export function extractUrlsFromEmail(subject: string, body: string): UrlExtractionResult {
  const combined = `${subject}\n${body}`;
  const matches = combined.match(URL_REGEX) ?? [];
  const urls: string[] = [];

  for (const raw of matches) {
    const cleaned = cleanMatchedUrl(raw);
    if (!cleaned) continue;
    // Guard against false positives like version numbers or decimals (e.g., v1.2)
    if (!/[a-zA-Z]/.test(cleaned)) continue;
    urls.push(cleaned);
  }

  return {
    urlCount: urls.length,
    urls,
  };
}

export const DEFAULT_INPUT_TEMPLATE =
  'Asunto: {subject} | Cuerpo: {body} | URLs: {url_count}';

export function formatModelInputText(
  subject: string,
  body: string,
  urlCount: number,
  template: string = DEFAULT_INPUT_TEMPLATE
): string {
  const activeTemplate = template.trim() || DEFAULT_INPUT_TEMPLATE;
  return activeTemplate
    .replaceAll('{subject}', subject.trim())
    .replaceAll('{body}', body.trim())
    .replaceAll('{url_count}', String(urlCount));
}
