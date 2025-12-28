import type { OpenAPIV3 } from "openapi-types";

export const openApiDoc: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "MiddleChalant Escrow API",
    version: "1.0.0",
    description: "Decentralized P2P escrow system API for secure transactions between buyers and sellers",
  },
  servers: [
    {
      url: "http://localhost:8787",
      description: "Development server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication endpoints (BetterAuth)" },
    { name: "Rooms", description: "Escrow room management" },
    { name: "Messages", description: "Room chat messages" },
    { name: "Escrows", description: "On-chain escrow tracking" },
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        summary: "Sign up with email and password",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "User created successfully" },
          "400": { description: "Invalid input" },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        summary: "Sign in with email and password",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Signed in successfully" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        summary: "Sign out",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Signed out successfully" },
        },
      },
    },
    "/api/auth/get-session": {
      get: {
        summary: "Get current session",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Session data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    session: { $ref: "#/components/schemas/Session" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/api/rooms": {
      get: {
        summary: "Get all rooms",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
            description: "Maximum number of rooms to return",
          },
        ],
        responses: {
          "200": {
            description: "List of rooms",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Room" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create a new room",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRoomRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Room created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Room" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}": {
      get: {
        summary: "Get room by ID",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Room details with participants",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/RoomWithParticipants" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Room not found" },
        },
      },
    },
    "/api/rooms/{roomId}/join": {
      post: {
        summary: "Join a room as buyer or seller",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/JoinRoomRequest" },
            },
          },
        },
        responses: {
          "200": { description: "Joined room successfully" },
          "400": { description: "Invalid request or role taken" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/participants": {
      get: {
        summary: "Get room participants",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "List of participants",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Participant" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Room not found" },
        },
      },
    },
    "/api/rooms/{roomId}/messages": {
      get: {
        summary: "Get messages in a room",
        tags: ["Messages"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description: "Pagination cursor (message ID)",
          },
        ],
        responses: {
          "200": {
            description: "List of messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Message" },
                    },
                    hasMore: { type: "boolean" },
                    cursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Send a message in a room",
        tags: ["Messages"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Message sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Message" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/escrows/by-address": {
      get: {
        summary: "Get escrows by user address",
        tags: ["Escrows"],
        parameters: [
          {
            name: "address",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Ethereum wallet address",
          },
        ],
        responses: {
          "200": {
            description: "List of escrows",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Escrow" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid address" },
        },
      },
    },
    "/api/escrows/{chainId}/{escrowAddress}": {
      get: {
        summary: "Get escrow by chain and address",
        tags: ["Escrows"],
        parameters: [
          {
            name: "chainId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "escrowAddress",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Escrow details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Escrow" },
                  },
                },
              },
            },
          },
          "404": { description: "Escrow not found" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "escrow.session_token",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          walletAddress: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
        },
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          chainId: { type: "integer" },
          tokenAddress: { type: "string" },
          amount: { type: "string" },
          factoryAddress: { type: "string", nullable: true },
          escrowAddress: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["AWAITING_DEPOSIT", "FUNDED", "RELEASED", "REFUNDED", "CANCELED"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RoomWithParticipants: {
        allOf: [
          { $ref: "#/components/schemas/Room" },
          {
            type: "object",
            properties: {
              participants: {
                type: "array",
                items: { $ref: "#/components/schemas/Participant" },
              },
            },
          },
        ],
      },
      Participant: {
        type: "object",
        properties: {
          id: { type: "string" },
          roomId: { type: "string" },
          address: { type: "string" },
          role: { type: "string", enum: ["buyer", "seller"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          roomId: { type: "string" },
          sender: { type: "string" },
          text: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Escrow: {
        type: "object",
        properties: {
          id: { type: "string" },
          chainId: { type: "integer" },
          escrowAddress: { type: "string" },
          buyer: { type: "string" },
          seller: { type: "string" },
          token: { type: "string" },
          amount: { type: "string" },
          feeBps: { type: "integer" },
          status: {
            type: "string",
            enum: ["AWAITING_DEPOSIT", "FUNDED", "RELEASED", "REFUNDED", "CANCELED"],
          },
          lastTxHash: { type: "string", nullable: true },
          lastBlockNumber: { type: "string", nullable: true },
        },
      },
      CreateRoomRequest: {
        type: "object",
        required: ["name", "chainId", "tokenAddress", "amount"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          chainId: { type: "integer" },
          tokenAddress: { type: "string" },
          amount: { type: "string" },
          buyerAddress: { type: "string" },
          sellerAddress: { type: "string" },
        },
      },
      JoinRoomRequest: {
        type: "object",
        required: ["address", "role"],
        properties: {
          address: { type: "string" },
          role: { type: "string", enum: ["buyer", "seller"] },
        },
      },
      SendMessageRequest: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", minLength: 1, maxLength: 2000 },
        },
      },
    },
  },
};
