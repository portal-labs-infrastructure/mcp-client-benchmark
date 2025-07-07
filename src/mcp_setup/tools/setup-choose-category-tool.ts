import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';
import { RESTAURANT_DATA } from '../../benchmark/core/benchmark-constants';

export function setupChooseCategoryTool(server: McpServer): RegisteredTool {
  const ChooseCategorySchema = z.object({
    category: z.enum(Object.keys(RESTAURANT_DATA) as [string, ...string[]]),
  });

  const tool = server.registerTool(
    'choose_food_category',
    {
      title: 'Choose Category',
      description: 'Select a food category for the reservation.',
      inputSchema: ChooseCategorySchema.shape,
    },
    createBenchmarkToolHandler((payload, context) =>
      context.chooseCategory(payload.category),
    ),
  );

  tool.disable();
  return tool;
}
