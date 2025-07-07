import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

// We can reuse the same Zod schema for validation.
export const DetailsSchema = z.object({
  guests: z.number().int().min(1).max(20).describe('Number of guests (1-20)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export function setupSubmitDetailsTool(server: McpServer): RegisteredTool {
  const tool = server.registerTool(
    'submit_reservation_details',
    {
      title: 'Submit Details',
      description: 'Submit the final details for the reservation.',
      inputSchema: DetailsSchema.shape,
    },
    // The handler will call a new method on the context.
    createBenchmarkToolHandler((payload, context) =>
      context.submitDetailsAsTool(payload),
    ),
  );

  tool.disable(); // Start disabled.
  return tool;
}
