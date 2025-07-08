import {
  McpServer,
  ReadResourceCallback,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { activeContexts } from '../../controllers/mcp.controller';

const CONFIRMATION_EMAIL_URI = 'mcp://benchmark-server/confirmation_email';

export function setupConfirmationEmailResource(
  server: McpServer,
): RegisteredResource {
  const handler: ReadResourceCallback = async (
    uri: URL,
    mcpContext: RequestHandlerExtra<any, any>,
  ): Promise<ReadResourceResult> => {
    const sessionId = mcpContext.sessionId;
    if (!sessionId) throw new Error('Session ID not found on transport.');

    const context = activeContexts.get(sessionId);
    if (!context) throw new Error(`No active context for session ${sessionId}`);

    const emailBody =
      context.reservationDetails.confirmationEmail ||
      'Email not generated yet.';

    return {
      contents: [
        {
          uri: CONFIRMATION_EMAIL_URI,
          text: emailBody,
          mimeType: 'text/plain',
        },
      ],
    };
  };

  const resource = server.registerResource(
    'confirmation-email-resource',
    CONFIRMATION_EMAIL_URI,
    {
      title: 'Confirmation Email Resource',
      description:
        'This resource contains the confirmation email text for your reservation.',
    },
    handler,
  );

  resource.disable(); // Start disabled until the email is generated.
  return resource;
}
