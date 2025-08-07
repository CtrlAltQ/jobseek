import { NextRequest } from 'next/server';
import { addConnection, removeConnection, broadcastEvent } from '@/lib/realtime-server';

// Send heartbeat to all connections
function sendHeartbeat() {
  broadcastEvent({
    type: 'heartbeat',
    data: { timestamp: new Date() }
  });
}

// Set up heartbeat interval (runs once globally)
let heartbeatInterval: NodeJS.Timeout | null = null;
if (!heartbeatInterval) {
  heartbeatInterval = setInterval(sendHeartbeat, 15000); // Every 15 seconds
}

export async function GET(request: NextRequest) {
  let streamController: ReadableStreamDefaultController<any>;
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      // Add connection to active set
      addConnection(controller);
      
      // Send initial connection confirmation
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connected',
        data: { timestamp: new Date() }
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(welcomeMessage));
      
      // Send immediate heartbeat
      sendHeartbeat();
    },
    
    cancel() {
      // Remove connection when client disconnects
      removeConnection(streamController);
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

