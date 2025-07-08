import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

export function setupTryAgainTool(server: McpServer): RegisteredTool {
  const tool = server.registerTool(
    'try_again',
    {
      title: 'Try Again',
      description: 'Resets the session and starts a new benchmark run.',
      inputSchema: {}, // No input needed
    },
    // We'll create a new `tryAgain` method on the context
    createBenchmarkToolHandler((payload, context) => context.tryAgain()),
  );

  tool.disable();
  return tool;
}
