import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { BenchmarkContext } from './benchmark-context';

// We need to import the map from the controller to access it.
// This creates a slight coupling, but it's a clean and efficient pattern.
import { activeContexts } from '../../controllers/mcp.controller';

export type BenchmarkToolLogic<T extends z.ZodTypeAny> = (
  payload: z.infer<T>,
  context: BenchmarkContext,
) => Promise<CallToolResult>;

/**
 * A Higher-Order Function to create a type-safe MCP tool handler.
 * It now RETRIEVES the existing context instead of creating a new one.
 */
export function createBenchmarkToolHandler<T extends z.ZodTypeAny>(
  // Dependencies are no longer needed as the context is pre-built.
  logic: BenchmarkToolLogic<T>,
) {
  return async (
    payload: z.infer<T>,
    mcpContext: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<CallToolResult> => {
    const sessionId = mcpContext.sessionId;
    if (!sessionId) {
      return {
        content: [
          { type: 'text', text: 'Error: Session ID not found on transport.' },
        ],
      };
    }

    // --- RETRIEVE THE CONTEXT FROM THE MAP ---
    const context = activeContexts.get(sessionId);
    if (!context) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: No active context found for session ${sessionId}.`,
          },
        ],
      };
    }

    // Execute the core tool logic with the live context
    return logic(payload, context);
  };
}
