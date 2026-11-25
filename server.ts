import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { PERSONAS, type EmailMessage } from './src/types.ts';
import {
  extractUrlsFromEmail,
  formatModelInputText,
} from './server/urlExtractor.ts';
import { classifyEmailPayload } from './server/classifier.ts';
import {
  addEmail,
  deleteEmail,
  listEmails,
  registerSseClient,
  updateEmail,
} from './server/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/emails/stream', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    registerSseClient(res);
  });

  app.get('/api/emails', (req, res) => {
    const view = req.query.view === 'emisor' ? 'emisor' : 'receptor';
    res.json({ emails: listEmails(view) });
  });

  app.post('/api/emails', async (req, res) => {
    try {
      const subject =
        typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
      const body =
        typeof req.body?.body === 'string' ? req.body.body.trim() : '';

      if (!subject) {
        res.status(400).json({ error: 'El asunto del correo es obligatorio.' });
        return;
      }
      if (!body) {
        res.status(400).json({ error: 'El cuerpo del correo es obligatorio.' });
        return;
      }

      const { urlCount, urls } = extractUrlsFromEmail(subject, body);
      const formattedText = formatModelInputText(subject, body, urlCount);

      const classification = await classifyEmailPayload({
        subject,
        body,
        url_count: urlCount,
        urls,
        formatted_text: formattedText,
      });

      const email: EmailMessage = {
        id: crypto.randomUUID(),
        senderName: PERSONAS.emisor.name,
        senderEmail: PERSONAS.emisor.email,
        recipientName: PERSONAS.receptor.name,
        recipientEmail: PERSONAS.receptor.email,
        subject,
        body,
        sentAt: new Date().toISOString(),
        read: false,
        urlCount,
        detectedUrls: urls,
        classification,
      };

      addEmail(email);

      const { classification: _hidden, ...senderCopy } = email;
      res.status(201).json({ email: senderCopy });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error inesperado al enviar el correo.';
      res.status(503).json({ error: message });
    }
  });

  app.patch('/api/emails/:id/read', (req, res) => {
    const read = typeof req.body?.read === 'boolean' ? req.body.read : true;
    const updated = updateEmail(req.params.id, (existing) => ({
      ...existing,
      read,
    }));
    if (!updated) {
      res.status(404).json({ error: 'Correo no encontrado.' });
      return;
    }
    res.json({ email: updated });
  });

  app.delete('/api/emails/:id', (req, res) => {
    const removed = deleteEmail(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'Correo no encontrado.' });
      return;
    }
    res.json({ ok: true });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    // Serve a WebSocket-free Vite client shim so the browser never attempts HMR WebSocket connections
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Correo Seguro BETO running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
