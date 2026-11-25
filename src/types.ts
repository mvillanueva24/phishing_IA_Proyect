export type UserRole = 'emisor' | 'receptor';

export type VerdictLabel = 'phishing' | 'seguro';

export interface ModelInputPayload {
  subject: string;
  body: string;
  url_count: number;
  urls: string[];
  formatted_text: string;
}

export interface ClassificationResult {
  isPhishing: boolean;
  label: VerdictLabel;
  confidence: number;
}

export interface EmailMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
  urlCount: number;
  detectedUrls: string[];
  classification?: ClassificationResult;
}

export const PERSONAS = {
  emisor: {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@correo-sim.local',
    avatar: '/src/assets/images/avatar_emisor_1795584034243.jpg',
    initials: 'CM',
  },
  receptor: {
    name: 'Valeria Morales',
    email: 'valeria.morales@correo-sim.local',
    avatar: '/src/assets/images/avatar_receptor_1795584033986.jpg',
    initials: 'VM',
  },
} as const;
