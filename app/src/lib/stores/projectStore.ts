import { writable, derived } from 'svelte/store';
import { pb } from '$lib/pocketbase';
import type { Project } from 'types/projectTypes';

// Create a writable store for projects
export const projectsStore = writable<Project[]>([]);

// Create a derived store for the default project (if any)
export const defaultProject = derived(projectsStore, ($projects) => {
  return $projects.find(project => project.defaultProject) || null;
});

// Function to fetch all projects for the current user
// Function to fetch all projects for the current user
export async function fetchProjects(userId: string): Promise<void> {
    try {
      console.log('Fetching projects for user:', userId);
      
      // Get all projects first
      const records = await pb.collection('projects').getList(1, 100, {
        sort: '-created'
      });
      
      // Filter locally based on the structure of the user field
      const userProjects = records.items.filter(item => {
        // Check if user is a string or an array
        if (Array.isArray(item.user)) {
          return item.user.includes(userId);
        } else {
          return item.user === userId;
        }
      });
      
      console.log('Filtered projects for user:', userProjects);
      projectsStore.set(userProjects as unknown as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      projectsStore.set([]);
    }
  }

// Function to create a project
export async function createProject(projectData: Omit<Project, 'id' | 'created' | 'updated'>): Promise<Project | null> {
  try {
    console.log('Creating project with data:', projectData);
    const record = await pb.collection('projects').create(projectData);
    
    // Fix: Properly cast the record to Project
    const project = record as unknown as Project;
    
    // If this is set as a default project, remove default status from any other projects
    if (projectData.defaultProject) {
      await updateDefaultProject(project.id);
    }
    
    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}

// Function to update a project
export async function updateProject(id: string, projectData: Partial<Project>): Promise<Project | null> {
  try {
    const record = await pb.collection('projects').update(id, projectData);
    
    // Fix: Properly cast the record to Project
    const project = record as unknown as Project;
    
    // If this is set as a default project, remove default status from any other projects
    if (projectData.defaultProject) {
      await updateDefaultProject(id);
    }
    
    // Update the store
    projectsStore.update(projects => 
      projects.map(p => p.id === id ? { ...p, ...project } : p)
    );
    
    return project;
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
}

// Function to delete a project
export async function deleteProject(id: string): Promise<boolean> {
  try {
    await pb.collection('projects').delete(id);
    
    // Update the store
    projectsStore.update(projects => projects.filter(project => project.id !== id));
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// Helper function to ensure only one project is set as default
async function updateDefaultProject(newDefaultProjectId: string): Promise<void> {
  let projects: Project[] = [];
  projectsStore.subscribe(value => {
    projects = value;
  })();
  
  // Find all other projects that are currently set as default
  const otherDefaultProjects = projects.filter(
    project => project.defaultProject && project.id !== newDefaultProjectId
  );
  
  // Remove default status from other projects
  for (const project of otherDefaultProjects) {
    await pb.collection('projects').update(project.id, { defaultProject: false });
  }
  
  // Update the store
  projectsStore.update(projects => 
    projects.map(project => 
      project.id !== newDefaultProjectId && project.defaultProject 
        ? { ...project, defaultProject: false } 
        : project
    )
  );
}

// Function to subscribe to real-time changes
export function subscribeToProjects(): () => void {
  console.log('Setting up projects subscription');
  
  // Initialize the subscription
  const subscriptionPromise = pb.collection('projects').subscribe('*', function(e) {
    console.log('Project subscription event:', e.action, e.record);
    
    // Handle different events
    if (e.action === 'create') {
      // Fix: Properly cast the record to Project
      projectsStore.update(projects => [...projects, e.record as unknown as Project]);
    } else if (e.action === 'update') {
      // Fix: Properly cast the record to Project
      projectsStore.update(projects => 
        projects.map(project => project.id === e.record.id ? e.record as unknown as Project : project)
      );
    } else if (e.action === 'delete') {
      projectsStore.update(projects => projects.filter(project => project.id !== e.record.id));
    }
  });
  
  // Fix: Return a function that handles the promise to unsubscribe
  return () => {
    subscriptionPromise.then(unsubscribe => {
      console.log('Unsubscribing from projects');
      unsubscribe();
    }).catch(err => {
      console.error('Error unsubscribing from projects:', err);
    });
  };
}

// Debug function to help identify what's wrong
export async function debugProjects(userId: string): Promise<void> {
  try {
    console.log('Debug: Checking PocketBase connection status');
    console.log('Debug: Auth status:', pb.authStore.isValid, pb.authStore.token);
    
    // Try to get all projects without filtering
    console.log('Debug: Attempting to get all projects without filter');
    const allRecords = await pb.collection('projects').getList(1, 100);
    console.log('Debug: All projects in database:', allRecords.items);
    
    // Try with the user filter
    console.log('Debug: Attempting to get user projects with filter');
    const userRecords = await pb.collection('projects').getList(1, 100, {
      filter: `user = "${userId}"`,
    });
    console.log('Debug: User projects in database:', userRecords.items);
    
    // Check if the user ID is valid
    console.log('Debug: Checking if user exists');
    try {
      const userRecord = await pb.collection('users').getOne(userId);
      console.log('Debug: User record found:', userRecord);
    } catch (e) {
      console.error('Debug: User not found:', e);
    }
  } catch (error) {
    console.error('Debug: Error in debugProjects:', error);
  }
}