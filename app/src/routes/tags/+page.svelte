<script lang="ts">
    import { onMount, onDestroy, afterUpdate } from 'svelte';
    import { page } from '$app/stores';
    import { setHeaderControls, clearHeaderControls } from '$lib/stores/headerControlsStore';
    import { currentUser, ensureAuthenticated } from '$lib/pocketbase';
    import { 
      tagStore, 
      fetchTags, 
      createTag, 
      updateTag, 
      deleteTag,
      subscribeToTags 
    } from 'stores/tagStore';

    import type { Tag } from 'types/tagTypes';
  
    let showNewTagForm = false;
    let showSortOptions = false;
    let isLoading = false;
    let initialized = false;
    
    // New tags form data
    let newTag = {
      tagName: '',
      description: '',
      color: '#5c5ce7', // Default color
      defaultTag: false
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
      { value: 'custom', label: 'Custom' }
    ];
  
    // Derived sorted tags
    $: sortedTags = sortTags($tagStore, sortBy);
    $: console.log('Tags component - Current tags in store:', $tagStore.length);
  
    // Initialize the page
    async function initPage() {
      console.log('Tags page - Initializing');
      
      // Set up header controls
      setHeaderControls([
        {
          id: 'add-btn',
          icon: '+',
          title: 'Add new tag',
          action: addNewTag
        },
        {
          id: 'sort-tags-btn',
          icon: '↕️',
          title: 'Sort tags',
          action: toggleSortOptions
        }
      ]);
      
      // Ensure authentication and fetch tags
      const isAuth = await ensureAuthenticated();
      if (isAuth && $currentUser) {
        console.log('Tags page - Fetching tags for user:', $currentUser.id);
        await fetchTags($currentUser.id);
        
        // Subscribe to real-time updates
        if (unsubscribe) {
          unsubscribe();
        }
        unsubscribe = subscribeToTags();
      } else {
        console.error('Tags page - Not authenticated or no current user');
      }
      
      initialized = true;
    }
    
    // Controls for tag management
    function addNewTag() {
      showNewTagForm = true;
      showSortOptions = false;
    }
  
    function toggleSortOptions() {
      showSortOptions = !showSortOptions;
      showNewTagForm = false;
    }
  
    function selectSortOption(option: string) {
      sortBy = option;
      showSortOptions = false;
    }
  
    function sortTags(tags: Tag[], sortType: string): Tag[] {
      if (!tags || !tags.length) return [];
      
      const tagsCopy = [...tags];
      
      switch (sortType) {
        case 'a-z':
          return tagsCopy.sort((a, b) => a.tagName.localeCompare(b.tagName));
        case 'z-a':
          return tagsCopy.sort((a, b) => b.tagName.localeCompare(a.tagName));
        case 'oldest':
          return tagsCopy.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
        case 'newest':
          return tagsCopy.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        case 'color':
          return tagsCopy.sort((a, b) => a.color.localeCompare(b.color));
        default:
          return tagsCopy;
      }
    }
  
    async function saveTag() {
      if (!$currentUser) return;
      
      isLoading = true;
      
      try {
        const tagData = {
          user: $currentUser.id,
          ...newTag
        };
        
        await createTag(tagData);
        
        // Reset and close form
        resetTagForm();
        showNewTagForm = false;
      } catch (error) {
        console.error('Error saving tag:', error);
      } finally {
        isLoading = false;
      }
    }
  
    function cancelTagForm() {
      resetTagForm();
      showNewTagForm = false;
    }
  
    function resetTagForm() {
      newTag = {
        tagName: '',
        description: '',
        color: '#6c5ce7',
        defaultTag: false
      };
    }
  
    async function handleDeleteTag(id: string) {
      if (confirm('Are you sure you want to delete this tag?')) {
        await deleteTag(id);
      }
    }
  
    async function handleSetDefault(id: string) {
      await updateTag(id, { defaultTag: true });
    }
  
    // Cleanup function
    let unsubscribe: () => void;
  
    // Set up header controls when the component mounts
    onMount(async () => {
      console.log('Tags page - Component mounted');
      await initPage();
    });
    
    afterUpdate(() => {
      console.log('Tags page - Component updated, initialized:', initialized);
    });
  
    // Clean up when component is destroyed
    onDestroy(() => {
      console.log('Tags page - Component destroyed');
      clearHeaderControls();
      if (unsubscribe) {
        unsubscribe();
        console.log('Tags page - Unsubscribed from real-time updates');
      }
    });
  </script>
  
  <svelte:head>
    <title>Tags</title>
  </svelte:head>
  
  <div class="tags-page">
    <h1>Tags</h1>
  
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
  
    {#if showNewTagForm}
      <div class="form-overlay" on:click|self={cancelTagForm}>
        <div class="form">
          <h2>New tag</h2>
          <div class="form-group">
            <input
              type="text"
              placeholder="Tag name"
              bind:value={newTag.tagName}
              class="name-input"
              autofocus
            />
          </div>
          
          <div class="form-group">
            <textarea
              placeholder="Details"
              bind:value={newTag.description}
              class="description"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Color:</label>
            <input 
              type="color" 
              bind:value={newTag.color} 
              class="color-picker"
            />
          </div>
          
          
          <div class="form-actions">
            <button class="cancel-btn" on:click={cancelTagForm}>Cancel</button>
            <button 
              class="save-btn" 
              on:click={saveTag} 
              disabled={!newTag.tagName || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    {/if}
  
    {#if $tagStore.length === 0}
      <div class="empty-state">
        <p>You don't have any tags yet. Click the + button to create your first tag.</p>
      </div>
    {:else}
      <div class="tags-list">
        {#each sortedTags as tag}
          <div class="item" style="border-left-color: {tag.color};">
            <div class="name">{tag.tagName}</div>
            <div class="description">{tag.description}</div>
            <div class="actions">
              <button 
                class="action-btn delete-btn" 
                title="Delete tag"
                on:click={() => handleDeleteTag(tag.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
