
<script lang="ts">
    import { onMount } from 'svelte';
    
    type TimeEntry = {
      id: string;
      project: string;
      category: string;
      tags: string[];
      duration: string;
      timeRange: string;
      label?: string;
    };
    
    // Sample time tracking data
    const timeEntries: TimeEntry[] = [
      {
        id: '1',
        project: '3DP',
        category: 'Task',
        tags: ['maintain', 'debug'],
        duration: '00:52',
        timeRange: '17:10 - 18:02'
      },
      {
        id: '2',
        project: 'Studio',
        category: 'Task',
        tags: ['reset'],
        duration: '00:16',
        timeRange: '16:54 - 17:10'
      },
      {
        id: '3', 
        project: 'Kauppa',
        category: 'Finance',
        tags: [],
        duration: '00:02',
        timeRange: '16:38 - 16:41',
        label: '$'
      },
      {
        id: '4',
        project: 'Contact',
        category: 'Social',
        tags: [],
        duration: '00:03',
        timeRange: '15:00 - 15:03',
        label: '+'
      },
      {
        id: '5',
        project: 'Huoneisto',
        category: 'Task',
        tags: [],
        duration: '00:50',
        timeRange: '14:08 - 14:59'
      },
      {
        id: '6',
        project: 'Startup',
        category: 'Career',
        tags: ['commit'],
        duration: '00:31',
        timeRange: '0:34 - 1:06',
        label: '◎'
      },
      {
        id: '7',
        project: 'Host',
        category: 'Social',
        tags: ['sync'],
        duration: '00:24',
        timeRange: '0:00 - 0:24',
        label: '+'
      }
    ];
    
    // Group by days - in a real app this would be more dynamic
    const today = new Date();
    
    function getProjectIcon(project: string): string {
      const icons: {[key: string]: string} = {
        '3DP': '🖨️',
        'Studio': '🎨',
        'Kauppa': '🏪',
        'Contact': '💬',
        'Huoneisto': '🏠',
        'Startup': '🚀',
        'Host': '🌐',
        'Career': '👔'
      };
      
      return icons[project] || '📝';
    }
    
    function getCategoryColor(category: string): string {
      const colors: {[key: string]: string} = {
        'Task': '#4a90e2',
        'Finance': '#f5c400',
        'Social': '#e74c3c',
        'Career': '#2ecc71'
      };
      
      return colors[category] || '#ccc';
    }
    
    let totalTime = '03:06';
  </script>
  
  <div class="time-tracking-page">
    <h1>Time tracking</h1>
    
    <div class="day-container">
      <div class="day-header">
        <h2>Mon, 7. Apr 2025</h2>
        <div class="day-total">{totalTime}</div>
      </div>
      
      <div class="entries-list">
        {#each timeEntries as entry}
          <div class="time-entry">
            <div class="entry-icon">
              {getProjectIcon(entry.project)}
            </div>
            
            <div class="entry-details">
              <div class="entry-title">
                <span class="project-name">{entry.project}</span>
                {#if entry.label}
                  <span class="entry-label">{entry.label}</span>
                {/if}
                <span class="entry-separator">•</span>
                <span class="entry-category" style="color: {getCategoryColor(entry.category)}">
                  {entry.category}
                </span>
              </div>
              
              <div class="entry-tags">
                {#each entry.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            </div>
            
            <div class="entry-time">
              <div class="duration">{entry.duration}</div>
              <div class="time-range">{entry.timeRange}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="collapsed-days">
      <div class="collapsed-day">
        <button class="collapse-btn">
          <span class="collapse-arrow">▼</span>
          Sun, 6. Apr 2025
        </button>
        <span class="day-total">10:02</span>
      </div>
      
      <div class="collapsed-day">
        <button class="collapse-btn">
          <span class="collapse-arrow">▼</span>
          Sat, 5. Apr 2025
        </button>
        <span class="day-total">06:40</span>
      </div>
      
      <div class="collapsed-day">
        <button class="collapse-btn">
          <span class="collapse-arrow">▼</span>
          Fri, 4. Apr 2025
        </button>
        <span class="day-total">10:55</span>
      </div>
      
      <div class="collapsed-day">
        <button class="collapse-btn">
          <span class="collapse-arrow">▼</span>
          Thu, 3. Apr 2025
        </button>
        <span class="day-total">02:10</span>
      </div>
    </div>
  </div>
  
  <style>
    .time-tracking-page {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    h1 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      font-weight: 500;
    }
    
    .day-container {
      margin-bottom: 20px;
    }
    
    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }
    
    h2 {
      font-size: 1rem;
      font-weight: 500;
      margin: 0;
    }
    
    .day-total {
      font-weight: 600;
      font-size: 1rem;
    }
    
    .entries-list {
      display: flex;
      flex-direction: column;
    }
    
    .time-entry {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid #333;
      align-items: center;
    }
    
    .entry-icon {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 1.2rem;
    }
    
    .entry-details {
      flex: 1;
    }
    
    .entry-title {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .project-name {
      font-weight: 500;
    }
    
    .entry-label {
      margin-left: 5px;
      opacity: 0.8;
    }
    
    .entry-separator {
      margin: 0 5px;
      opacity: 0.5;
    }
    
    .entry-category {
      font-size: 0.9em;
    }
    
    .entry-tags {
      display: flex;
      gap: 5px;
    }
    
    .tag {
      background-color: #333;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    .entry-time {
      text-align: right;
      min-width: 120px;
    }
    
    .duration {
      font-weight: 500;
      font-size: 1rem;
    }
    
    .time-range {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    
    .collapsed-days {
      display: flex;
      flex-direction: column;
    }
    
    .collapsed-day {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #333;
    }
    
    .collapse-btn {
      background: none;
      border: none;
      color: #ccc;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 0;
    }
    
    .collapse-arrow {
      margin-right: 10px;
      font-size: 0.7rem;
    }
  </style>