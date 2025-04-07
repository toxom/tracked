<script lang="ts">
    import '../../styles/themes.scss'
    import { onMount, onDestroy } from 'svelte';
    import { setHeaderControls, clearHeaderControls } from '$lib/stores/headerControlsStore';
    import { currentUser } from '$lib/pocketbase';
    import { 
      projectsStore, 
      fetchProjects, 
      createProject, 
      updateProject, 
      deleteProject,
      subscribeToProjects 
    } from '$lib/stores/projectStore';
    import type { Project } from 'types/projectTypes';
  
    let showNewProjectForm = false;
    let showSortOptions = false;
    let isLoading = false;
    
    // New project form data
    let newProject = {
      name: '',
      description: '',
      color: '#6c5ce7', // Default color
      defaultProject: false
    };
  
    // Sorting related
    let sortBy = 'newest';
    const sortOptions = [
      { value: 'a-z', label: 'A to Z' },
      { value: 'z-a', label: 'Z to A' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'newest', label: 'Newest first' },
      { value: 'recent', label: 'Most recently used first' },
      { value: 'color', label: 'Color' },
      { value: 'visibility', label: 'Visibility' },
      { value: 'custom', label: 'Custom' }
    ];
  
    // Derived sorted projects
    $: sortedProjects = sortProjects($projectsStore, sortBy);
  
    // Controls for project management
    function addNewProject() {
      showNewProjectForm = true;
      showSortOptions = false;
    }
  
    function toggleSortOptions() {
      showSortOptions = !showSortOptions;
      showNewProjectForm = false;
    }
  
    function selectSortOption(option: string) {
      sortBy = option;
      showSortOptions = false;
    }
  
    function sortProjects(projects: Project[], sortType: string): Project[] {
      if (!projects || !projects.length) return [];
      
      const projectsCopy = [...projects];
      
      switch (sortType) {
        case 'a-z':
          return projectsCopy.sort((a, b) => a.name.localeCompare(b.name));
        case 'z-a':
          return projectsCopy.sort((a, b) => b.name.localeCompare(a.name));
        case 'oldest':
          return projectsCopy.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        case 'newest':
          return projectsCopy.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        case 'color':
          return projectsCopy.sort((a, b) => (a.color || '').localeCompare(b.color || ''));
        case 'visibility':
          return projectsCopy.sort((a, b) => Number(b.defaultProject) - Number(a.defaultProject));
        default:
          return projectsCopy;
      }
    }
  
    async function saveProject() {
      if (!$currentUser) return;
      
      isLoading = true;
      
      try {
        const projectData = {
          user: $currentUser.id,
          ...newProject
        };
        
        await createProject(projectData);
        
        // Reset and close form
        resetProjectForm();
        showNewProjectForm = false;
      } catch (error) {
        console.error('Error saving project:', error);
      } finally {
        isLoading = false;
      }
    }
  
    function cancelProjectForm() {
      resetProjectForm();
      showNewProjectForm = false;
    }
  
    function resetProjectForm() {
      newProject = {
        name: '',
        description: '',
        color: '#6c5ce7',
        defaultProject: false
      };
    }
  
    async function handleDeleteProject(id: string) {
      if (confirm('Are you sure you want to delete this project?')) {
        await deleteProject(id);
      }
    }
  
    async function handleSetDefault(id: string) {
      await updateProject(id, { defaultProject: true });
    }
  
    // Cleanup function
    let unsubscribe: () => void;
  
    // Set up header controls when the component mounts
    onMount(async () => {
      setHeaderControls([
        {
          id: 'add-btn',
          icon: '+',
          title: 'Add new project',
          action: addNewProject
        },
        {
          id: 'sort-projects-btn',
          icon: '↕️',
          title: 'Sort projects',
          action: toggleSortOptions
        }
      ]);
  
      // Load projects
      if ($currentUser) {
        await fetchProjects($currentUser.id);
        // Subscribe to real-time updates
        unsubscribe = subscribeToProjects();
      }
    });
  
    // Clean up when component is destroyed
    onDestroy(() => {
      clearHeaderControls();
      if (unsubscribe) {
        unsubscribe();
      }
    });
</script>
  
<svelte:head>
  <title>Projects</title>
</svelte:head>
  
<div class="projects-page">
  <h1>Projects</h1>
  
  {#if showSortOptions}
    <div class="dropdown sort-dropdown">
      <div class="dropdown-content">
        {#each sortOptions as option}
          <button 
            class="sort-option {sortBy === option.value ? 'active' : ''}" 
            on:click={() => selectSortOption(option.value)}
          >
            {option.label}
            {#if sortBy === option.value}
              <span class="checkmark">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if showNewProjectForm}
    <div class="form-overlay" on:click|self={cancelProjectForm}>
      <div class="form">
        <h2>New project</h2>
        <div class="form-group">
          <input
            type="text"
            placeholder="Project name"
            bind:value={newProject.name}
            class="name-input"
            autofocus
          />
        </div>
        
        <div class="form-group">
          <textarea
            placeholder="Details"
            bind:value={newProject.description}
            class="description"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>Color:</label>
          <input 
            type="color" 
            bind:value={newProject.color} 
            class="color-picker"
          />
        </div>
        
        <div class="form-group checkbox-group">
          <input 
            type="checkbox" 
            id="defaultProject" 
            bind:checked={newProject.defaultProject}
          />
          <label for="defaultProject">Default project</label>
        </div>
        
        <div class="form-actions">
          <button class="cancel-btn" on:click={cancelProjectForm}>Cancel</button>
          <button 
            class="save-btn" 
            on:click={saveProject} 
            disabled={!newProject.name || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  {#if $projectsStore.length === 0}
    <div class="empty-state">
      <p>You don't have any projects yet. Click the + button to create your first project.</p>
    </div>
  {:else}
    <div class="projects-list">
      {#each sortedProjects as project}
        <div class="item" style="border-left-color: {project.color};">
          <div class="name">{project.name}</div>
          <div class="description">{project.description}</div>
          {#if project.defaultProject}
            <div class="default-badge">Default</div>
          {/if}
          <div class="actions">
            {#if !project.defaultProject}
              <button 
                class="action-btn set-default-btn" 
                title="Set as default"
                on:click={() => handleSetDefault(project.id)}
              >
                ⭐
              </button>
            {/if}
            <button 
              class="action-btn delete-btn" 
              title="Delete project"
              on:click={() => handleDeleteProject(project.id)}
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>