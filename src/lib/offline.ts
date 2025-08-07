import { JobPosting, UserSettings } from './types';
import { cache } from './cache';

// Offline storage keys
const OFFLINE_KEYS = {
  JOBS: 'offline_jobs',
  SETTINGS: 'offline_settings',
  PENDING_ACTIONS: 'offline_pending_actions',
  LAST_SYNC: 'offline_last_sync',
} as const;

// Types for offline functionality
interface PendingAction {
  id: string;
  type: 'update_job_status' | 'update_settings' | 'delete_job';
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface OfflineData {
  jobs: JobPosting[];
  settings: UserSettings | null;
  lastSync: Date;
}

class OfflineManager {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pendingActions: PendingAction[] = [];
  private syncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load pending actions from storage
      this.loadPendingActions();

      // Set up online/offline event listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      // Periodic sync when online
      setInterval(() => {
        if (this.isOnline && !this.syncInProgress) {
          this.syncPendingActions();
        }
      }, 30000); // Every 30 seconds
    }
  }

  // Handle coming online
  private handleOnline(): void {
    console.log('Connection restored, syncing pending actions...');
    this.isOnline = true;
    this.syncPendingActions();
  }

  // Handle going offline
  private handleOffline(): void {
    console.log('Connection lost, enabling offline mode...');
    this.isOnline = false;
  }

  // Store data for offline access
  storeOfflineData(data: Partial<OfflineData>): void {
    try {
      if (data.jobs) {
        cache.set(OFFLINE_KEYS.JOBS, data.jobs, 24 * 60 * 60 * 1000); // 24 hours
      }
      if (data.settings) {
        cache.set(OFFLINE_KEYS.SETTINGS, data.settings, 24 * 60 * 60 * 1000);
      }
      if (data.lastSync) {
        cache.set(OFFLINE_KEYS.LAST_SYNC, data.lastSync, 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  // Get offline data
  getOfflineData(): OfflineData {
    return {
      jobs: cache.get<JobPosting[]>(OFFLINE_KEYS.JOBS) || [],
      settings: cache.get<UserSettings>(OFFLINE_KEYS.SETTINGS) || null,
      lastSync: cache.get<Date>(OFFLINE_KEYS.LAST_SYNC) || new Date(0),
    };
  }

  // Add action to pending queue
  addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): string {
    const pendingAction: PendingAction = {
      ...action,
      id: this.generateActionId(),
      timestamp: new Date(),
      retryCount: 0,
    };

    this.pendingActions.push(pendingAction);
    this.savePendingActions();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions();
    }

    return pendingAction.id;
  }

  // Load pending actions from storage
  private loadPendingActions(): void {
    try {
      const stored = cache.get<PendingAction[]>(OFFLINE_KEYS.PENDING_ACTIONS);
      if (stored) {
        this.pendingActions = stored;
      }
    } catch (error) {
      console.warn('Failed to load pending actions:', error);
      this.pendingActions = [];
    }
  }

  // Save pending actions to storage
  private savePendingActions(): void {
    try {
      cache.set(OFFLINE_KEYS.PENDING_ACTIONS, this.pendingActions, 7 * 24 * 60 * 60 * 1000); // 7 days
    } catch (error) {
      console.warn('Failed to save pending actions:', error);
    }
  }

  // Sync pending actions when online
  private async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`Syncing ${this.pendingActions.length} pending actions...`);

    const actionsToSync = [...this.pendingActions];
    const successfulActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        await this.executeAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.warn(`Failed to sync action ${action.id}:`, error);
        
        // Increment retry count
        action.retryCount++;
        
        // Remove action if it has failed too many times
        if (action.retryCount >= 5) {
          console.error(`Removing action ${action.id} after 5 failed attempts`);
          successfulActions.push(action.id);
        }
      }
    }

    // Remove successful actions
    this.pendingActions = this.pendingActions.filter(
      action => !successfulActions.includes(action.id)
    );

    this.savePendingActions();
    this.syncInProgress = false;

    if (successfulActions.length > 0) {
      console.log(`Successfully synced ${successfulActions.length} actions`);
    }
  }

  // Execute a pending action
  private async executeAction(action: PendingAction): Promise<void> {
    const { jobsApi, settingsApi } = await import('@/lib/api-client');

    switch (action.type) {
      case 'update_job_status':
        await jobsApi.updateJobStatus(action.data.jobId, action.data.status);
        break;
      
      case 'update_settings':
        await settingsApi.updateSettings(action.data);
        break;
      
      case 'delete_job':
        await jobsApi.deleteJob(action.data.jobId);
        break;
      
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  // Generate unique action ID
  private generateActionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get offline status
  getStatus(): {
    isOnline: boolean;
    pendingActions: number;
    lastSync: Date;
    syncInProgress: boolean;
  } {
    const offlineData = this.getOfflineData();
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.length,
      lastSync: offlineData.lastSync,
      syncInProgress: this.syncInProgress,
    };
  }

  // Clear all offline data
  clearOfflineData(): void {
    cache.remove(OFFLINE_KEYS.JOBS);
    cache.remove(OFFLINE_KEYS.SETTINGS);
    cache.remove(OFFLINE_KEYS.PENDING_ACTIONS);
    cache.remove(OFFLINE_KEYS.LAST_SYNC);
    this.pendingActions = [];
  }

  // Force sync
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.syncPendingActions();
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Offline-aware API wrappers
export const offlineJobsApi = {
  async updateJobStatus(jobId: string, status: JobPosting['status']): Promise<void> {
    if (offlineManager.getStatus().isOnline) {
      // Try online first
      try {
        const { jobsApi } = await import('@/lib/api-client');
        await jobsApi.updateJobStatus(jobId, status);
        return;
      } catch (error) {
        console.warn('Online update failed, queuing for offline sync:', error);
      }
    }

    // Queue for offline sync
    offlineManager.addPendingAction({
      type: 'update_job_status',
      data: { jobId, status },
    });

    // Update local cache optimistically
    const offlineData = offlineManager.getOfflineData();
    const updatedJobs = offlineData.jobs.map(job =>
      job._id === jobId ? { ...job, status, updatedAt: new Date() } : job
    );
    offlineManager.storeOfflineData({ jobs: updatedJobs });
  },

  async deleteJob(jobId: string): Promise<void> {
    if (offlineManager.getStatus().isOnline) {
      try {
        const { jobsApi } = await import('@/lib/api-client');
        await jobsApi.deleteJob(jobId);
        return;
      } catch (error) {
        console.warn('Online delete failed, queuing for offline sync:', error);
      }
    }

    // Queue for offline sync
    offlineManager.addPendingAction({
      type: 'delete_job',
      data: { jobId },
    });

    // Remove from local cache optimistically
    const offlineData = offlineManager.getOfflineData();
    const updatedJobs = offlineData.jobs.filter(job => job._id !== jobId);
    offlineManager.storeOfflineData({ jobs: updatedJobs });
  },
};

export const offlineSettingsApi = {
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    if (offlineManager.getStatus().isOnline) {
      try {
        const { settingsApi } = await import('@/lib/api-client');
        const result = await settingsApi.updateSettings(settings);
        offlineManager.storeOfflineData({ settings: result });
        return result;
      } catch (error) {
        console.warn('Online settings update failed, queuing for offline sync:', error);
      }
    }

    // Queue for offline sync
    offlineManager.addPendingAction({
      type: 'update_settings',
      data: settings,
    });

    // Update local cache optimistically
    const offlineData = offlineManager.getOfflineData();
    const updatedSettings = {
      ...offlineData.settings,
      ...settings,
      updatedAt: new Date(),
    } as UserSettings;
    
    offlineManager.storeOfflineData({ settings: updatedSettings });
    return updatedSettings;
  },
};