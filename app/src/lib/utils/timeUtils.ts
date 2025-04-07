import type { TimeEntry } from 'types/entryTypes';

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatTimeRange(startTime: string, endTime: string | null): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return `${startStr} - ${endStr}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function groupEntriesByDay(entries: TimeEntry[]): { date: string, entries: TimeEntry[], expanded: boolean }[] {
  if (!entries || entries.length === 0) return [];
  
  const groups: { [key: string]: TimeEntry[] } = {};
  
  // Group entries by date (YYYY-MM-DD)
  entries.forEach(entry => {
    if (!entry.startTime) return;
    
    const date = new Date(entry.startTime);
    const dateStr = date.toISOString().split('T')[0];
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    
    groups[dateStr].push(entry);
  });
  
  // Convert to array and sort by date (newest first)
  return Object.entries(groups)
    .map(([date, entries]) => ({ 
      date, 
      entries, 
      expanded: false 
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}