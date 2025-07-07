import { Implementation } from '@modelcontextprotocol/sdk/types.js';

export function createMcpServerOptions(): Implementation {
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
