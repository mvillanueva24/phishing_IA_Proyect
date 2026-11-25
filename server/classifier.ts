import { GoogleGenAI, Type } from '@google/genai';
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
  const isLocal =
    baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');

  const response = await fetch(`${baseUrl}/predict`, {
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
    signal: AbortSignal.timeout(isLocal ? 2500 : 10000),
  });

  if (!response.ok) {
    throw new Error(`FastAPI respondió con estado ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return interpretFastApiResponse(data);
}

async function callGeminiModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string
): Promise<ClassificationResult> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction:
        'Eres un clasificador binario de detección de phishing en correos electrónicos en español. Evalúa si el correo intenta engañar al destinatario (suplantación, urgencia sospechosa, enlaces fraudulentos o solicitud de credenciales) o si es un correo seguro. Devuelve únicamente el JSON estructurado.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_phishing: {
            type: Type.BOOLEAN,
            description: 'true si el correo es phishing, false si es seguro.',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Probabilidad estimada entre 0.5 y 1.0.',
          },
        },
        required: ['is_phishing', 'confidence'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('No se recibió respuesta del clasificador.');
  }

  const parsed = JSON.parse(rawText) as {
    is_phishing: boolean;
    confidence: number;
  };
  const isPhishing = Boolean(parsed.is_phishing);

  return {
    isPhishing,
    label: isPhishing ? 'phishing' : 'seguro',
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.85,
  };
}

async function classifyWithFallback(
  payload: ModelInputPayload
): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'El backend FastAPI no está activo y no hay clave de respaldo configurada.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = [
    'Clasifica el siguiente correo electrónico en español como phishing o seguro usando estrictamente el asunto, el cuerpo y el número de URLs detectadas.',
    '',
    `Asunto: ${payload.subject}`,
    `Cuerpo: ${payload.body}`,
    `Número de URLs: ${payload.url_count}`,
  ].join('\n');

  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: 'gemini-4-hydrogen', delayMs: 0 },
    { model: 'gemini-4-hydrogen', delayMs: 700 },
    { model: 'gemini-3.1-flash-lite', delayMs: 300 },
    { model: 'gemini-3.1-flash-lite', delayMs: 900 },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      return await callGeminiModel(ai, attempt.model, prompt);
    } catch (err) {
      lastError = err;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : '';
  if (detail.includes('503') || detail.includes('UNAVAILABLE')) {
    throw new Error(
      'El servicio de clasificación está temporalmente saturado. Intenta enviar el correo nuevamente en unos segundos.'
    );
  }
  throw new Error(
    'No se pudo clasificar el correo en este momento. Intenta nuevamente.'
  );
}

export async function classifyEmailPayload(
  payload: ModelInputPayload
): Promise<ClassificationResult> {
  try {
    return await classifyWithFastApi(payload);
  } catch {
    return await classifyWithFallback(payload);
  }
}
