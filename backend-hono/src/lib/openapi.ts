import type { OpenAPIV3 } from "openapi-types";

export const openApiDoc: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "MiddleChalant Escrow API",
    version: "2.0.0",
    description: "Decentralized P2P USDT escrow system with bot-driven workflow. Users create rooms, join via codes, and the bot guides them through role selection, amount agreement, fee configuration, deposit, and release/refund flows.",
  },
  servers: [
    {
      url: "http://localhost:8787",
      description: "Development server",
    },
  ],
  tags: [
    { name: "Health", description: "Health check endpoint" },
    { name: "Auth", description: "Authentication endpoints (BetterAuth)" },
    { name: "Chains", description: "Supported blockchain networks" },
    { name: "Rooms", description: "Escrow room management" },
    { name: "Messages", description: "Room chat messages" },
    { name: "Bot Actions", description: "Bot-driven workflow actions" },
    { name: "Release Flow", description: "Release funds to receiver" },
    { name: "Cancel Flow", description: "Cancel and refund to sender" },
    { name: "Escrows", description: "On-chain escrow tracking" },
    { name: "Scheduler", description: "Timeout and warning management" },
    { name: "Disputes", description: "Dispute filing and management" },
    { name: "Transactions", description: "Public transaction history" },
    { name: "Admin", description: "Admin-only endpoints" },
  ],
  paths: {
    // ============ Health ============
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

    // ============ Auth ============
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

    // ============ Chains ============
    "/api/chains": {
      get: {
        summary: "Get supported blockchain networks",
        tags: ["Chains"],
        responses: {
          "200": {
            description: "List of supported chains",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Chain" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Rooms ============
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
        description: "Creates a room and automatically joins the creator. Returns a room code for the other party to join.",
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
    "/api/rooms/my": {
      get: {
        summary: "Get my rooms",
        description: "Get all rooms where the current user is a participant",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of user's rooms",
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
    },
    "/api/rooms/join": {
      post: {
        summary: "Join a room by code",
        description: "Join an existing room using its 6-character room code",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["roomCode"],
                properties: {
                  roomCode: { type: "string", minLength: 6, maxLength: 6, example: "ABC123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Joined room successfully",
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
          "400": { description: "Invalid room code or room full" },
          "401": { description: "Unauthorized" },
          "404": { description: "Room not found" },
        },
      },
    },
    "/api/rooms/code/{roomCode}": {
      get: {
        summary: "Get room by code",
        tags: ["Rooms"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "roomCode",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Room details",
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
          "404": { description: "Room not found" },
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

    // ============ Messages ============
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

    // ============ Bot Actions - State & Info ============
    "/api/rooms/{roomId}/state": {
      get: {
        summary: "Get room state for bot",
        description: "Returns the current room state including step, confirmations, and available actions",
        tags: ["Bot Actions"],
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
            description: "Room state",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RoomState" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Room not found" },
        },
      },
    },
    "/api/rooms/{roomId}/deposit-info": {
      get: {
        summary: "Get deposit information",
        description: "Returns escrow address and amount to deposit (only available in AWAITING_DEPOSIT step)",
        tags: ["Bot Actions"],
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
            description: "Deposit information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        escrowAddress: { type: "string" },
                        amount: { type: "string" },
                        amountFormatted: { type: "string" },
                        chainId: { type: "integer" },
                        tokenAddress: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Not in deposit step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Bot Actions - Role Selection ============
    "/api/rooms/{roomId}/actions/select-role": {
      post: {
        summary: "Select role (sender or receiver)",
        description: "User selects their role in the transaction. Both users must select mutually exclusive roles.",
        tags: ["Bot Actions"],
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
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["sender", "receiver"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Role selected",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Invalid role or role already taken" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/reset-roles": {
      post: {
        summary: "Reset role selections",
        description: "Reset all role selections to start over",
        tags: ["Bot Actions"],
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
            description: "Roles reset",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Cannot reset roles in current step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Bot Actions - Amount Agreement ============
    "/api/rooms/{roomId}/actions/propose-amount": {
      post: {
        summary: "Propose deal amount",
        description: "Propose the USDT amount for the transaction (sender only)",
        tags: ["Bot Actions"],
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
              schema: {
                type: "object",
                required: ["amount"],
                properties: {
                  amount: { type: "string", example: "100.00", description: "Amount in USDT (will be converted to smallest unit)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Amount proposed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Invalid amount or not in correct step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-amount": {
      post: {
        summary: "Confirm or reject proposed amount",
        tags: ["Bot Actions"],
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
              schema: {
                type: "object",
                required: ["confirmed"],
                properties: {
                  confirmed: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Amount confirmation recorded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in correct step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Bot Actions - Fee Selection ============
    "/api/rooms/{roomId}/actions/select-fee-payer": {
      post: {
        summary: "Select who pays the fee",
        description: "Select fee payment method: sender pays, receiver pays, or split 50/50",
        tags: ["Bot Actions"],
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
              schema: {
                type: "object",
                required: ["feePayer"],
                properties: {
                  feePayer: { type: "string", enum: ["sender", "receiver", "split"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Fee payer selected",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in correct step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-fee": {
      post: {
        summary: "Confirm fee configuration",
        description: "Both parties must confirm the fee configuration",
        tags: ["Bot Actions"],
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
            description: "Fee confirmed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in correct step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Bot Actions - Deposit ============
    "/api/rooms/{roomId}/actions/check-deposit": {
      post: {
        summary: "Check for deposit",
        description: "Check if the escrow address has received the deposit",
        tags: ["Bot Actions"],
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
            description: "Deposit status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in deposit step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/mock-deposit": {
      post: {
        summary: "Mock deposit (testing only)",
        description: "Simulate a deposit for testing purposes. Not available in production.",
        tags: ["Bot Actions"],
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
            description: "Mock deposit created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in deposit step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Release Flow ============
    "/api/rooms/{roomId}/actions/initiate-release": {
      post: {
        summary: "Initiate release",
        description: "Sender initiates the release of funds to receiver",
        tags: ["Release Flow"],
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
            description: "Release initiated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in funded step or not sender" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-release": {
      post: {
        summary: "Confirm release",
        description: "Both parties confirm the release",
        tags: ["Release Flow"],
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
            description: "Release confirmed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in releasing step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/cancel-release": {
      post: {
        summary: "Cancel release",
        description: "Cancel the release process and return to funded state",
        tags: ["Release Flow"],
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
            description: "Release cancelled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in releasing step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/submit-payout-address": {
      post: {
        summary: "Submit payout address",
        description: "Receiver submits their wallet address for receiving funds",
        tags: ["Release Flow"],
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
              schema: {
                type: "object",
                required: ["address"],
                properties: {
                  address: { type: "string", description: "Wallet address" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Address submitted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in releasing step or not receiver" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-payout-address": {
      post: {
        summary: "Confirm payout address",
        description: "Receiver confirms their payout address to execute the transfer",
        tags: ["Release Flow"],
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
            description: "Address confirmed, transfer executed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "No address submitted or not receiver" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/change-payout-address": {
      post: {
        summary: "Change payout address",
        description: "Receiver changes their payout address before confirmation",
        tags: ["Release Flow"],
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
            description: "Address cleared, can submit new address",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in releasing step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Cancel Flow ============
    "/api/rooms/{roomId}/actions/initiate-cancel": {
      post: {
        summary: "Initiate cancellation",
        description: "Either party initiates cancellation and refund to sender",
        tags: ["Cancel Flow"],
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
            description: "Cancellation initiated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in funded step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-cancel": {
      post: {
        summary: "Confirm cancellation",
        description: "Both parties must confirm the cancellation",
        tags: ["Cancel Flow"],
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
            description: "Cancellation confirmed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in cancelling step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/reject-cancel": {
      post: {
        summary: "Reject cancellation",
        description: "Reject the cancellation request and return to funded state",
        tags: ["Cancel Flow"],
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
            description: "Cancellation rejected",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in cancelling step" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/submit-refund-address": {
      post: {
        summary: "Submit refund address",
        description: "Sender submits their wallet address for receiving refund",
        tags: ["Cancel Flow"],
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
              schema: {
                type: "object",
                required: ["address"],
                properties: {
                  address: { type: "string", description: "Wallet address" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Address submitted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in cancelling step or not sender" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/confirm-refund-address": {
      post: {
        summary: "Confirm refund address",
        description: "Sender confirms their refund address to execute the refund",
        tags: ["Cancel Flow"],
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
            description: "Address confirmed, refund executed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "No address submitted or not sender" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/actions/change-refund-address": {
      post: {
        summary: "Change refund address",
        description: "Sender changes their refund address before confirmation",
        tags: ["Cancel Flow"],
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
            description: "Address cleared, can submit new address",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BotResponse" },
              },
            },
          },
          "400": { description: "Not in cancelling step" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ============ Escrows ============
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

    // ============ Scheduler ============
    "/api/scheduler/check-timeouts": {
      post: {
        summary: "Check and process timeouts",
        description: "Process rooms that have exceeded their timeout. Call this from a cron job.",
        tags: ["Scheduler"],
        responses: {
          "200": {
            description: "Timeouts processed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        processed: { type: "integer" },
                        expired: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/scheduler/send-warnings": {
      post: {
        summary: "Send timeout warnings",
        description: "Send warning messages to rooms approaching timeout. Call this from a cron job.",
        tags: ["Scheduler"],
        responses: {
          "200": {
            description: "Warnings sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        warningsSent: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/scheduler/config": {
      get: {
        summary: "Get timeout configuration",
        tags: ["Scheduler"],
        responses: {
          "200": {
            description: "Timeout configuration",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        preFundingTimeoutMinutes: { type: "integer" },
                        fundingTimeoutMinutes: { type: "integer" },
                        warningBeforeMinutes: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/scheduler/expiring-soon": {
      get: {
        summary: "Get rooms expiring soon",
        tags: ["Scheduler"],
        parameters: [
          {
            name: "withinMinutes",
            in: "query",
            schema: { type: "integer", default: 5 },
          },
        ],
        responses: {
          "200": {
            description: "List of rooms expiring soon",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          roomId: { type: "string" },
                          step: { type: "string" },
                          expiresAt: { type: "string", format: "date-time" },
                          minutesRemaining: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/rooms/{roomId}/timeout-status": {
      get: {
        summary: "Get room timeout status",
        tags: ["Scheduler"],
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
            description: "Timeout status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        hasTimeout: { type: "boolean" },
                        timeoutMinutes: { type: "integer", nullable: true },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                        minutesRemaining: { type: "number", nullable: true },
                        isExpired: { type: "boolean" },
                      },
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

    // ============ Disputes ============
    "/api/rooms/{roomId}/dispute": {
      post: {
        summary: "File a dispute",
        description: "File a dispute for a room with explanation and optional proof",
        tags: ["Disputes"],
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
              schema: {
                type: "object",
                required: ["explanation"],
                properties: {
                  explanation: { type: "string", minLength: 10, maxLength: 2000 },
                  proofUrl: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Dispute filed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid request" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/rooms/{roomId}/disputes": {
      get: {
        summary: "Get disputes for a room",
        tags: ["Disputes"],
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
            description: "List of disputes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Dispute" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/disputes/my": {
      get: {
        summary: "Get my disputes",
        description: "Get all disputes filed by the current user",
        tags: ["Disputes"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of user's disputes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Dispute" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/disputes/{disputeId}": {
      get: {
        summary: "Get dispute by ID",
        tags: ["Disputes"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "disputeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Dispute details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Dispute not found" },
        },
      },
    },

    // ============ Admin - Disputes ============
    "/api/admin/disputes": {
      get: {
        summary: "Get all disputes (admin)",
        tags: ["Admin"],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["PENDING", "UNDER_REVIEW", "RESOLVED"] },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "List of all disputes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Dispute" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/disputes/stats": {
      get: {
        summary: "Get dispute statistics (admin)",
        tags: ["Admin"],
        responses: {
          "200": {
            description: "Dispute statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        pending: { type: "integer" },
                        underReview: { type: "integer" },
                        resolved: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/disputes/{disputeId}/status": {
      patch: {
        summary: "Update dispute status (admin)",
        tags: ["Admin"],
        parameters: [
          {
            name: "disputeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["PENDING", "UNDER_REVIEW", "RESOLVED"] },
                  adminNotes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "404": { description: "Dispute not found" },
        },
      },
    },
    "/api/admin/disputes/{disputeId}/notes": {
      post: {
        summary: "Add admin notes to dispute",
        tags: ["Admin"],
        parameters: [
          {
            name: "disputeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["notes"],
                properties: {
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Notes added",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Dispute" },
                  },
                },
              },
            },
          },
          "404": { description: "Dispute not found" },
        },
      },
    },

    // ============ Transactions ============
    "/api/transactions": {
      get: {
        summary: "Get public transaction history",
        description: "Get completed transactions with optional filters and pagination",
        tags: ["Transactions"],
        parameters: [
          {
            name: "chainId",
            in: "query",
            schema: { type: "integer" },
            description: "Filter by chain ID",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["COMPLETED", "REFUNDED"] },
            description: "Filter by status",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter by start date",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter by end date",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Transaction history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        transactions: {
                          type: "array",
                          items: { $ref: "#/components/schemas/PublicTransaction" },
                        },
                        total: { type: "integer" },
                        hasMore: { type: "boolean" },
                        limit: { type: "integer" },
                        offset: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/transactions/stats": {
      get: {
        summary: "Get transaction statistics",
        tags: ["Transactions"],
        responses: {
          "200": {
            description: "Transaction statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        totalTransactions: { type: "integer" },
                        totalVolume: { type: "string" },
                        totalVolumeFormatted: { type: "string" },
                        completedCount: { type: "integer" },
                        refundedCount: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/transactions/my": {
      get: {
        summary: "Get my transactions",
        description: "Get transactions where the current user is sender or receiver",
        tags: ["Transactions"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "User's transactions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/PublicTransaction" },
                          {
                            type: "object",
                            properties: {
                              role: { type: "string", enum: ["sender", "receiver"] },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/transactions/chain/{chainId}": {
      get: {
        summary: "Get transactions by chain",
        tags: ["Transactions"],
        parameters: [
          {
            name: "chainId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Transactions for chain",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PublicTransaction" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/transactions/{transactionId}": {
      get: {
        summary: "Get transaction by ID",
        tags: ["Transactions"],
        parameters: [
          {
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Transaction details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/PublicTransaction" },
                  },
                },
              },
            },
          },
          "404": { description: "Transaction not found" },
        },
      },
    },
    "/api/rooms/{roomId}/transaction": {
      get: {
        summary: "Get transaction for a room",
        tags: ["Transactions"],
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
            description: "Room's transaction",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { $ref: "#/components/schemas/PublicTransaction" },
                  },
                },
              },
            },
          },
          "404": { description: "No transaction found for this room" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
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
      Chain: {
        type: "object",
        properties: {
          chainId: { type: "integer" },
          name: { type: "string" },
          usdtAddress: { type: "string" },
          isTestnet: { type: "boolean" },
        },
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          roomCode: { type: "string", description: "6-character code for joining" },
          chainId: { type: "integer" },
          tokenAddress: { type: "string" },
          amount: { type: "string", nullable: true },
          escrowAddress: { type: "string", nullable: true },
          step: {
            type: "string",
            enum: ["WAITING_FOR_PEER", "ROLE_SELECTION", "AMOUNT_AGREEMENT", "FEE_SELECTION", "AWAITING_DEPOSIT", "FUNDED", "RELEASING", "CANCELLING", "COMPLETED", "CANCELLED", "EXPIRED"],
          },
          status: {
            type: "string",
            enum: ["OPEN", "COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED"],
          },
          feePayer: {
            type: "string",
            enum: ["sender", "receiver", "split"],
            nullable: true,
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
          userId: { type: "string" },
          role: { type: "string", enum: ["sender", "receiver"], nullable: true },
          roleConfirmed: { type: "boolean" },
          amountConfirmed: { type: "boolean" },
          feeConfirmed: { type: "boolean" },
          releaseConfirmed: { type: "boolean" },
          cancelConfirmed: { type: "boolean" },
          payoutAddress: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          roomId: { type: "string" },
          senderId: { type: "string", nullable: true },
          senderType: { type: "string", enum: ["user", "bot", "system"] },
          text: { type: "string" },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      RoomState: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              room: { $ref: "#/components/schemas/Room" },
              participants: {
                type: "array",
                items: { $ref: "#/components/schemas/Participant" },
              },
              currentUser: { $ref: "#/components/schemas/Participant" },
              availableActions: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
      BotResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              message: { type: "string" },
              newStep: { type: "string", nullable: true },
            },
          },
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
      Dispute: {
        type: "object",
        properties: {
          id: { type: "string" },
          roomId: { type: "string" },
          filedBy: { type: "string" },
          explanation: { type: "string" },
          proofUrl: { type: "string", nullable: true },
          status: { type: "string", enum: ["PENDING", "UNDER_REVIEW", "RESOLVED"] },
          adminNotes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PublicTransaction: {
        type: "object",
        properties: {
          id: { type: "string" },
          chainId: { type: "integer" },
          amount: { type: "string" },
          amountFormatted: { type: "string" },
          fee: { type: "string" },
          feeFormatted: { type: "string" },
          feePayer: { type: "string", enum: ["sender", "receiver", "split"] },
          status: { type: "string", enum: ["COMPLETED", "REFUNDED"] },
          completedAt: { type: "string", format: "date-time" },
          depositTxHash: { type: "string" },
          releaseTxHash: { type: "string" },
        },
      },
      CreateRoomRequest: {
        type: "object",
        required: ["name", "chainId"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          chainId: { type: "integer", description: "Chain ID (e.g., 1 for Ethereum mainnet, 56 for BSC)" },
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
