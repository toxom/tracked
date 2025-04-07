import type { RecordModel } from 'pocketbase';

export interface Task extends RecordModel {
    user: string;
    taskName: string;
    description: string;
    color: string;
    defaultTask: boolean;
}