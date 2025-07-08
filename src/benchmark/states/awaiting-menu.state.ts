import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { FoodCategory } from '../core/benchmark-constants';
import { AwaitingElicitationState } from './awaiting-elicitation.state';
import { AwaitingDetailsToolState } from './awaiting-details-tool.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';
import { getSessionRestaurants } from '../core/benchmark-utils';

export class AwaitingMenuState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingMenuState for session ${context.sessionId}`,
    );
  }

  async exit(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Exiting AwaitingMenuState for session ${context.sessionId}`,
    );
  }

  getEnterConfigActions(context: BenchmarkContext) {
    console.log(
      `[State] Entering AwaitingMenuState for session ${context.sessionId}`,
    );

    return [
      () => context.mcpEntities.selectMenuTool?.enable(),
      () => context.mcpEntities.restaurantListResource?.enable(),
    ];
  }

  getExitConfigActions(context: BenchmarkContext) {
    return [
      () => context.mcpEntities.selectMenuTool?.disable(),
      () => context.mcpEntities.restaurantListResource?.disable(),
    ];
  }

  async selectMenu(
    context: BenchmarkContext,
    menuId: string,
  ): Promise<CallToolResult> {
    const category = context.reservationDetails.category as FoodCategory;
    const availableMenus =
      getSessionRestaurants(context.sessionId, category) || [];
    const chosenMenu = availableMenus.find((m) => m.id === menuId);

    if (!chosenMenu) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Menu with ID '${menuId}' not found in category '${category}'. Please select a valid menu.`,
          },
        ],
      };
    }

    await context.updateAndPersistSessionData({ menu: chosenMenu.name });

    let message: string;
    if (context.capabilities.elicitation) {
      console.log(
        `[State] Client supports elicitation. Transitioning to AwaitingElicitationState.`,
      );
      await context.transitionTo(new AwaitingElicitationState());
      message = `Menu '${chosenMenu.name}' selected. The next step is to generate your confirmation email.`;
    } else {
      console.log(
        `[State] Client does not support elicitation. Falling back to tool. Transitioning to AwaitingDetailsToolState.`,
      );
      await context.transitionTo(new AwaitingDetailsToolState());
      message = `Menu '${chosenMenu.name}' selected. Please provide details for your reservation using the tool.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }
}
