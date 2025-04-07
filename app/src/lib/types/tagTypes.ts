import type { RecordModel } from 'pocketbase';

export interface Tag extends RecordModel {
    user: string;
    tagName: string;
    description: string;
    color: string;
}