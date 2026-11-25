import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Inbox,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PERSONAS, type EmailMessage, type UserRole } from '../types';
import {
  formatFullDateTime,
  formatShortTime,
  splitBodyWithUrls,
} from '../lib/urlHighlight';
import { Avatar } from './Avatar';

interface ReceptorWorkspaceProps {
  onSwitchRole: (role: UserRole | null) => void;
}

type InboxFilter = 'todos' | 'phishing' | 'seguro';

export function ReceptorWorkspace({ onSwitchRole }: ReceptorWorkspaceProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadEmails = async () => {
    try {
      const res = await fetch('/api/emails?view=receptor');
      if (!res.ok) return;
      const data = (await res.json()) as { emails: EmailMessage[] };
      setEmails(data.emails);
      setSelectedId((prev) =>
        prev && data.emails.some((e) => e.id === prev)
          ? prev
          : data.emails[0]?.id ?? null
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadEmails();
      }
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const counts = useMemo(() => {
    let phishing = 0;
    let seguro = 0;
    for (const email of emails) {
      if (email.classification?.isPhishing) phishing += 1;
      else seguro += 1;
    }
    return { total: emails.length, phishing, seguro };
  }, [emails]);

  const filteredEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return emails.filter((email) => {
      if (filter === 'phishing' && !email.classification?.isPhishing) {
        return false;
      }
      if (filter === 'seguro' && email.classification?.isPhishing) {
        return false;
      }
      if (!query) return true;
      return (
        email.subject.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query)
      );
    });
  }, [emails, filter, searchQuery]);

  const selectedEmail = useMemo(() => {
    if (!filteredEmails.length) return null;
    return (
      filteredEmails.find((item) => item.id === selectedId) ?? filteredEmails[0]
    );
  }, [filteredEmails, selectedId]);

  const handleSelectEmail = async (email: EmailMessage) => {
    setSelectedId(email.id);
    if (!email.read) {
      setEmails((prev) =>
        prev.map((item) =>
          item.id === email.id ? { ...item, read: true } : item
        )
      );
      try {
        await fetch(`/api/emails/${email.id}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch {
        // ignore
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch {
      // ignore
    }
  };

  const filterLabel =
    filter === 'todos'
      ? 'Bandeja de entrada'
      : filter === 'phishing'
        ? 'Phishing'
        : 'Seguros';

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
              src={PERSONAS.receptor.avatar}
              name={PERSONAS.receptor.name}
              initials={PERSONAS.receptor.initials}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-600">Receptor</p>
              <p className="font-display text-sm font-semibold text-slate-900 truncate">
                {PERSONAS.receptor.name}
              </p>
              <p className="text-xs font-mono text-slate-500 truncate">
                {PERSONAS.receptor.email}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setFilter('todos')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'todos'
                  ? 'bg-slate-200/70 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 text-slate-500" />
                Bandeja de entrada
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('phishing')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'phishing'
                  ? 'bg-red-50 text-red-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                Phishing
              </span>
              <span className="text-xs font-mono tabular-nums text-red-700">
                {counts.phishing}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('seguro')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'seguro'
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Seguros
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-700">
                {counts.seguro}
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
            <span className="font-medium text-slate-900">Receptor</span>
            <span aria-hidden="true">/</span>
            <span>{filterLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-60">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar correos..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={loadEmails}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              Actualizar
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Email List */}
          <div className="w-full md:w-[350px] lg:w-[390px] border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto shrink-0 bg-white">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-slate-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-display text-sm font-semibold text-slate-900">
                  {emails.length === 0
                    ? 'No hay correos recibidos'
                    : 'No hay coincidencias'}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {emails.length === 0
                    ? 'Los correos que envíe el emisor aparecerán aquí automáticamente.'
                    : 'Prueba cambiando el filtro o la búsqueda.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredEmails.map((email) => {
                  const isActive = selectedEmail?.id === email.id;
                  const isPhishing = Boolean(email.classification?.isPhishing);

                  return (
                    <li key={email.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectEmail(email)}
                        className={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                          isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              email.read
                                ? 'text-slate-600 font-normal'
                                : 'text-slate-900 font-semibold'
                            }`}
                          >
                            {email.senderName}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                            {formatShortTime(email.sentAt)}
                          </span>
                        </div>

                        <p
                          className={`mt-1 text-sm truncate ${
                            email.read
                              ? 'text-slate-700 font-medium'
                              : 'text-slate-900 font-semibold'
                          }`}
                        >
                          {email.subject}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                          {email.body}
                        </p>

                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {isPhishing ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                              Phishing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              Seguro
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Reading Pane */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white">
            {selectedEmail ? (
              <article className="max-w-3xl">
                {selectedEmail.classification?.isPhishing ? (
                  <div
                    role="alert"
                    className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3.5"
                  >
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display text-sm font-bold text-red-900">
                        Phishing
                      </p>
                      <p className="mt-0.5 text-sm text-red-800 leading-relaxed">
                        Este correo fue clasificado como phishing. Evita abrir sus
                        enlaces o compartir información personal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    role="status"
                    className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5"
                  >
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display text-sm font-bold text-emerald-900">
                        Seguro
                      </p>
                      <p className="mt-0.5 text-sm text-emerald-800 leading-relaxed">
                        Este correo fue clasificado como seguro.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pb-5 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                      {selectedEmail.subject}
                    </h1>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedEmail.id)}
                      title="Eliminar correo"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={PERSONAS.emisor.avatar}
                        name={selectedEmail.senderName}
                        initials={PERSONAS.emisor.initials}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900">
                            {selectedEmail.senderName}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            &lt;{selectedEmail.senderEmail}&gt;
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Para: {selectedEmail.recipientName}
                        </p>
                      </div>
                    </div>

                    <time className="text-xs font-mono tabular-nums text-slate-500">
                      {formatFullDateTime(selectedEmail.sentAt)}
                    </time>
                  </div>
                </div>

                <div className="py-6 text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                  {splitBodyWithUrls(selectedEmail.body).map((segment, idx) =>
                    segment.isUrl ? (
                      <span
                        key={idx}
                        title="Enlace desactivado por seguridad"
                        className={`font-mono text-[13px] px-1 py-0.5 rounded underline decoration-dotted ${
                          selectedEmail.classification?.isPhishing
                            ? 'bg-red-50 text-red-800 decoration-red-400'
                            : 'bg-slate-100 text-slate-700 decoration-slate-400'
                        }`}
                      >
                        {segment.text}
                      </span>
                    ) : (
                      <span key={idx}>{segment.text}</span>
                    )
                  )}
                </div>
              </article>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Selecciona un correo para leerlo.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
