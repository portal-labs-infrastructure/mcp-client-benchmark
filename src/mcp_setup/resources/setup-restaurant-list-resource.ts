import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import {
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import {
  RESTAURANT_DATA,
  FoodCategory,
} from '../../benchmark/core/benchmark-constants';
import { activeContexts } from '../../controllers/mcp.controller';
import { getSessionRestaurants } from '../../benchmark/core/benchmark-utils';

export function setupRestaurantListResource(
  server: McpServer,
): RegisteredResource {
  const resourceUri = `mcp://benchmark/restaurants`;
  const handler = async (
    uri: URL,
    mcpContext: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<ReadResourceResult> => {
    const sessionId = mcpContext.sessionId; // Get the session ID from the transport
    if (!sessionId) {
      throw new Error('Session ID not found on transport.');
    }
    // Retrieve the context from the map, just like the tool factory does
    const context = activeContexts.get(sessionId);
    if (!context) {
      throw new Error(`No active context for session ${sessionId}`);
    }

    // Prepare the data to return
    let data;

    const currentCategory = context.reservationDetails.category as
      | FoodCategory
      | undefined;

    if (currentCategory && RESTAURANT_DATA[currentCategory]) {
      // If a category is selected, generate session-specific IDs for the restaurants.
      const sessionRestaurants = getSessionRestaurants(
        sessionId,
        currentCategory,
      );

      data = {
        title: `Menus for ${currentCategory}`,
        items: sessionRestaurants,
      };
    } else {
      // Otherwise, show the list of categories. No change needed here.
      data = {
        title: 'Available Food Categories',
        items: Object.keys(RESTAURANT_DATA).map((cat) => ({
          id: cat,
          name: cat,
        })),
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  };

  const resource = server.resource(
    'restaurant_list',
    resourceUri,
    { description: 'Available restaurants and food categories.' },
    handler,
  );
  resource.disable(); // Start disabled until the category is selected

  return resource;
}
