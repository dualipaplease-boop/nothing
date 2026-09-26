import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Smart Campus Parking Realtime Hub' }));

    ws.on('error', (err: any) => console.error('WebSocket client error:', err));
  });

  console.log('WebSocket server initialized on /ws');
}

export function broadcastEvent(type: string, payload: any) {
  if (!wss) return;

  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
