import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

export function setupStartBenchmarkTool(server: McpServer): RegisteredTool {
  const StartBenchmarkSchema = z.object({}); // No parameters

  const tool = server.registerTool(
    'start_benchmark',
    {
      title: 'Start Benchmark',
      description: 'Begin the MCP benchmark evaluation.',
      inputSchema: {},
    },
    createBenchmarkToolHandler((payload, context) => context.startBenchmark()),
  );

  tool.disable(); // Will be enabled by IdleState
  return tool;
}
