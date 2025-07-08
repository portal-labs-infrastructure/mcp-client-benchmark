import { FoodCategory, RESTAURANT_DATA } from './benchmark-constants';

export const getSessionRestaurants = (
  sessionId: string,
  currentCategory: FoodCategory,
) =>
  RESTAURANT_DATA[currentCategory].map((restaurant) => {
    // Create a unique, deterministic ID from the session and original ID.
    // Base64 encoding makes it look like an opaque token.
    const uniqueId = Buffer.from(`${sessionId}:${restaurant.id}`).toString(
      'base64',
    );

    return {
      ...restaurant, // Copy original properties like name and description
      id: uniqueId, // Override with the new session-specific ID
    };
  });
