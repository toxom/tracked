import type { RecordModel } from 'pocketbase';
import type { Project } from 'types/projectTypes';

export interface TimeEntry extends RecordModel {
    id: string;
    user: string;
    project?: string;
    task: string;
    tags: string[];
    startTime: string;
    endTime: string | null;
    duration: number;
    label?: string;
    notes?: string;
    created: string;
    updated: string;
    expand?: {
      project?: Project;
    };
  }