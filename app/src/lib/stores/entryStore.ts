import { writable } from 'svelte/store';
import { pb, ensureAuthenticated } from '$lib/pocketbase';
import type { TimeEntry } from 'types/entryTypes';

export const entriesStore = writable<TimeEntry[]>([]);

// Fetch time entries for a user, with optional date filtering
export async function fetchEntries(userId: string, startDate?: Date, endDate?: Date): Promise<void> {
  try {
    const isAuth = await ensureAuthenticated();
    if (!isAuth) return;

    let filter = `user = "${userId}"`;
    
    if (startDate) {
      filter += ` && startTime >= "${startDate.toISOString()}"`;
    }
    
    if (endDate) {
      filter += ` && startTime <= "${endDate.toISOString()}"`;
    }
    
    const records = await pb.collection('entries').getList(1, 100, {
      filter,
      sort: '-startTime',
      expand: 'project'
    });
    
    entriesStore.set(records.items as TimeEntry[]);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    entriesStore.set([]);
  }
}

// Create a new time entry
export async function createTimeEntry(entryData: Omit<TimeEntry, 'id' | 'created' | 'updated'>): Promise<TimeEntry | null> {
  try {
    const isAuth = await ensureAuthenticated();
    if (!isAuth) return null;
    
    // Calculate duration if not provided
    if (!entryData.duration && entryData.startTime && entryData.endTime) {
      const start = new Date(entryData.startTime);
      const end = new Date(entryData.endTime);
      entryData.duration = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    
    const record = await pb.collection('entries').create(entryData);
    return record as TimeEntry;
  } catch (error) {
    console.error('Error creating time entry:', error);
    return null;
  }
}

// Update an existing time entry with better error handling and store refresh
export async function updateTimeEntry(id: string, entryData: Partial<TimeEntry>): Promise<TimeEntry | null> {
  try {
    const isAuth = await ensureAuthenticated();
    if (!isAuth) return null;
    
    console.log('Updating time entry with ID:', id, 'Data:', entryData);
    
    // Make sure task field is properly handled
    if (entryData.task) {
      console.log('Setting task field:', entryData.task);
    }
    
    const record = await pb.collection('entries').update(id, entryData);
    console.log('Update result:', record);
    
    // Get the updated record with expanded relations
    const updatedWithExpand = await pb.collection('entries').getOne(id, {
      expand: 'project'
    });
    
    // Update the local store with the expanded record
    entriesStore.update(entries => 
      entries.map(entry => 
        entry.id === id 
          ? { ...updatedWithExpand } as TimeEntry 
          : entry
      )
    );
    
    return updatedWithExpand as TimeEntry;
  } catch (error) {
    console.error('Error updating time entry:', error);
    return null;
  }
}

// Delete a time entry
export async function deleteTimeEntry(id: string): Promise<boolean> {
  try {
    const isAuth = await ensureAuthenticated();
    if (!isAuth) return false;
    
    await pb.collection('entries').delete(id);
    
    // Update the local store
    entriesStore.update(entries => entries.filter(entry => entry.id !== id));
    
    return true;
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return false;
  }
}

// Start a new time entry with improved task handling
export async function startTimeEntry(
  userId: string, 
  projectId: string | null = null, 
  taskId: string = ''
): Promise<string | null> {
  try {
    console.log(`Starting time entry: User: ${userId}, Project: ${projectId}, Task: ${taskId}`);
    
    const entryData: any = {
      user: userId,
      startTime: new Date().toISOString(),
      duration: 0,
      tags: []
    };
    
    // Always include task ID if provided, even if empty
    if (taskId) {
      entryData.task = taskId;
      console.log('Setting task field:', taskId);
    }
    
    // Only include project if provided
    if (projectId) {
      entryData.project = projectId;
    }
    
    console.log('Creating entry with data:', entryData);
    const record = await pb.collection('entries').create(entryData);
    console.log('Created entry:', record);
    
    // Fetch project details for expand
    let expandData: any = {};
    if (projectId) {
      try {
        expandData.project = await pb.collection('projects').getOne(projectId);
      } catch (e) {
        console.error('Failed to expand project data:', e);
      }
    }
    
    // Update the store with the new entry
    const newEntry = {
      ...record,
      expand: expandData
    } as TimeEntry;
    
    entriesStore.update(entries => [newEntry, ...entries]);
    
    return record.id;
  } catch (error) {
    console.error('Error starting time entry:', error);
    return null;
  }
}

// Stop an ongoing time entry
export async function stopTimeEntry(id: string): Promise<boolean> {
  try {
    const isAuth = await ensureAuthenticated();
    if (!isAuth) return false;
    
    // Get the current entry
    const entry = await pb.collection('entries').getOne(id);
    
    // Calculate duration and update
    const startTime = new Date(entry.startTime);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    
    const updated = await pb.collection('entries').update(id, {
      endTime: endTime.toISOString(),
      duration
    });
    
    // Update the local store
    entriesStore.update(entries => 
      entries.map(entry => 
        entry.id === id 
          ? { ...entry, endTime: endTime.toISOString(), duration } 
          : entry
      )
    );
    
    return true;
  } catch (error) {
    console.error('Error stopping time entry:', error);
    return false;
  }
}

// Real-time subscription
// Fix for the unsubscribe function issue
export function subscribeToEntries(userId: string): () => void {
  try {
    const filter = `user = "${userId}"`;
    
    const subscriptionPromise = pb.collection('entries').subscribe(filter, function(e) {
      // Refresh entries when there are changes
      fetchEntries(userId);
    });
    
    // Return a function that handles the promise to unsubscribe
    return () => {
      subscriptionPromise.then(unsubscribe => {
        console.log('Unsubscribing from entries');
        unsubscribe();
      }).catch(err => {
        console.error('Error unsubscribing from entries:', err);
      });
    };
  } catch (error) {
    console.error('Error setting up entries subscription:', error);
    return () => {};
  }
}