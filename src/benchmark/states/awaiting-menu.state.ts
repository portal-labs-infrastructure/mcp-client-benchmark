import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';
import { RESTAURANT_DATA, FoodCategory } from '../core/benchmark-constants';
import { AwaitingElicitationState } from './awaiting-elicitation.state';
import { AwaitingDetailsToolState } from './awaiting-details-tool.state';

export class AwaitingMenuState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingMenuState for session ${context.sessionId}`,
    );
    context.mcpEntities.selectMenuTool?.enable();

    // Dynamically update the resource to show menus for the selected category
    const category = context.reservationDetails.category as FoodCategory;
    if (category && RESTAURANT_DATA[category]) {
      context.mcpEntities.restaurantListResource?.update({
        // The content of the resource is now the list of menus
        // contents: RESTAURANT_DATA[category],
      });
    }
  }

  async exit(context: BenchmarkContext): Promise<void> {
    context.mcpEntities.selectMenuTool?.disable();
  }

  async selectMenu(
    context: BenchmarkContext,
    menuId: string,
  ): Promise<CallToolResult> {
    const category = context.reservationDetails.category as FoodCategory;
    const availableMenus = RESTAURANT_DATA[category] || [];
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

    // *** BENCHMARK VALIDATION ***
    if (context.capabilities.elicitation) {
      console.log(
        `[State] Client supports elicitation. Transitioning to AwaitingElicitationState.`,
      );
      await context.transitionTo(new AwaitingElicitationState());
    } else {
      console.log(
        `[State] Client does not support elicitation. Falling back to tool. Transitioning to AwaitingDetailsToolState.`,
      );
      await context.transitionTo(new AwaitingDetailsToolState());
    }

    return {
      content: [
        {
          type: 'text',
          text: `Menu '${chosenMenu.name}' selected. Please provide reservation details.`,
        },
      ],
    };
  }

  // --- Reject other actions ---
  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    return {
      content: [
        { type: 'text', text: 'Error: Benchmark is already in progress.' },
      ],
    };
  }
  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Error: Category already chosen.' }],
    };
  }
  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<void> {
    console.warn(
      `[State] Elicitation submitted in invalid state: AwaitingMenuState`,
    );
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    console.warn(
      `[State] Sampling submitted in invalid state: AwaitingMenuState`,
    );
  }
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    console.warn(
      `[State] Details submitted in invalid state: AwaitingMenuState`,
    );
    return {
      content: [
        { type: 'text', text: 'Error: Details submission not allowed here.' },
      ],
    };
  }
  async getConfirmationEmail(
    context: BenchmarkContext,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: You must submit the reservation details before getting a confirmation.',
        },
      ],
    };
  }
}
