import { Implementation } from '@modelcontextprotocol/sdk/types.js';

export function createMcpServerInfo(): Implementation {
  const serverName = `mcp-client-evals-server`;
  console.log(
    `[McpGameServer] Creating global MCP server instance: ${serverName}`,
  );

  const server = {
    name: serverName,
    title: 'MCP Client Evals',
    version: '1.0.0',
    description:
      'MCP Client Evals is a benchmark server for testing MCP client implementations.',
  };

  console.log(
    '[McpGameServer] Global server instance configured and ready for connections.',
  );
  return server;
}

export function createMcpServerOptions() {
  return {
    // Add any specific options you want to configure for the MCP server
    // For example, you might want to set a custom transport or other settings
    // transport: new SomeCustomTransport(),
    debouncedNotificationMethods: [
      'notifications/tools/list_changed',
      'notifications/resources/list_changed',
      // Add any other notification methods you want to debounce
    ],
  };
}
