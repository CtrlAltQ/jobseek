import { JobPosting, AgentLog } from './types';
import { invalidateCache } from './cache';

// Event types for real-time updates
export type RealtimeEvent = 
  | { type: 'jobs_updated'; data: { count: number; newJobs: JobPosting[] } }
  | { type: 'job_status_changed'; data: { jobId: string; status: JobPosting['status'] } }
  | { type: 'agent_status_changed'; data: { agentId: string; status: AgentLog['status'] } }
  | { type: 'settings_updated'; data: { timestamp: Date } }
  | { type: 'system_health'; data: { status: 'healthy' | 'degraded' | 'down' } }
  | { type: 'heartbeat'; data: { timestamp: Date } };

export type RealtimeEventHandler = (event: RealtimeEvent) => void;

class RealtimeManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<RealtimeEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.connect();
      
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
          this.connect();
        } else if (document.visibilityState === 'hidden') {
          this.disconnect();
        }
      });

      // Handle online/offline events
      window.addEventListener('online', () => {
        if (!this.isConnected) {
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.disconnect();
      });
    }
  }

  // Connect to the SSE endpoint
  private connect(): void {
    if (this.eventSource || typeof window === 'undefined') {
      return;
    }

    try {
      this.eventSource = new EventSource('/api/realtime');
      
      this.eventSource.onopen = () => {
        console.log('Real-time connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeatMonitor();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (error) {
          console.warn('Failed to parse real-time event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.warn('Real-time connection error:', error);
        this.isConnected = false;
        this.stopHeartbeatMonitor();
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
      this.scheduleReconnect();
    }
  }

  // Disconnect from SSE
  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.stopHeartbeatMonitor();
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.disconnect();
      this.connect();
    }, delay);
  }

  // Handle incoming events
  private handleEvent(event: RealtimeEvent): void {
    // Update last heartbeat
    if (event.type === 'heartbeat') {
      this.lastHeartbeat = new Date(event.data.timestamp);
    }

    // Invalidate relevant caches based on event type
    switch (event.type) {
      case 'jobs_updated':
      case 'job_status_changed':
        invalidateCache.jobs();
        break;
      case 'agent_status_changed':
        invalidateCache.agentStatus();
        break;
      case 'settings_updated':
        invalidateCache.settings();
        break;
    }

    // Notify all handlers
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in real-time event handler:', error);
      }
    });
  }

  // Start monitoring heartbeat
  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeSinceLastHeartbeat = this.lastHeartbeat 
        ? now.getTime() - this.lastHeartbeat.getTime()
        : Infinity;

      // If no heartbeat for 30 seconds, consider connection stale
      if (timeSinceLastHeartbeat > 30000) {
        console.warn('Heartbeat timeout, reconnecting...');
        this.disconnect();
        this.connect();
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop heartbeat monitoring
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Subscribe to real-time events
  subscribe(handler: RealtimeEventHandler): () => void {
    this.handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  // Get connection status
  getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    lastHeartbeat: Date | null;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  // Manually trigger reconnection
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  // Clean up resources
  destroy(): void {
    this.disconnect();
    this.handlers.clear();
  }
}

// Create singleton instance
export const realtimeManager = new RealtimeManager();

// Convenience hooks for common event types
export const useRealtimeJobs = (handler: (event: { type: 'jobs_updated' | 'job_status_changed'; data: any }) => void) => {
  return realtimeManager.subscribe((event) => {
    if (event.type === 'jobs_updated' || event.type === 'job_status_changed') {
      handler(event);
    }
  });
};

export const useRealtimeAgents = (handler: (event: { type: 'agent_status_changed'; data: any }) => void) => {
  return realtimeManager.subscribe((event) => {
    if (event.type === 'agent_status_changed') {
      handler(event);
    }
  });
};

export const useRealtimeSettings = (handler: (event: { type: 'settings_updated'; data: any }) => void) => {
  return realtimeManager.subscribe((event) => {
    if (event.type === 'settings_updated') {
      handler(event);
    }
  });
};