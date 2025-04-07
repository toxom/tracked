<script lang="ts">
    import { page } from '$app/stores';
    import { navigating } from '$app/stores';
    import { onMount, afterUpdate } from 'svelte';
    import { headerControls } from '$lib/stores/headerControlsStore';
    
    // Active route tracking
    $: activeRoute = $page.url.pathname;
    
    // Sidebar navigation items
    const navItems = [
      { icon: '⏱️', label: 'User', path: '/' },
      { icon: '⏱️', label: 'Time tracking', path: '/tracking' },
      { icon: '📋', label: 'Tasks', path: '/tasks' },
      { icon: '🏷️', label: 'Tags', path: '/tags' },
      { icon: '🔍', label: 'Projects', path: '/projects' },
      { icon: '🔍', label: 'People', path: '/people' },
      { icon: '📊', label: 'Analytics', path: '/analytics' },
      { icon: '📤', label: 'Export', path: '/export' },
    ];
    
    const bottomNavItems = [
      { icon: '🔄', label: 'Sync now', path: '/sync' },
      { icon: '❓', label: 'Help', path: '/help' },
      { icon: '⚙️', label: 'Settings', path: '/settings' },
    ];
    
    let currentDateTime = new Date();
    let lastNavigationPath = '';
    
    // Debug navigation changes
    $: if ($navigating) {
      console.log('Navigating from:', $navigating.from?.url.pathname, 'to:', $navigating.to?.url.pathname);
      lastNavigationPath = $navigating.to?.url.pathname || '';
    }
    
    // Track page changes
    $: if (activeRoute && activeRoute !== lastNavigationPath) {
      console.log('Route changed to:', activeRoute);
    }
    
    onMount(() => {
      console.log('Layout mounted, initial path:', activeRoute);
      const timer = setInterval(() => {
        currentDateTime = new Date();
      }, 1000);
      
      return () => {
        clearInterval(timer);
      };
    });
    
    afterUpdate(() => {
      console.log('Layout updated, current path:', activeRoute);
    });
    
    function formatTime(date: Date): string {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  </script>
  
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="traffic-lights">
        <div class="light red"></div>
        <div class="light yellow"></div>
        <div class="light green"></div>
      </div>
      
      <nav class="main-nav">
        {#each navItems as item}
          <a 
            href={item.path} 
            class="nav-item {activeRoute === item.path ? 'active' : ''}"
            data-sveltekit-preload-data="hover"
            data-sveltekit-noscroll
          >
            <span class="icon">{item.icon}</span>
            <span class="label">{item.label}</span>
          </a>
        {/each}
      </nav>
      
      <div class="nav-bottom">
        {#each bottomNavItems as item}
          <a 
            href={item.path} 
            class="nav-item {activeRoute === item.path ? 'active' : ''}"
            data-sveltekit-preload-data="hover"
            data-sveltekit-noscroll
          >
            <span class="icon">{item.icon}</span>
            <span class="label">{item.label}</span>
          </a>
        {/each}
      </div>
    </aside>
    
    <!-- Main content -->
    <main class="main-content">
      <header class="header">
        <div class="header-controls">
          {#each $headerControls as control}
            <button 
              class="control-btn" 
              title={control.title} 
              on:click={control.action}
            >
              {control.icon}
            </button>
          {/each}
        </div>
        <div class="date-display">
          {currentDateTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <div class="time-display">
          {formatTime(currentDateTime)}
        </div>
      </header>
      
      <div class="content">
        {#key activeRoute}
          <slot />
        {/key}
      </div>
    </main>
  </div>
  
  <style>
    :global(body, html) {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      height: 100%;
      overflow: hidden;
    }
    
    :global(body) {
      background-color: #1e1e1e;
      color: #eee;
    }
    
    .app-container {
      display: flex;
      height: 100vh;
      width: 100vw;
    }
    
    .sidebar {
      width: 200px;
      background-color: #252525;
      border-right: 1px solid #333;
      display: flex;
      flex-direction: column;
      padding-top: 12px;
    }
    
    .traffic-lights {
      display: flex;
      padding: 0 10px 20px;
      gap: 8px;
    }
    
    .light {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .red { background-color: #ff5f57; }
    .yellow { background-color: #febc2e; }
    .green { background-color: #28c840; }
    
    .main-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 0 10px;
    }
    
    .nav-bottom {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 20px 10px;
      border-top: 1px solid #333;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      text-decoration: none;
      color: #ccc;
      border-radius: 6px;
      transition: background-color 0.2s;
    }
    
    .nav-item:hover {
      background-color: #333;
    }
    
    .nav-item.active {
      background-color: #0066cc;
      color: white;
    }
    
    .icon {
      margin-right: 10px;
      width: 20px;
      text-align: center;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .header {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #333;
      background-color: #222;
    }
    
    .header-controls {
      display: flex;
      gap: 10px;
    }
    
    .control-btn {
      background: none;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #333;
      color: #eee;
      cursor: pointer;
    }
    
    .control-btn:hover {
      background-color: #444;
    }
    
    .date-display {
      margin-left: 20px;
      font-weight: 500;
      flex: 1;
    }
    
    .time-display {
      font-weight: bold;
      font-size: 1.1em;
    }
    
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
  </style>