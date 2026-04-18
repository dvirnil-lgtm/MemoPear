export enum CommMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  LINKEDIN = 'linkedin',
  WHATSAPP = 'whatsapp',
  SLACK = 'slack',
  TWITTER = 'twitter',
}

export interface ScannedLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  conferenceName: string;
  commMethods: CommMethod[];
  contactValues: Partial<Record<CommMethod, string>>;
  notes: string;
  timestamp: number;
  aiSummary?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  conferences: string[];
  socialLinks: Record<string, string>;
  picture?: string;
  phone?: string;
  password?: string;
}

export type PaymentCycle = 'monthly' | 'annual';
