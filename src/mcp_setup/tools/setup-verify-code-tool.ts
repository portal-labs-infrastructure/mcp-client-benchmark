import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createBenchmarkToolHandler } from '../../benchmark/core/tool-factory';

export function setupVerifyCodeTool(server: McpServer): RegisteredTool {
  // Define the input schema using zod for validation

  // const confirmationCode = Math.random()
  //   .toString(36)
  //   .substring(2, 8)
  //   .toUpperCase();

  const inputSchema = z.object({
    confirmationCode: z
      .string()
      .length(6, 'Confirmation code must be exactly 6 characters long')
      .describe('The confirmation code sent in your email'),
  });

  const tool = server.registerTool(
    'verify_confirmation_code',
    {
      title: 'Verify Confirmation Code',
      description:
        'Submit the confirmation code from the email to finalize the benchmark.',
      inputSchema: inputSchema.shape,
    },
    createBenchmarkToolHandler((payload, context) =>
      context.verifyConfirmationCode(payload.confirmationCode),
    ),
  );

  tool.disable();
  return tool;
}
