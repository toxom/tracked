import type { RecordModel } from 'pocketbase'; 

export interface User {
  id: string;
  username?: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name?: string;
  avatar?: string;
  created: string;
  updated: string;
  themePreference?: string;
  languagePreference?: string;
  timezonePreference?: string;
  notificationPreferences?: Record<string, boolean>;
  factorValidated?: boolean; 

}