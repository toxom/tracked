import { writable, derived } from 'svelte/store';
import type { User } from 'types/userTypes';
import { pb, updateUser } from '$lib/pocketbase';

// Create a writable store for the user
const userStore = writable<User | null>(null);

// Create a derived store for user profile completion percentage
const profileCompletion = derived(userStore, ($user) => {
  if (!$user) return 0;
  
  const fields = [
    'name', 
    'username', 
    'avatar', 
    'themePreference', 
    'languagePreference', 
    'timezonePreference', 
    'notificationPreferences'
  ];
  
  const completedFields = fields.filter(field => {
    const value = $user[field as keyof User];
    return value !== undefined && value !== null && value !== '';
  });
  
  return Math.round((completedFields.length / fields.length) * 100);
});

// Function to update the user in the store and in PocketBase
async function updateUserProfile(id: string, data: Partial<User>): Promise<User | null> {
  try {
    const updatedUser = await updateUser(id, data);
    userStore.update(current => {
      if (current) {
        return { ...current, ...updatedUser };
      }
      return updatedUser;
    });
    return updatedUser;
  } catch (error) {
    console.error('Failed to update user:', error);
    return null;
  }
}

// Function to initialize the user store with the current user
function initUserStore(initialUser: User | null) {
  userStore.set(initialUser);
}

// Export the store and utility functions
export {
  userStore,
  profileCompletion,
  updateUserProfile,
  initUserStore
};