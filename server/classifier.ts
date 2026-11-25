import type { ClassificationResult, ModelInputPayload } from '../src/types.ts';

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFastApiBaseUrl(): string {
  const configured = process.env.FASTAPI_URL?.trim() || '';
  if (configured && isValidHttpUrl(configured)) {
    return configured.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000';
}

function interpretFastApiResponse(
  data: Record<string, unknown>
): ClassificationResult {
  const phishingIdx = Number(process.env.PHISHING_LABEL_IDX ?? '1');

  let isPhishing: boolean;
  if (typeof data.is_phishing === 'boolean') {
    isPhishing = data.is_phishing;
  } else if (typeof data.prediction === 'number') {
    isPhishing = data.prediction === phishingIdx;
  } else {
    const labelStr = String(data.label ?? data.raw_label ?? '').toLowerCase();
    isPhishing =
      labelStr.includes('phish') ||
      labelStr.includes('spam') ||
      labelStr === `label_${phishingIdx}` ||
      labelStr === String(phishingIdx);
  }

  const rawConfidence =
    typeof data.confidence === 'number'
      ? data.confidence
      : typeof data.score === 'number'
        ? data.score
        : 0.9;

  return {
    isPhishing,
    label: isPhishing ? 'phishing' : 'seguro',
    confidence: Math.max(0, Math.min(1, rawConfidence)),
  };
}

async function classifyWithFastApi(
  payload: ModelInputPayload
): Promise<ClassificationResult> {
  const baseUrl = getFastApiBaseUrl();
  const endpoint = `${baseUrl}/predict`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: payload.subject,
        body: payload.body,
        url_count: payload.url_count,
        text: payload.formatted_text,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[BETO FastAPI] Error de conexión con ${endpoint}:`, reason);
    throw new Error(
      `No se pudo conectar con el backend local de BETO (${endpoint}). Verifica que FastAPI esté corriendo.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `El backend local de BETO (${endpoint}) respondió con estado ${response.status}.`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const result = interpretFastApiResponse(data);

  console.log(
    `[BETO FastAPI] ${endpoint} -> label=${result.label} (raw_label=${String(data.raw_label ?? '-')}, prediction=${String(data.prediction ?? '-')}, confidence=${(result.confidence * 100).toFixed(2)}%, urls=${payload.url_count})`
  );

  return result;
}

export async function classifyEmailPayload(
  payload: ModelInputPayload
): Promise<ClassificationResult> {
  return classifyWithFastApi(payload);
}
