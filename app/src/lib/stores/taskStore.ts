import { writable, derived } from 'svelte/store';
import { pb } from '$lib/pocketbase';
import type { Task } from 'types/taskTypes';

// Create a writable store for tasks
const taskStore = writable<Task[]>([]);

// Create a derived store for the default task (if any)
const defaultTask = derived(taskStore, ($tasks) => {
  return $tasks.find(task => task.defaultTask) || null;
});

// Function to fetch all tasks for the current user
async function fetchTasks(userId: string): Promise<void> {
  try {
    const records = await pb.collection('tasks').getList(1, 100, {
      filter: `user = "${userId}"`,
      sort: '-created'
    });
    
    taskStore.set(records.items as Task[]);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    taskStore.set([]);
  }
}

// When creating a task:
async function createTask(taskData: Omit<Task, 'id' | 'created' | 'updated'>): Promise<Task | null> {
    try {
      const record = await pb.collection('tasks').create(taskData);
      
      // If this is set as a default task, remove default status from any other tasks
      if (taskData.defaultTask) {
        await updateDefaultTask(record.id);
      }
      
      // DON'T update the store here, let the subscription handle it
      // taskStore.update(tasks => [...tasks, record as Task]);
      
      return record as Task;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

// Function to update a task
async function updateTask(id: string, taskData: Partial<Task>): Promise<Task | null> {
  try {
    const record = await pb.collection('tasks').update(id, taskData);
    
    // If this is set as a default task, remove default status from any other tasks
    if (taskData.defaultTask) {
      await updateDefaultTask(id);
    }
    
    // Update the store
    taskStore.update(tasks => 
      tasks.map(task => task.id === id ? { ...task, ...record } as Task : task)
    );
    
    return record as Task;
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
}

// Function to delete a task
async function deleteTask(id: string): Promise<boolean> {
  try {
    await pb.collection('tasks').delete(id);
    
    // Update the store
    taskStore.update(tasks => tasks.filter(task => task.id !== id));
    
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

// Helper function to ensure only one task is set as default
async function updateDefaultTask(newDefaultTaskId: string): Promise<void> {
  let tasks: Task[] = [];
  taskStore.subscribe(value => {
    tasks = value;
  })();
  
  // Find all other tasks that are currently set as default
  const otherDefaultTasks = tasks.filter(
    task => task.defaultTask && task.id !== newDefaultTaskId
  );
  
  // Remove default status from other tasks
  for (const task of otherDefaultTasks) {
    await pb.collection('tasks').update(task.id, { defaultTask: false });
  }
  
  // Update the store
  taskStore.update(tasks => 
    tasks.map(task => 
      task.id !== newDefaultTaskId && task.defaultTask 
        ? { ...task, defaultTask: false } 
        : task
    )
  );
}

// Function to subscribe to real-time changes
function subscribeToTasks(): () => void {
  const unsubscribe = pb.collection('tasks').subscribe('*', function(e) {
    // Handle different events
    if (e.action === 'create') {
      taskStore.update(tasks => [...tasks, e.record as Task]);
    } else if (e.action === 'update') {
      taskStore.update(tasks => 
        tasks.map(task => task.id === e.record.id ? e.record as Task : task)
      );
    } else if (e.action === 'delete') {
      taskStore.update(tasks => tasks.filter(task => task.id !== e.record.id));
    }
  });
  
  return unsubscribe;
}

export {
  taskStore,
  defaultTask,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  subscribeToTasks
};