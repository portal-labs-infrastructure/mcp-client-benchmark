import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';
import { AwaitingMenuState } from './awaiting-menu.state';
// Import the next state when it's created
// import { AwaitingMenuState } from './awaiting-menu.state';

export class AwaitingCategoryState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingCategoryState for session ${context.sessionId}`,
    );
    // Enable the category tool
    context.mcpEntities.chooseCategoryTool?.enable();
    // TODO: Update the restaurantListResource to show categories
  }

  async exit(context: BenchmarkContext): Promise<void> {
    context.mcpEntities.chooseCategoryTool?.disable();
  }

  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    await context.updateAndPersistSessionData({ category });
    console.log(
      `Category chosen: ${category}. Next step: transition to AwaitingMenuState.`,
    );

    // NOW, perform the state transition. This will trigger the tool changes.
    await context.transitionTo(new AwaitingMenuState());

    return {
      content: [
        {
          type: 'text',
          text: `Category '${category}' selected. Please select a menu.`,
        },
      ],
    };
  }

  // --- Reject all other actions ---
  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    return {
      content: [
        { type: 'text', text: 'Error: Benchmark is already in progress.' },
      ],
    };
  }
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        { type: 'text', text: 'Error: Please choose a category first.' },
      ],
    };
  }
  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<void> {
    console.warn(
      `[State] Elicitation submitted in invalid state: AwaitingCategoryState`,
    );
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    console.warn(
      `[State] Sampling submitted in invalid state: AwaitingCategoryState`,
    );
  }
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Details submission not allowed in this state.',
        },
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
