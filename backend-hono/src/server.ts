import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "@/routes/auth";
import { roomsRouter } from "@/routes/rooms";
import { runIndexerOnce } from "@/indexer/indexer";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getSession } from "@/auth/siwe";
import { WebSocketServer } from "ws";
import { addClient, broadcastToRoom } from "@/ws/hub";

const app = new Hono();

app.use("*", cors({ origin: "http://localhost:3000", credentials: true }));
app.use("*", logger());

// Simple session loader middleware
const sessionMiddleware = createMiddleware(async (c, next) => {
  const sid = getCookie(c, "sid");
  const session = await getSession(sid);
  if (session) c.set("address", session.address);
  await next();
});

app.use("/api/*", sessionMiddleware);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/auth", authRouter);
app.route("/api/rooms", roomsRouter);

// Minimal WS server for room chat broadcast
const server = serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 8787),
  websocket: {
    open(ws) {
      // no-op; handshake handled in upgrade below
    },
  },
});

const wss = new WebSocketServer({ noServer: true });

// Handle upgrade for /ws/rooms/:roomId
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

// Broadcast hook after REST message creation (in-memory)
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

// Periodic indexer (best effort placeholder)
setInterval(() => {
  runIndexerOnce().catch((e) => console.error("indexer error", e));
}, 30_000);

console.log("API server running on", process.env.PORT || 8787);

// Export for tests
export default app;

