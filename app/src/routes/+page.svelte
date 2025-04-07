<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';

    import { signIn, signUp, signOut, currentUser, checkPocketBaseConnection } from '$lib/pocketbase';
    import { userStore, profileCompletion, updateUserProfile, initUserStore } from 'stores/userStore';
    import type { User } from 'types/userTypes';
    
    let email = '';
    let password = '';
    let confirmPassword = '';
    let isRegistering = false;
    let errorMessage = '';
    let successMessage = '';
    let isLoading = false;
    let isConnected = false;
    let editMode = false;
    
    // Fields for user profile editing
    let editableUser: Partial<User> = {};
    
    // Form validation
    $: passwordsMatch = password === confirmPassword;
    $: isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    $: isPasswordValid = password.length >= 8;
    $: isFormValid = isEmailValid && isPasswordValid && (!isRegistering || passwordsMatch);
    
    onMount(async () => {
      // Check PocketBase connection on component mount
      isConnected = await checkPocketBaseConnection();
      if (!isConnected) {
        errorMessage = 'Unable to connect to the database. Please check if PocketBase is running.';
      }
      
      // Initialize user store with current user from PocketBase auth store
      if ($currentUser) {
        initUserStore($currentUser);
      }
    });
    
    // Update editable user whenever the store changes
    $: if ($userStore) {
      // Create a copy of user data for editing
      editableUser = { 
        name: $userStore.name || '',
        username: $userStore.username || ''
      };
    }
    
    async function handleSubmit() {
      errorMessage = '';
      successMessage = '';
      isLoading = true;
      
      try {
        if (isRegistering) {
          // Sign up
          if (!passwordsMatch) {
            errorMessage = 'Passwords do not match';
            isLoading = false;
            return;
          }
          
          const user = await signUp(email, password);
          if (user) {
            successMessage = 'Account created successfully!';
            // Auto login after registration
            await signIn(email, password);
          } else {
            errorMessage = 'Failed to create account. Email may already be registered.';
          }
        } else {
          // Sign in
          const user = await signIn(email, password);
          if (!user) {
            errorMessage = 'Invalid email or password';
          } else {
            initUserStore(user);
          }
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        console.error('Authentication error:', error);
      } finally {
        isLoading = false;
      }
    }
    
    function toggleForm() {
      isRegistering = !isRegistering;
      errorMessage = '';
      successMessage = '';
    }
    
    function handleLogout() {
      signOut();
      successMessage = 'Logged out successfully';
    }
    
    function startEditing() {
      editMode = true;
    }
    
    async function saveUserProfile() {
      if (!$currentUser) return;
      
      isLoading = true;
      errorMessage = '';
      
      try {
        const result = await updateUserProfile($currentUser.id, editableUser);
        if (result) {
          successMessage = 'Profile updated successfully';
          editMode = false;
        } else {
          errorMessage = 'Failed to update profile';
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      } finally {
        isLoading = false;
      }
    }
    
    function cancelEditing() {
      editMode = false;
      // Reset editable user to current values
      if ($userStore) {
        editableUser = { 
          name: $userStore.name || '',
          username: $userStore.username || ''
        };
      }
    }
    
    function formatDate(dateString: string): string {
      return new Date(dateString).toLocaleString();
    }
    
    function formatBoolean(value: boolean | undefined): string {
      if (value === undefined) return 'Not set';
      return value ? 'Yes' : 'No';
    }
  </script>
  
  <div class="container">
    {#if $currentUser}
      <!-- User is logged in -->
      <div class="user-profile">
        <h1>Welcome, {$currentUser.name || $currentUser.username || 'User'}</h1>
        
        <div class="profile-completion">
          <div class="completion-bar">
            <div class="completion-progress" style="width: {$profileCompletion}%"></div>
          </div>
          <span class="completion-text">Profile completion: {$profileCompletion}%</span>
        </div>
        
        <div class="user-card">
          <div class="avatar-section">
            <div class="avatar">
              {#if $currentUser.avatar}
                <img src={$currentUser.avatar} alt="User avatar" />
              {:else}
                <div class="avatar-placeholder">
                  {($currentUser.name || $currentUser.username || 'User').charAt(0).toUpperCase()}
                </div>
              {/if}
            </div>
            
            {#if !editMode}
              <button class="small-button" on:click={startEditing}>
                Edit Profile
              </button>
            {/if}
          </div>
          
          <div class="user-details">
            {#if editMode}
              <div class="edit-form">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input 
                    type="text" 
                    id="username" 
                    bind:value={editableUser.username} 
                    placeholder="Enter username"
                  />
                </div>
                
                <div class="form-group">
                  <label for="name">Full Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    bind:value={editableUser.name} 
                    placeholder="Enter your name"
                  />
                </div>
                
                <div class="edit-actions">
                  <button class="primary-button" on:click={saveUserProfile} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button class="secondary-button" on:click={cancelEditing}>
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <h2>Basic Information</h2>
              <div class="detail-item">
                <span class="label">Username:</span>
                <span class="value">{$currentUser.username || 'Not set'}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Name:</span>
                <span class="value">{$currentUser.name || 'Not set'}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Email:</span>
                <span class="value">{$currentUser.email}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Email Visibility:</span>
                <span class="value">{formatBoolean($currentUser.emailVisibility)}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Verified:</span>
                <span class="value">{formatBoolean($currentUser.verified)}</span>
              </div>
              
              <h2>Preferences</h2>
              <div class="detail-item">
                <span class="label">Theme:</span>
                <span class="value">{$currentUser.themePreference || 'Default'}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Language:</span>
                <span class="value">{$currentUser.languagePreference || 'Default'}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Timezone:</span>
                <span class="value">{$currentUser.timezone || 'Not set'}</span>
              </div>
              
              <h2>Security</h2>
              <div class="detail-item">
                <span class="label">Two-Factor Verified:</span>
                <span class="value">{formatBoolean($currentUser.factorValidated)}</span>
              </div>
              
              <h2>Account Information</h2>
              <div class="detail-item">
                <span class="label">Created:</span>
                <span class="value">{formatDate($currentUser.created)}</span>
              </div>
              
              <div class="detail-item">
                <span class="label">Last Updated:</span>
                <span class="value">{formatDate($currentUser.updated)}</span>
              </div>
            {/if}
          </div>
        </div>
        
        {#if !editMode}
          <div class="account-actions">
            <a href="/tracking" class="primary-button">
              Go to Time Tracking
            </a>
            
            <button class="secondary-button" on:click={handleLogout}>
              Log Out
            </button>
          </div>
        {/if}
        
        {#if errorMessage}
          <div class="error-message">{errorMessage}</div>
        {/if}
        
        {#if successMessage}
          <div class="success-message">{successMessage}</div>
        {/if}
      </div>
    {:else}
      <!-- User is not logged in -->
      <div class="auth-container">
        <h1>{isRegistering ? 'Create Account' : 'Sign In'}</h1>
        
        {#if !isConnected}
          <div class="error-message">
            <p>{errorMessage}</p>
            <p>Make sure PocketBase is running at http://127.0.0.1:8090</p>
          </div>
        {:else}
          <form on:submit|preventDefault={handleSubmit} class="auth-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                bind:value={email} 
                required 
                class:invalid={email && !isEmailValid}
              />
              {#if email && !isEmailValid}
                <div class="validation-message">Please enter a valid email address</div>
              {/if}
            </div>
            
            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                bind:value={password} 
                required
                class:invalid={password && !isPasswordValid}
              />
              {#if password && !isPasswordValid}
                <div class="validation-message">Password must be at least 8 characters</div>
              {/if}
            </div>
            
            {#if isRegistering}
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  bind:value={confirmPassword} 
                  required
                  class:invalid={confirmPassword && !passwordsMatch}
                />
                {#if confirmPassword && !passwordsMatch}
                  <div class="validation-message">Passwords do not match</div>
                {/if}
              </div>
            {/if}
            
            {#if errorMessage}
              <div class="error-message">{errorMessage}</div>
            {/if}
            
            {#if successMessage}
              <div class="success-message">{successMessage}</div>
            {/if}
            
            <button 
              type="submit" 
              class="primary-button" 
              disabled={!isFormValid || isLoading}
            >
              {#if isLoading}
                Loading...
              {:else}
                {isRegistering ? 'Create Account' : 'Sign In'}
              {/if}
            </button>
          </form>
          
          <div class="form-switch">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button on:click={toggleForm} class="text-button">
              {isRegistering ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <style lang="scss">
    .container {
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    h1 {
      font-size: 1.8rem;
      margin-bottom: 20px;
      font-weight: 500;
      text-align: center;
    }
    
    h2 {
      font-size: 1.2rem;
      margin: 25px 0 15px;
      padding-bottom: 5px;
      border-bottom: 1px solid #333;
      color: #ccc;
    }
    
    .auth-container {
      background-color: #252525;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    label {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    input {
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #444;
      background-color: #333;
      color: #eee;
      font-size: 1rem;
    }
    
    input:focus {
      outline: none;
      border-color: #0066cc;
    }
    
    input.invalid {
      border-color: #e74c3c;
    }
    
    .validation-message {
      font-size: 0.8rem;
      color: #e74c3c;
    }
    
    .error-message {
      background-color: rgba(231, 76, 60, 0.2);
      color: #e74c3c;
      padding: 12px;
      border-radius: 6px;
      margin: 15px 0;
      font-size: 0.9rem;
    }
    
    .success-message {
      background-color: rgba(46, 204, 113, 0.2);
      color: #2ecc71;
      padding: 12px;
      border-radius: 6px;
      margin: 15px 0;
      font-size: 0.9rem;
      text-align: center;
    }
    
    .primary-button {
      background-color: #0066cc;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      text-align: center;
      text-decoration: none;
      display: block;
    }
    
    .primary-button:hover {
      background-color: #0055bb;
    }
    
    .primary-button:disabled {
      background-color: #555;
      cursor: not-allowed;
    }
    
    .secondary-button {
      background-color: #333;
      color: #eee;
      border: 1px solid #555;
      padding: 12px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .secondary-button:hover {
      background-color: #444;
    }
    
    .small-button {
      background-color: #333;
      color: #eee;
      border: 1px solid #555;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: 10px;
    }
    
    .small-button:hover {
      background-color: #444;
    }
    
    .text-button {
      background: none;
      border: none;
      color: #0066cc;
      font-size: inherit;
      padding: 0;
      margin: 0;
      cursor: pointer;
    }
    
    .text-button:hover {
      text-decoration: underline;
    }
    
    .form-switch {
      margin-top: 20px;
      text-align: center;
      font-size: 0.9rem;
    }
    
    /* User Profile Styles */
    .user-profile {
      background-color: #252525;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .profile-completion {
      margin-bottom: 30px;
      
      .completion-bar {
        width: 100%;
        height: 8px;
        background-color: #333;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .completion-progress {
        height: 100%;
        background-color: #0066cc;
        transition: width 0.5s ease-in-out;
      }
      
      .completion-text {
        font-size: 0.8rem;
        color: #aaa;
      }
    }
    
    .user-card {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .avatar {
      width: 100px;
      height: 100px;
    }
    
    .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #0066cc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      color: white;
      font-weight: bold;
    }
    
    .user-details {
      flex: 1;
    }
    
    .detail-item {
      margin-bottom: 10px;
      display: flex;
      flex-wrap: wrap;
    }
    
    .label {
      font-weight: 500;
      color: #aaa;
      width: 160px;
    }
    
    .value {
      color: #eee;
      flex: 1;
    }
    
    .account-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 30px;
    }
    
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .edit-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 20px;
    }
  </style>