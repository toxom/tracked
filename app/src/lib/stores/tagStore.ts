import { writable, derived } from 'svelte/store';
import { pb } from '$lib/pocketbase';
import type { Tag } from 'types/tagTypes';

const tagStore = writable<Tag[]>([]);

// Create a derived store for the default tag (if any)
const defaultTag = derived(tagStore, ($tags) => {
  return $tags.find(tag => tag.defaultTag) || null;
});

// Function to fetch all tags for the current user
async function fetchTags(userId: string): Promise<void> {
  try {
    const records = await pb.collection('tags').getList(1, 100, {
      filter: `user = "${userId}"`,
      sort: '-created'
    });
    
    tagStore.set(records.items as Tag[]);
  } catch (error) {
    console.error('Error fetching tags:', error);
    tagStore.set([]);
  }
}

// Function to create a new tag
// In src/lib/stores/tagStore.ts

// When creating a tag:
async function createTag(tagData: Omit<Tag, 'id' | 'created' | 'updated'>): Promise<Tag | null> {
    try {
      const record = await pb.collection('tags').create(tagData);
      
      // If this is set as a default tag, remove default status from any other tags
      if (tagData.defaultTag) {
        await updateDefaultTag(record.id);
      }
      
      // DON'T update the store here, let the subscription handle it
      // tagStore.update(tags => [...tags, record as Tag]);
      
      return record as Tag;
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  }

// Function to update a tag
async function updateTag(id: string, tagData: Partial<Tag>): Promise<Tag | null> {
  try {
    const record = await pb.collection('tags').update(id, tagData);
    
    // If this is set as a default tag, remove default status from any other tags
    if (tagData.defaultTag) {
      await updateDefaultTag(id);
    }
    
    // Update the store
    tagStore.update(tags => 
      tags.map(tag => tag.id === id ? { ...tag, ...record } as Tag : tag)
    );
    
    return record as Tag;
  } catch (error) {
    console.error('Error updating tag:', error);
    return null;
  }
}

// Function to delete a tag
async function deleteTag(id: string): Promise<boolean> {
  try {
    await pb.collection('tags').delete(id);
    
    // Update the store
    tagStore.update(tags => tags.filter(tag => tag.id !== id));
    
    return true;
  } catch (error) {
    console.error('Error deleting tag:', error);
    return false;
  }
}

// Helper function to ensure only one tag is set as default
async function updateDefaultTag(newDefaultTagId: string): Promise<void> {
  let tags: Tag[] = [];
  tagStore.subscribe(value => {
    tags = value;
  })();
  
  // Find all other tags that are currently set as default
  const otherDefaultTags = tags.filter(
    tag => tag.defaultTag && tag.id !== newDefaultTagId
  );
  
  // Remove default status from other tags
  for (const tag of otherDefaultTags) {
    await pb.collection('tags').update(tag.id, { defaultTag: false });
  }
  
  // Update the store
  tagStore.update(tags => 
    tags.map(tag => 
      tag.id !== newDefaultTagId && tag.defaultTag 
        ? { ...tag, defaultTag: false } 
        : tag
    )
  );
}

// Function to subscribe to real-time changes
function subscribeToTags(): () => void {
  const unsubscribe = pb.collection('tags').subscribe('*', function(e) {
    // Handle different events
    if (e.action === 'create') {
      tagStore.update(tags => [...tags, e.record as Tag]);
    } else if (e.action === 'update') {
      tagStore.update(tags => 
        tags.map(tag => tag.id === e.record.id ? e.record as Tag : tag)
      );
    } else if (e.action === 'delete') {
      tagStore.update(tags => tags.filter(tag => tag.id !== e.record.id));
    }
  });
  
  return unsubscribe;
}

export {
  tagStore,
  defaultTag,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  subscribeToTags
};