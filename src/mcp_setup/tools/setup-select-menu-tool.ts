import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

export function setupSelectMenuTool(server: McpServer): RegisteredTool {
  const SelectMenuSchema = z.object({
    menu_id: z.string().min(1),
  });

  const tool = server.registerTool(
    'select_menu',
    {
      title: 'Select Menu',
      description: 'Select a specific restaurant menu.',
      inputSchema: SelectMenuSchema.shape,
    },
    createBenchmarkToolHandler((payload, context) =>
      context.selectMenu(payload.menu_id),
    ),
  );

  tool.disable();
  return tool;
}
