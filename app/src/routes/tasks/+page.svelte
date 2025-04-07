<script lang="ts">
    import '../../styles/themes.scss'
    import { onMount, onDestroy } from 'svelte';
    import { setHeaderControls, clearHeaderControls } from '$lib/stores/headerControlsStore';
    import { currentUser } from '$lib/pocketbase';
    import { 
      taskStore, 
      fetchTasks, 
      createTask, 
      updateTask, 
      deleteTask,
      subscribeToTasks 
    } from '$lib/stores/taskStore';
    import type { Task } from 'types/taskTypes';
  
    let showNewTaskForm = false;
    let showSortOptions = false;
    let isLoading = false;
    
    // New task form data
    let newTask = {
      taskName: '',
      description: '',
      color: '#6c5ce7', // Default color
      defaultTask: false
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
  
    // Derived sorted tasks
    $: sortedTasks = sortTasks($taskStore, sortBy);
  
    // Controls for task management
    function addNewTask() {
      showNewTaskForm = true;
      showSortOptions = false;
    }
  
    function toggleSortOptions() {
      showSortOptions = !showSortOptions;
      showNewTaskForm = false;
    }
  
    function selectSortOption(option: string) {
      sortBy = option;
      showSortOptions = false;
    }
  
    function sortTasks(tasks: Task[], sortType: string): Task[] {
      const tasksCopy = [...tasks];
      
      switch (sortType) {
        case 'a-z':
          return tasksCopy.sort((a, b) => a.taskName.localeCompare(b.taskName));
        case 'z-a':
          return tasksCopy.sort((a, b) => b.taskName.localeCompare(a.taskName));
        case 'oldest':
          return tasksCopy.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        case 'newest':
          return tasksCopy.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        case 'color':
          return tasksCopy.sort((a, b) => a.color.localeCompare(b.color));
        case 'visibility':
          return tasksCopy.sort((a, b) => Number(b.defaultTask) - Number(a.defaultTask));
        default:
          return tasksCopy;
      }
    }
  
    async function saveTask() {
      if (!$currentUser) return;
      
      isLoading = true;
      
      try {
        const taskData = {
          user: $currentUser.id,
          ...newTask
        };
        
        await createTask(taskData);
        
        // Reset and close form
        resetTaskForm();
        showNewTaskForm = false;
      } catch (error) {
        console.error('Error saving task:', error);
      } finally {
        isLoading = false;
      }
    }
  
    function cancelTaskForm() {
      resetTaskForm();
      showNewTaskForm = false;
    }
  
    function resetTaskForm() {
      newTask = {
        taskName: '',
        description: '',
        color: '#6c5ce7',
        defaultTask: false
      };
    }
  
    async function handleDeleteTask(id: string) {
      if (confirm('Are you sure you want to delete this task?')) {
        await deleteTask(id);
      }
    }
  
    async function handleSetDefault(id: string) {
      await updateTask(id, { defaultTask: true });
    }
  
    // Cleanup function
    let unsubscribe: () => void;
  
    // Set up header controls when the component mounts
    onMount(async () => {
      setHeaderControls([
        {
          id: 'add-btn',
          icon: '+',
          title: 'Add new task',
          action: addNewTask
        },
        {
          id: 'sort-tasks-btn',
          icon: '↕️',
          title: 'Sort tasks',
          action: toggleSortOptions
        }
      ]);
  
      // Load tasks
      if ($currentUser) {
        await fetchTasks($currentUser.id);
        // Subscribe to real-time updates
        unsubscribe = subscribeToTasks();
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
    <title>Tasks</title>
  </svelte:head>
  
  <div class="tasks-page">
    <h1>Tasks</h1>
  
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
  
    {#if showNewTaskForm}
      <div class="form-overlay" on:click|self={cancelTaskForm}>
        <div class="form">
          <h2>New task</h2>
          <div class="form-group">
            <input
              type="text"
              placeholder="Task name"
              bind:value={newTask.taskName}
              class="name-input"
              autofocus
            />
          </div>
          
          <div class="form-group">
            <textarea
              placeholder="Details"
              bind:value={newTask.description}
              class="description"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Color:</label>
            <input 
              type="color" 
              bind:value={newTask.color} 
              class="color-picker"
            />
          </div>
          
          <div class="form-group checkbox-group">
            <input 
              type="checkbox" 
              id="defaultTask" 
              bind:checked={newTask.defaultTask}
            />
            <label for="defaultTask">Default task</label>
          </div>
          
          <div class="form-actions">
            <button class="cancel-btn" on:click={cancelTaskForm}>Cancel</button>
            <button 
              class="save-btn" 
              on:click={saveTask} 
              disabled={!newTask.taskName || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  
    {#if $taskStore.length === 0}
      <div class="empty-state">
        <p>You don't have any tasks yet. Click the + button to create your first task.</p>
      </div>
    {:else}
      <div class="tasks-list">
        {#each sortedTasks as task}
          <div class="item" style="border-left-color: {task.color};">
            <div class="name">{task.taskName}</div>
            <div class="description">{task.description}</div>
            {#if task.defaultTask}
              <div class="default-badge">Default</div>
            {/if}
            <div class="actions">
              {#if !task.defaultTask}
                <button 
                  class="action-btn set-default-btn" 
                  title="Set as default"
                  on:click={() => handleSetDefault(task.id)}
                >
                  ⭐
                </button>
              {/if}
              <button 
                class="action-btn delete-btn" 
                title="Delete task"
                on:click={() => handleDeleteTask(task.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
