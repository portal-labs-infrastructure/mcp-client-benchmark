import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { AwaitingMenuState } from './awaiting-menu.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';

export class AwaitingCategoryState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingCategoryState for session ${context.sessionId}`,
    );
  }

  async exit(context: BenchmarkContext) {
    console.log(
      `[State] Exiting AwaitingCategoryState for session ${context.sessionId}`,
    );
  }

  getEnterConfigActions(context: BenchmarkContext) {
    console.log(
      `[State] Entering AwaitingCategoryState for session ${context.sessionId}`,
    );
    // Enable the category tool
    return [() => context.mcpEntities.chooseCategoryTool?.enable()];
  }

  getExitConfigActions(context: BenchmarkContext) {
    return [
      () => context.mcpEntities.chooseCategoryTool?.disable(),
      () => context.mcpEntities.restaurantListResource?.disable(),
    ];
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
}
