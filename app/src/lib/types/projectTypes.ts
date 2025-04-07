import type { RecordModel } from 'pocketbase';

export interface Project {
  id: string;
  user: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  defaultProject?: boolean;
  created: string;
  updated: string;
}