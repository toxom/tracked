<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { setHeaderControls, clearHeaderControls } from '$lib/stores/headerControlsStore';
    import { currentUser } from '$lib/pocketbase';
    import type { TimeEntry } from 'types/entryTypes';
    import type { Task } from 'types/taskTypes';
    import type { Project } from 'types/projectTypes';
    import { formatDuration, formatTimeRange, formatDate, groupEntriesByDay } from '$lib/utils/timeUtils';
    import { 
      entriesStore, 
      fetchEntries, 
      startTimeEntry,
      stopTimeEntry,
      updateTimeEntry,
      subscribeToEntries 
    } from '$lib/stores/entryStore';
    import { 
      projectsStore, 
      fetchProjects, 
      createProject,
      subscribeToProjects      
    } from '$lib/stores/projectStore';
    import { 
      tagStore, 
      fetchTags 
    } from '$lib/stores/tagStore';
    import {
      taskStore,
      fetchTasks
    } from '$lib/stores/taskStore';

    let unsubscribe: () => void;
    let activeEntryId: string | null = null;
    let activeTaskId: string | null = null;
    let activeEntryStartTime: Date | null = null;
    let activeEntryTimer: ReturnType<typeof setInterval> | null = null;
    let currentDuration = 0;
    let projectInput = '';
    let showProjectDropdown = false;
    
    // Edit mode variables
    let editingEntry: TimeEntry | null = null;
    let editProjectInput = '';
    let editTaskId = '';
    let editStartTime = '';
    let editEndTime = '';
    let showEditTaskDropdown = false;
    let showEditProjectDropdown = false;

    $: availableProjects = $projectsStore || [];
    $: availableTags = $tagStore || [];
    $: availableTasks = $taskStore || [];
    $: filteredProjects = projectInput ? 
      availableProjects.filter(p => p.name.toLowerCase().includes(projectInput.toLowerCase())) : 
      availableProjects;
    $: filteredEditProjects = editProjectInput ? 
      availableProjects.filter(p => p.name.toLowerCase().includes(editProjectInput.toLowerCase())) : 
      availableProjects;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Separate today's entries from previous days
    $: todayEntries = $entriesStore.filter(entry => {
      const entryDate = new Date(entry.startTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    $: previousDayEntries = $entriesStore.filter(entry => {
      const entryDate = new Date(entry.startTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() < today.getTime();
    });

    // Group previous day entries by date
    $: previousDayGroups = groupEntriesByDay(previousDayEntries);

    // Function to toggle expansion of a day group
    function toggleDayExpansion(date: string) {
      previousDayGroups = previousDayGroups.map(group => {
        if (group.date === date) {
          return { ...group, expanded: !group.expanded };
        }
        return group;
      });
    }

    async function startEntryWithTask(taskId: string) {
      if (!$currentUser) return;
      
      // If there's already an active entry with the same task, stop it
      if (activeEntryId && activeTaskId === taskId) {
        await stopCurrentEntry();
        return;
      }
      
      // If there's a different active entry, stop it first
      if (activeEntryId) {
        await stopCurrentEntry();
      }
      
      // Start a new entry with the selected task and optional project
      let projectId = null;
      
      // If project input has text but doesn't match an existing project, create a new one
      if (projectInput && !availableProjects.some(p => p.name.toLowerCase() === projectInput.toLowerCase())) {
        const newProject = await createProject({
          name: projectInput,
          user: $currentUser.id
        });
        
        if (newProject) {
          projectId = newProject.id;
        }
      } else if (projectInput) {
        // Find matching existing project
        const project = availableProjects.find(p => 
          p.name.toLowerCase() === projectInput.toLowerCase());
        if (project) projectId = project.id;
      }
      
      activeEntryId = await startTimeEntry($currentUser.id, projectId, taskId);
      activeTaskId = taskId;
      
      if (activeEntryId) {
        activeEntryStartTime = new Date();
        
        // Update header controls to highlight the active task
        updateHeaderControls();
        
        // Start a timer to update duration in real-time
        activeEntryTimer = setInterval(() => {
          if (activeEntryStartTime) {
            currentDuration = Math.floor((Date.now() - activeEntryStartTime.getTime()) / 1000);
          }
        }, 1000);
      }
    }
    
    async function stopCurrentEntry() {
      if (!activeEntryId) return;
      
      await stopTimeEntry(activeEntryId);
      
      // Clean up
      if (activeEntryTimer) {
        clearInterval(activeEntryTimer);
        activeEntryTimer = null;
      }
      
      activeEntryId = null;
      activeEntryStartTime = null;
      activeTaskId = null;
      currentDuration = 0;
      projectInput = '';
      
      // Update header controls to remove active highlighting
      updateHeaderControls();
    }

    function calculateTotalTime(entries) {
      // Calculate total duration from all entries
      let totalSeconds = entries.reduce((total, entry) => {
        // Convert duration to seconds and add
        return total + (entry.duration * 60);
      }, 0);
      
      // Format as HH:MM
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    function getTaskColor(taskId: string): string {
      const task = availableTasks.find(t => t.id === taskId);
      return task?.color || '#ccc';
    }
    
    function getTaskName(taskId: string): string {
      const task = availableTasks.find(t => t.id === taskId);
      return task?.taskName || 'Uncategorized';
    }
    
    function selectProject(projectName: string) {
      projectInput = projectName;
      showProjectDropdown = false;
    }
    
    function selectEditProject(projectName: string, projectId: string) {
      editProjectInput = projectName;
      if (editingEntry) {
        editingEntry.project = projectId;
        editingEntry.expand = {
          ...editingEntry.expand,
          project: availableProjects.find(p => p.id === projectId)
        };
      }
      showEditProjectDropdown = false;
    }
    
    function updateHeaderControls() {
      if (!$currentUser) return;
      
      // Create task buttons with names and colors
      const taskButtons = availableTasks.map(task => {
        const isActive = activeTaskId === task.id;
        const buttonText = task.taskName; // Use the task name
        const textColor = getContrastTextColor(task.color);
        
        return {
          id: `task-${task.id}`,
          text: buttonText, // Show the task name on the button
          title: task.taskName,
          active: isActive,
          style: `background-color: ${task.color}; color: ${textColor};`,
          action: () => startEntryWithTask(task.id)
        };
      });
      
      // Add stop button
      const controls = [
        ...taskButtons,
        {
          id: 'stop-btn',
          icon: '⏹️',
          title: 'Stop current entry',
          action: stopCurrentEntry
        }
      ];
      
      setHeaderControls(controls);
    }
    
    // Helper function to determine text color based on background color brightness
    function getContrastTextColor(bgColor: string): string {
      // Default to black if no color
      if (!bgColor) return 'black';
      
      // Remove # if present
      const hex = bgColor.replace('#', '');
      
      // Convert to RGB
      const r = parseInt(hex.substr(0, 2), 16) || 0;
      const g = parseInt(hex.substr(2, 2), 16) || 0;
      const b = parseInt(hex.substr(4, 2), 16) || 0;
      
      // Calculate brightness (YIQ formula)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Return white for dark backgrounds, black for light backgrounds
      return brightness > 128 ? 'black' : 'white';
    }
    
    // Open edit modal for an entry
    function editEntry(entry: TimeEntry) {
      editingEntry = { ...entry };
      
      // Set default values
      editTaskId = entry.task || '';
      
      // Format dates for datetime-local input
      const startDate = new Date(entry.startTime);
      editStartTime = formatDateTimeForInput(startDate);
      
      if (entry.endTime) {
        const endDate = new Date(entry.endTime);
        editEndTime = formatDateTimeForInput(endDate);
      } else {
        editEndTime = '';
      }
      
      // Set project input
      if (entry.expand?.project) {
        editProjectInput = entry.expand.project.name;
      } else if (entry.project) {
        const project = availableProjects.find(p => p.id === entry.project);
        editProjectInput = project?.name || '';
      } else {
        editProjectInput = '';
      }
    }
    
    // Helper function to format date for datetime-local input
    function formatDateTimeForInput(date: Date): string {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Save edited entry
    async function saveEditedEntry() {
      if (!editingEntry) return;
      
      try {
        // Calculate new duration based on start and end time
        const startTime = new Date(editStartTime);
        let duration = 0;
        
        const updateData: any = {
          task: editTaskId,
          startTime: startTime.toISOString()
        };
        
        // Only add project if provided
        if (editProjectInput) {
          // Check if project exists or create new one
          let projectId = editingEntry.project || null;
          
          // If project input doesn't match existing project, create a new one
          if (!availableProjects.some(p => p.name.toLowerCase() === editProjectInput.toLowerCase())) {
            if ($currentUser) {
              const newProject = await createProject({
                name: editProjectInput,
                user: $currentUser.id
              });
              
              if (newProject) {
                projectId = newProject.id;
              }
            }
          } else {
            // Find matching existing project
            const project = availableProjects.find(p => 
              p.name.toLowerCase() === editProjectInput.toLowerCase());
            if (project) projectId = project.id;
          }
          
          if (projectId) {
            updateData.project = projectId;
          }
        } else {
          // If project input is empty, remove project reference
          updateData.project = null;
        }
        
        // Handle end time and duration
        if (editEndTime) {
          const endTime = new Date(editEndTime);
          updateData.endTime = endTime.toISOString();
          
          // Calculate duration in minutes
          duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          updateData.duration = duration;
        } else {
          // If no end time, it's still running or user removed end time
          updateData.endTime = null;
          updateData.duration = 0;
        }
        
        // Update entry in database
        await updateTimeEntry(editingEntry.id, updateData);
        
        // Close edit mode
        editingEntry = null;
      } catch (error) {
        console.error('Error saving edited entry:', error);
        // Could show error message to user here
      }
    }
    
    // Cancel edit
    function cancelEdit() {
      editingEntry = null;
    }
    
    onMount(async () => {
  if ($currentUser) {
    // Fetch initial data
    await Promise.all([
      fetchEntries($currentUser.id),
      fetchProjects($currentUser.id),
      fetchTags($currentUser.id),
      fetchTasks($currentUser.id)
    ]);
    
    // Set up header controls
    updateHeaderControls();
    
    // Subscribe to real-time updates
    unsubscribe = subscribeToEntries($currentUser.id);
    
    // Add a subscription for projects
    const projectsUnsubscribe = subscribeToProjects();
    
    // Update the onDestroy cleanup to include this new subscription
    const originalUnsubscribe = unsubscribe;
    unsubscribe = () => {
      originalUnsubscribe();
      projectsUnsubscribe();
    };
  }
});
    
    // Clean up when component is destroyed
    onDestroy(() => {
      clearHeaderControls();
      if (unsubscribe) {
        unsubscribe();
      }
      if (activeEntryTimer) {
        clearInterval(activeEntryTimer);
      }
    });
</script>
  
<svelte:head>
  <title>Time Tracking</title>
</svelte:head>
  
<div class="time-tracking-page">
  <h1>Time tracking</h1>
  
  <!-- Active entry indicator with project input field -->
  {#if activeEntryId}
    <div class="active-entry">
      <div class="spinner"></div>
      
      <div class="entry-info">
        <div class="entry-task">
          {#if activeTaskId}
            {#if availableTasks.length}
              <span 
                class="task-badge" 
                style="background-color: {getTaskColor(activeTaskId)}; color: {getContrastTextColor(getTaskColor(activeTaskId))};"
              >
                {getTaskName(activeTaskId)}
              </span>
            {/if}
          {/if}
          <span class="timer-text">Running: {formatDuration(currentDuration)}</span>
        </div>
      </div>
      
      <div class="project-input-container">
        <input 
          type="text" 
          bind:value={projectInput} 
          placeholder="Project name (optional)"
          on:focus={() => showProjectDropdown = true}
          on:blur={() => setTimeout(() => showProjectDropdown = false, 200)}
        />
        
        {#if showProjectDropdown && filteredProjects.length > 0}
          <div class="project-dropdown">
            {#each filteredProjects as project}
              <div 
                class="project-option"
                on:mousedown={() => selectProject(project.name)}
              >
                {project.name}
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <button class="stop-button" on:click={stopCurrentEntry}>Stop</button>
    </div>
  {:else}
    <div class="entry-instruction">
      <p>Select a task button above to start tracking time</p>
    </div>
  {/if}
    
  <!-- Show entries for current day if any exist -->
  {#if todayEntries.length > 0}
    <div class="day-container">
      <div class="day-header">
        <h2>{formatDate(today.toISOString())}</h2>
        <div class="day-total">{calculateTotalTime(todayEntries)}</div>
      </div>
      
      <div class="entries-list">
        {#each todayEntries as entry}
          <div class="time-entry" on:click={() => editEntry(entry)}>
            {#if entry.task}
              <div 
                class="entry-task-marker" 
                style="background-color: {getTaskColor(entry.task)};"
              >
              </div>
            {/if}
            
            <div class="entry-details">
              <div class="entry-title">
                <span class="project-name">{entry.expand?.project?.name || 'No Project'}</span>
                {#if entry.label}
                  <span class="entry-label">{entry.label}</span>
                {/if}
                <span class="entry-separator">•</span>
                <span class="entry-task-name">
                  {getTaskName(entry.task)}
                </span>
              </div>
              
              <div class="entry-tags">
                {#each entry.tags || [] as tag}
                  <span class="tag">{tag.tagName}</span>
                {/each}
              </div>
            </div>
            
            <div class="entry-time">
              <div class="duration">{formatDuration(entry.duration * 60)}</div>
              <div class="time-range">{formatTimeRange(entry.startTime, entry.endTime)}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>No time entries for today. Click a task button to start tracking time.</p>
    </div>
  {/if}
    
  <!-- Previous days section with toggle functionality -->
  {#if previousDayEntries?.length > 0}
    <div class="previous-days">
      {#each previousDayGroups as dayGroup}
        <div class="collapsed-day">
          <button class="collapse-btn" on:click={() => toggleDayExpansion(dayGroup.date)}>
            <span class="collapse-arrow">{dayGroup.expanded ? '▼' : '►'}</span>
            {formatDate(dayGroup.date)}
          </button>
          <span class="day-total">{calculateTotalTime(dayGroup.entries)}</span>
          
          {#if dayGroup.expanded}
            <div class="entries-list">
              {#each dayGroup.entries as entry}
                <div class="time-entry" on:click={() => editEntry(entry)}>
                  {#if entry.task}
                    <div 
                      class="entry-task-marker" 
                      style="background-color: {getTaskColor(entry.task)};"
                    >
                    </div>
                  {/if}
                  
                  <div class="entry-details">
                    <div class="entry-title">
                      <span class="project-name">{entry.expand?.project?.name || 'No Project'}</span>
                      {#if entry.label}
                        <span class="entry-label">{entry.label}</span>
                      {/if}
                      <span class="entry-separator">•</span>
                      <span class="entry-task-name">
                        {getTaskName(entry.task)}
                      </span>
                    </div>
                    
                    <div class="entry-tags">
                      {#each entry.tags || [] as tag}
                        <span class="tag">{tag.tagName}</span>
                      {/each}
                    </div>
                  </div>
                  
                  <div class="entry-time">
                    <div class="duration">{formatDuration(entry.duration * 60)}</div>
                    <div class="time-range">{formatTimeRange(entry.startTime, entry.endTime)}</div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Edit Entry Modal -->
  {#if editingEntry}
    <div class="modal-overlay">
      <div class="edit-modal">
        <h3>Edit Time Entry</h3>
        
        <div class="form-group">
          <label for="editTask">Task</label>
          <div class="dropdown-container">
            <select id="editTask" bind:value={editTaskId}>
              {#each availableTasks as task}
                <option value={task.id}>{task.taskName}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="editProject">Project (optional)</label>
          <div class="project-input-container">
            <input 
              id="editProject"
              type="text" 
              bind:value={editProjectInput} 
              placeholder="Project name"
              on:focus={() => showEditProjectDropdown = true}
              on:blur={() => setTimeout(() => showEditProjectDropdown = false, 200)}
            />
            
            {#if showEditProjectDropdown && filteredEditProjects.length > 0}
              <div class="project-dropdown">
                {#each filteredEditProjects as project}
                  <div 
                    class="project-option"
                    on:mousedown={() => selectEditProject(project.name, project.id)}
                  >
                    {project.name}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        
        <div class="form-group">
          <label for="editStartTime">Start Time</label>
          <input 
            id="editStartTime"
            type="datetime-local" 
            bind:value={editStartTime}
          />
        </div>
        
        <div class="form-group">
          <label for="editEndTime">End Time (leave empty if still running)</label>
          <input 
            id="editEndTime"
            type="datetime-local" 
            bind:value={editEndTime}
          />
        </div>
        
        <div class="modal-actions">
          <button class="cancel-button" on:click={cancelEdit}>Cancel</button>
          <button class="save-button" on:click={saveEditedEntry}>Save</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
.time-tracking-page {
  padding: 1rem;
}

.active-entry {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f0f8ff;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.entry-instruction {
  text-align: center;
  color: #666;
  margin-bottom: 1.5rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #3498db;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.entry-info {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.entry-task {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: white;
}

.timer-text {
  font-weight: bold;
}

.project-input-container {
  position: relative;
  flex-grow: 1;
}

.project-input-container input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}

.project-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 0.25rem 0.25rem;
  z-index: 100;
}

.project-option {
  padding: 0.5rem;
  cursor: pointer;
}

.project-option:hover {
  background-color: #f5f5f5;
}

.stop-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.stop-button:hover {
  background-color: #c0392b;
}

.day-container {
  margin-bottom: 1.5rem;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.day-total {
  font-weight: bold;
  color: #333;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.time-entry {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;

  &:hover {
    background-color: #292020;
  }
}

.entry-task-marker {
  width: 0.5rem;
  height: 100%;
  min-height: 2.5rem;
  margin-right: 0.75rem;
  border-radius: 2px;
}

.entry-details {
  flex-grow: 1;
}

.entry-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.project-name {
  font-weight: bold;
}

.entry-separator {
  color: #999;
}

.entry-task-name {
  font-style: italic;
}

.entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  background-color: #eee;
  border-radius: 1rem;
}

.entry-time {
  text-align: right;
  min-width: 80px;
}

.duration {
  font-weight: bold;
}

.time-range {
  font-size: 0.875rem;
  color: #666;
}

.previous-days {
  margin-top: 2rem;
}

.collapsed-day {
  margin-bottom: 0.5rem;
}

.collapse-btn {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  width: 100%;
  text-align: left;
}

.collapse-arrow {
  margin-right: 0.5rem;
  width: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.edit-modal {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .dropdown-container {
    position: relative;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }
  
  .cancel-button {
    padding: 8px 16px;
    background-color: #f1f1f1;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .save-button {
    padding: 8px 16px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
</style>