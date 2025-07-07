import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

export function setupGetConfirmationEmailTool(
  server: McpServer,
): RegisteredTool {
  const tool = server.registerTool(
    'get_confirmation_email',
    {
      title: 'Get Confirmation Email',
      description:
        'Generates and returns the text for a confirmation email for your reservation.',
      inputSchema: {}, // No input needed from the user.
    },
    // The handler will call a new method on the context.
    createBenchmarkToolHandler((payload, context) =>
      context.getConfirmationEmail(),
    ),
  );

  tool.disable(); // Start disabled.
  return tool;
}
