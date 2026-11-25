import fs from 'node:fs';
import type { Response } from 'express';
import type { EmailMessage } from '../src/types.ts';

const STATE_FILE = '/tmp/correo-seguro-beto-emails.json';

let emails: EmailMessage[] = [];
const sseClients = new Set<Response>();

function loadEmailsFromDisk() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      emails = parsed as EmailMessage[];
    }
  } catch {
    emails = [];
  }
}

function saveEmailsToDisk() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  } catch {
    // non-fatal
  }
}

loadEmailsFromDisk();

export function listEmails(view: 'emisor' | 'receptor' = 'receptor'): EmailMessage[] {
  if (view === 'emisor') {
    return emails.map(({ classification: _hidden, ...rest }) => rest);
  }
  return emails;
}

export function addEmail(email: EmailMessage): EmailMessage {
  emails = [email, ...emails];
  saveEmailsToDisk();
  broadcastSse('email_created', email);
  return email;
}

export function updateEmail(
  id: string,
  updater: (existing: EmailMessage) => EmailMessage
): EmailMessage | undefined {
  const index = emails.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = updater(emails[index]);
  emails = [...emails.slice(0, index), updated, ...emails.slice(index + 1)];
  saveEmailsToDisk();
  broadcastSse('email_updated', updated);
  return updated;
}

export function deleteEmail(id: string): boolean {
  const before = emails.length;
  emails = emails.filter((item) => item.id !== id);
  if (emails.length === before) return false;
  saveEmailsToDisk();
  broadcastSse('email_deleted', { id });
  return true;
}

export function registerSseClient(res: Response) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastSse(event: string, data: unknown) {
  const serialized = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(serialized);
    } catch {
      sseClients.delete(client);
    }
  }
}

setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 25000).unref();
