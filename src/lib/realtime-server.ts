// Server-side real-time utilities
const connections = new Set<ReadableStreamDefaultController>();

// Broadcast event to all connected clients
export function broadcastEvent(event: {
  type: string;
  data: any;
}) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Remove failed connections
      connections.delete(controller);
    }
  });
}

// Add connection
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

// Remove connection
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

// Broadcast job status change
export function broadcastJobStatusChange(data: { jobId: string; status: string }) {
  broadcastEvent({
    type: 'job_status_changed',
    data
  });
}

// Broadcast new jobs
export function broadcastNewJobs(data: { count: number; jobs: any[] }) {
  broadcastEvent({
    type: 'new_jobs',
    data
  });
}

// Broadcast agent status
export function broadcastAgentStatus(data: any) {
  broadcastEvent({
    type: 'agent_status',
    data
  });
}

// Utility function to broadcast job updates (can be called from other API routes)
export function broadcastJobUpdate(data: {
  count: number;
  newJobs: any[];
}) {
  broadcastEvent({
    type: 'jobs_updated',
    data
  });
}

// Utility function to broadcast agent status changes
export function broadcastAgentStatusChange(data: {
  agentId: string;
  status: string;
}) {
  broadcastEvent({
    type: 'agent_status_changed',
    data
  });
}

// Utility function to broadcast settings updates
export function broadcastSettingsUpdate() {
  broadcastEvent({
    type: 'settings_updated',
    data: { timestamp: new Date() }
  });
}