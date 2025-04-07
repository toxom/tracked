import PocketBase from 'pocketbase';
import { onMount } from 'svelte';
import type { AuthModel } from 'pocketbase';
import { writable } from 'svelte/store'
import type { User } from 'types/userTypes';
import { ClientResponseError } from 'pocketbase';

let publishTimer: ReturnType<typeof setTimeout> | null = null;
let lastPublishedPosition: { userId: string; x: number; y: number; name: string } | null = null;
let lastAuthCheck = 0;
const AUTH_CHECK_COOLDOWN = 5000;

export const pb = new PocketBase('http://127.0.0.1:8090');
pb.autoCancellation(false);

export const currentUser = writable<User | null>(pb.authStore.model as User | null);

pb.authStore.onChange((auth) => {
    console.log('authStore changed', auth);
    console.log('New currentUser:', pb.authStore.model);
	currentUser.set(pb.authStore.model as User | null);
});
console.log('PocketBase URL:', pb.baseUrl);

export async function checkPocketBaseConnection() {
    try {
        const health = await pb.health.check();
        console.log('PocketBase health check:', health);
        return true;
    } catch (error) {
        console.error('PocketBase connection error:', error);
        return false;
    }
}


export async function ensureAuthenticated(): Promise<boolean> {
    console.log('Checking authentication...');
    const now = Date.now();
	if (now - lastAuthCheck < AUTH_CHECK_COOLDOWN && pb.authStore.isValid) {
        return true;
    }
    lastAuthCheck = now;    
    console.log('Current auth model:', pb.authStore.model);
    console.log('Is auth valid?', pb.authStore.isValid);
    if (!pb.authStore.isValid) {
        console.log('Auth token is invalid. Attempting to refresh...');
        try {
            const authData = await pb.collection('users').authRefresh();
            console.log('Auth token refreshed successfully');
            console.log('New auth model:', pb.authStore.model);
            console.log('Auth refreshed:', authData);
            return true;
        } catch (error) {
            console.error('Failed to refresh auth token:', error);
            pb.authStore.clear();
            return false;
        }
    }
    return true;
}
export async function signUp(email: string, password: string): Promise<User | null> {
    try {
        const userData = {
            email,
            password,
            passwordConfirm: password,
            name: email.split('@')[0],
            username: email.split('@')[0], 
        };
        
        console.log('Sending signup data:', userData);
        
        const user = await pb.collection('users').create<User>(userData);
        return user;
    } catch (error) {
        // More detailed error logging
        if (error instanceof Error) {
            console.error('Sign-up error details:', {
                message: error.message,
                name: error.name,
                data: (error as any).data,
                response: (error as any).response
            });
        }
        console.error('Sign-up error:', error instanceof Error ? error.message : String(error));
        return null;
    }
}
export async function signIn(email: string, password: string): Promise<AuthModel | null> {
    try {
        const authData = await pb.collection('users').authWithPassword<User>(email, password);
        return authData.record as User;
    } catch (error) {
        console.error('Sign-in error:', error instanceof Error ? error.message : String(error));
        return null;
    }
}
export function signOut() {
    pb.authStore.clear();
    currentUser.set(null);
}
export async function updateUser(id: string, userData: FormData | Partial<User>): Promise<User> {
    const record = await pb.collection('users').update(id, userData);
    return record as User;
}
export async function getUserById(id: string): Promise<User | null> {
    try {
        const record = await pb.collection('users').getOne(id);
        return record as User;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}
export function unsubscribeFromChanges(unsubscribe: () => void): void {
    unsubscribe();
}


// onMount(async () => {
//     const connected = await checkPocketBaseConnection();
//     if (connected) {
//       console.log('Connected to local PocketBase successfully!');
//       // Perform actions if connected, e.g., fetch data
//     } else {
//       console.error('Failed to connect to local PocketBase');
//       // Handle connection error, e.g., display an error message
//     }
//   });

