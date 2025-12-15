import type { WebSocket } from "ws";

const rooms = new Map<string, Set<WebSocket>>();

export function addClient(roomId: string, ws: WebSocket) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId)!.add(ws);
  ws.on("close", () => {
    rooms.get(roomId)?.delete(ws);
    if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
  });
}

export function broadcastToRoom(roomId: string, payload: unknown) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

