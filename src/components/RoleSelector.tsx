import { Inbox, Mail, Send } from 'lucide-react';
import type { UserRole } from '../types';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6">
          <Mail className="h-6 w-6" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
          Correo Seguro BETO
        </h1>
        <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
          Simulador de correo electrónico con detección automática de phishing.
          Elige cómo deseas ingresar.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onSelectRole('emisor')}
            className="w-full px-5 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
          >
            <Send className="h-4 w-4" />
            Entrar como emisor
          </button>

          <button
            type="button"
            onClick={() => onSelectRole('receptor')}
            className="w-full px-5 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
          >
            <Inbox className="h-4 w-4" />
            Entrar como receptor
          </button>
        </div>
      </div>
    </div>
  );
}
