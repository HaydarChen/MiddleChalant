import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { WebSocketServer } from "ws";
import { apiRouter } from "@/routes";
import { sessionMiddleware, errorHandler } from "@/middlewares";
import { addClient } from "@/ws/hub";
import { runIndexerOnce } from "@/indexer/indexer";

// ============ App Setup ============

const app = new Hono();

// Global middlewares
app.use("*", cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));
app.use("*", logger());

// Session middleware for all API routes
app.use("/api/*", sessionMiddleware);

// Error handler
app.onError(errorHandler);

// Mount API routes
app.route("/api", apiRouter);

// ============ Server Setup ============

const PORT = Number(process.env.PORT || 8787);

const server = serve({
  fetch: app.fetch,
  port: PORT,
});

// ============ WebSocket Setup ============

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "", `http://${request.headers.host}`);

  if (!url.pathname.startsWith("/ws/rooms/")) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const roomId = url.pathname.split("/ws/rooms/")[1];
    addClient(roomId, ws);
  });
});

// ============ Background Tasks ============

// Periodic indexer (best effort placeholder)
const INDEXER_INTERVAL = 30_000; // 30 seconds

setInterval(() => {
  runIndexerOnce().catch((e) => console.error("[Indexer Error]", e));
}, INDEXER_INTERVAL);

// ============ Startup ============

console.log(`[Server] Running on http://localhost:${PORT}`);
console.log(`[Server] WebSocket available at ws://localhost:${PORT}/ws/rooms/:roomId`);

export default app;
