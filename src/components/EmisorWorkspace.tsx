import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  PenSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { PERSONAS, type EmailMessage, type UserRole } from '../types';
import { formatFullDateTime, formatShortTime } from '../lib/urlHighlight';
import { Avatar } from './Avatar';

interface EmisorWorkspaceProps {
  onSwitchRole: (role: UserRole | null) => void;
}

export function EmisorWorkspace({ onSwitchRole }: EmisorWorkspaceProps) {
  const [section, setSection] = useState<'redactar' | 'enviados'>('redactar');
  const [sentEmails, setSentEmails] = useState<EmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadSent = async () => {
      try {
        const res = await fetch('/api/emails?view=emisor');
        if (!res.ok) return;
        const data = (await res.json()) as { emails: EmailMessage[] };
        setSentEmails(data.emails);
        if (data.emails.length > 0) {
          setSelectedId(data.emails[0].id);
        }
      } finally {
        setLoadingList(false);
      }
    };

    loadSent();
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!subject.trim() || !body.trim()) {
      setErrorMsg('Completa el asunto y el cuerpo del correo.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const rawText = await res.text();
      let data: { email?: EmailMessage; error?: string } = {};
      try {
        data = JSON.parse(rawText) as { email?: EmailMessage; error?: string };
      } catch {
        throw new Error(
          'El servidor devolvió una respuesta no válida. Recarga la página e inténtalo nuevamente.'
        );
      }

      if (!res.ok || !data.email) {
        throw new Error(data.error || 'No se pudo enviar el correo.');
      }

      setSentEmails((prev) => [data.email!, ...prev]);
      setSelectedId(data.email.id);
      setSubject('');
      setBody('');
      setToastMsg(`Correo enviado a ${PERSONAS.receptor.name}.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error inesperado al enviar.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setSentEmails((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
    } catch {
      // ignore
    }
  };

  const selectedEmail =
    sentEmails.find((item) => item.id === selectedId) ?? sentEmails[0] ?? null;

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-[250px] shrink-0 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
        <div className="p-4">
          <div className="pb-4 mb-4 border-b border-slate-200">
            <span className="font-display text-base font-bold tracking-tight text-slate-900">
              Correo Seguro BETO
            </span>
          </div>

          <div className="flex items-center gap-3 px-2 py-2 mb-5">
            <Avatar
              src={PERSONAS.emisor.avatar}
              name={PERSONAS.emisor.name}
              initials={PERSONAS.emisor.initials}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-600">Emisor</p>
              <p className="font-display text-sm font-semibold text-slate-900 truncate">
                {PERSONAS.emisor.name}
              </p>
              <p className="text-xs font-mono text-slate-500 truncate">
                {PERSONAS.emisor.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSection('redactar')}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer mb-4"
          >
            <PenSquare className="h-4 w-4" />
            Redactar
          </button>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setSection('redactar')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                section === 'redactar'
                  ? 'bg-slate-200/70 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Mail className="h-4 w-4 text-slate-500" />
              Nuevo mensaje
            </button>

            <button
              type="button"
              onClick={() => setSection('enviados')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                section === 'enviados'
                  ? 'bg-slate-200/70 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-slate-500" />
                Enviados
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {sentEmails.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => onSwitchRole(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">Emisor</span>
            <span aria-hidden="true">/</span>
            <span>
              {section === 'redactar' ? 'Redactar correo' : 'Enviados'}
            </span>
          </div>

          {section === 'enviados' && (
            <button
              type="button"
              onClick={() => setSection('redactar')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Nuevo correo
            </button>
          )}
        </header>

        {toastMsg && (
          <div className="mx-6 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {section === 'redactar' ? (
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mb-6">
                Nuevo correo
              </h1>

              <form
                onSubmit={handleSubmit}
                className="border border-slate-200 rounded-xl bg-white overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-3 text-sm">
                  <span className="text-slate-500 font-medium w-16 shrink-0">
                    Para:
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      src={PERSONAS.receptor.avatar}
                      name={PERSONAS.receptor.name}
                      initials={PERSONAS.receptor.initials}
                      size="sm"
                    />
                    <span className="font-medium text-slate-900 truncate">
                      {PERSONAS.receptor.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500 truncate">
                      &lt;{PERSONAS.receptor.email}&gt;
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3">
                  <label
                    htmlFor="email-subject"
                    className="text-sm font-medium text-slate-500 w-16 shrink-0"
                  >
                    Asunto:
                  </label>
                  <input
                    id="email-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Escribe el asunto del correo..."
                    maxLength={300}
                    required
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>

                <div className="p-5">
                  <label htmlFor="email-body" className="sr-only">
                    Cuerpo del correo
                  </label>
                  <textarea
                    id="email-body"
                    rows={12}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Escribe el cuerpo del mensaje..."
                    maxLength={15000}
                    required
                    className="w-full text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none resize-y min-h-[260px]"
                  />
                </div>

                {errorMsg && (
                  <div className="mx-5 mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {errorMsg}
                  </div>
                )}

                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject('');
                      setBody('');
                      setErrorMsg(null);
                    }}
                    disabled={sending}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Enviando...' : 'Enviar correo'}
                  </button>
                </div>
              </form>
            </div>
          </main>
        ) : (
          <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            <div className="w-full md:w-[340px] lg:w-[380px] border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto shrink-0">
              {loadingList ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-slate-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : sentEmails.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-display text-sm font-semibold text-slate-900">
                    Sin correos enviados
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Los mensajes que envíes aparecerán aquí.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {sentEmails.map((item) => {
                    const isActive = selectedEmail?.id === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                            isActive ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500 truncate">
                              Para: {item.recipientName}
                            </span>
                            <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                              {formatShortTime(item.sentAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                            {item.subject}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                            {item.body}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white">
              {selectedEmail ? (
                <article className="max-w-2xl">
                  <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900">
                        {selectedEmail.subject}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>Para: {selectedEmail.recipientName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatFullDateTime(selectedEmail.sentAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedEmail.id)}
                      title="Eliminar correo"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {selectedEmail.body}
                  </div>
                </article>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Selecciona un correo enviado para leerlo.
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
