import { Request, RequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpEntities } from '../benchmark/core/benchmark-types';
import { BenchmarkContext } from '../benchmark/core/benchmark-context';
import { BenchmarkDbService, supabase } from '../services/supabase.service';
import {
  createMcpServerInfo,
  createMcpServerOptions,
} from '../mcp_setup/create-mcp-server';
import {
  setupStartBenchmarkTool,
  setupChooseCategoryTool,
  setupSelectMenuTool,
  setupRestaurantListResource,
  setupSubmitDetailsTool,
  setupGetConfirmationEmailTool,
  setupConfirmationEmailResource,
} from '../mcp_setup';
import { setupVerifyCodeTool } from '../mcp_setup/tools/setup-verify-code-tool';
import { setupBenchmarkResultsResource } from '../mcp_setup/resources/setup-benchmark-results-resource';
import { setupTryAgainTool } from '../mcp_setup/tools/setup-try-again-tool';
import crypto from 'crypto';

// --- Global State ---
// Each map holds the live objects for all active sessions, keyed by session ID.
const activeTransports = new Map<string, StreamableHTTPServerTransport>();
const activeServers = new Map<string, McpServer>(); // Each session gets its own server instance.
export const activeContexts = new Map<string, BenchmarkContext>();

/**
 * Cleans up all in-memory objects associated with a finished or disconnected session.
 */
function destroySession(sessionId: string): void {
  console.log(`[Controller] Destroying all objects for session: ${sessionId}`);
  activeTransports.delete(sessionId);
  activeServers.delete(sessionId);
  activeContexts.delete(sessionId);
}

/**
 * This is the single, universal handler for all GET and POST requests to /mcp.
 * It routes requests to existing sessions or creates a new session stack if needed.
 */
const handleMcpRequest: RequestHandler = async (req, res) => {
  let transport: StreamableHTTPServerTransport | undefined;
  try {
    const sessionIdFromHeader = req.headers['mcp-session-id'] as
      | string
      | undefined;

    if (sessionIdFromHeader && !activeTransports.has(sessionIdFromHeader)) {
      // --- PATH FOR INVALID OR MISSING SESSIONS ---
      // The session ID is provided but no transport exists for it.
      console.warn(
        `[Controller] Session ID ${sessionIdFromHeader} provided but no active transport found. Cleaning up...`,
      );
      destroySession(sessionIdFromHeader);

      // Signals for the client to create a new session.
      res.status(404).send('Invalid or missing session ID');
      return;
    } else if (
      sessionIdFromHeader &&
      activeTransports.has(sessionIdFromHeader)
    ) {
      // --- PATH FOR EXISTING SESSIONS ---
      // A transport already exists, so we just retrieve it.
      transport = activeTransports.get(sessionIdFromHeader)!;
    } else if (isInitializeRequest(req.body)) {
      // --- PATH FOR NEW SESSIONS ---
      console.log(
        '[Controller] Received initialize request. Creating new session stack...',
      );

      // 1. Create the server and transport instances.
      const server = new McpServer(
        createMcpServerInfo(),
        createMcpServerOptions(),
      );

      // 2. *** THE KEY ***: Register all tools on the new server BEFORE connecting.
      const mcpEntities: McpEntities = {
        server: server,
        startBenchmarkTool: setupStartBenchmarkTool(server),
        chooseCategoryTool: setupChooseCategoryTool(server),
        selectMenuTool: setupSelectMenuTool(server),
        submitDetailsTool: setupSubmitDetailsTool(server),
        getConfirmationEmailTool: setupGetConfirmationEmailTool(server),
        verifyCodeTool: setupVerifyCodeTool(server),
        tryAgainTool: setupTryAgainTool(server),

        // Resources
        restaurantListResource: setupRestaurantListResource(server),
        confirmationEmailResource: setupConfirmationEmailResource(server),
        benchmarkResultsResource: setupBenchmarkResultsResource(server),
      };

      // 3. Define the session initialization callback.
      // Its only job now is to create the DB records and context, then store everything.
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: async (sessionId) => {
          try {
            console.log(
              `[Controller] Session initialized by SDK. Storing objects for ID: ${sessionId}`,
            );
            activeTransports.set(sessionId, transport!);
            activeServers.set(sessionId, server);

            const dbService = new BenchmarkDbService(supabase);
            const session = await dbService.getOrCreateSession(
              sessionId,
              req.body.params,
            );
            const context = await BenchmarkContext.create(session, mcpEntities);
            activeContexts.set(sessionId, context);

            await context.transitionTo(context.currentState);
            console.log(
              `[Controller] Full initialization complete for session ${sessionId}.`,
            );
          } catch (error) {
            console.error(
              `[Controller] CRITICAL ERROR during session setup for ${sessionId}:`,
              error,
            );
            // Clean up any partial state created
            destroySession(sessionId);
          }
        },
      });

      transport.onmessage = (message) => {
        console.log(
          `[Controller] Received message on transport for session ${transport!.sessionId}:`,
          message,
        );
      };

      // 4. Define the cleanup logic.
      transport.onclose = () => {
        const closedSessionId = transport!.sessionId;
        if (closedSessionId) {
          console.log(
            `[Controller] Transport closed for session ${closedSessionId}. Cleaning up...`,
          );
          destroySession(closedSessionId);
        }
      };

      // 5. Connect the server and transport. This "locks" the server's capabilities.
      await server.connect(transport);
    } else {
      // Signals for the client to create a session.
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    // Let the transport handle the raw HTTP request.
    // For POSTs, this will trigger the associated server's internal processing.
    // For GETs, this establishes the long-lived stream.
    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error(`[Controller] Error in main handler:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: { message: 'Internal Server Error: ' + error.message },
      });
    }
  }
};

export const handleMcpPost = handleMcpRequest;
export const handleSessionRequest = handleMcpRequest;
