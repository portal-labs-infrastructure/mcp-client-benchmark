// This file holds the static data for our benchmark scenario.

export const RESTAURANT_DATA = {
  Sushi: [
    {
      id: 'sushi-1',
      name: 'Tokyo Sushi Bar',
      description: 'Authentic Edomae-style sushi.',
    },
    {
      id: 'sushi-2',
      name: 'Kyoto Sushi House',
      description: 'Modern fusion sushi rolls.',
    },
  ],
  Pizza: [
    {
      id: 'pizza-1',
      name: 'Napoli Pizza Place',
      description: 'Classic Neapolitan wood-fired pizza.',
    },
    {
      id: 'pizza-2',
      name: 'Chicago Deep Dish',
      description: 'Hearty and cheesy deep-dish pizza.',
    },
  ],
  Vegan: [
    {
      id: 'vegan-1',
      name: 'Green Earth Cafe',
      description: 'Plant-based comfort food.',
    },
    {
      id: 'vegan-2',
      name: 'The V-Spot',
      description: 'Creative and delicious vegan cuisine.',
    },
  ],
};

export type FoodCategory = keyof typeof RESTAURANT_DATA;
