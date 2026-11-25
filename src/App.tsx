import { useState } from 'react';
import type { UserRole } from './types';
import { RoleSelector } from './components/RoleSelector';
import { EmisorWorkspace } from './components/EmisorWorkspace';
import { ReceptorWorkspace } from './components/ReceptorWorkspace';

function readRoleFromUrl(): UserRole | null {
  const params = new URLSearchParams(window.location.search);
  const rol = params.get('rol');
  if (rol === 'emisor' || rol === 'receptor') {
    return rol;
  }
  return null;
}

function writeRoleToUrl(role: UserRole | null) {
  const url = new URL(window.location.href);
  if (role) {
    url.searchParams.set('rol', role);
  } else {
    url.searchParams.delete('rol');
  }
  window.history.replaceState({}, '', url.toString());
}

export default function App() {
  const [role, setRole] = useState<UserRole | null>(() => readRoleFromUrl());

  const handleSelectRole = (nextRole: UserRole | null) => {
    setRole(nextRole);
    writeRoleToUrl(nextRole);
  };

  if (role === 'emisor') {
    return <EmisorWorkspace onSwitchRole={handleSelectRole} />;
  }

  if (role === 'receptor') {
    return <ReceptorWorkspace onSwitchRole={handleSelectRole} />;
  }

  return <RoleSelector onSelectRole={handleSelectRole} />;
}
