import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { AwaitingCategoryState } from './awaiting-category.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';

export class IdleState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(`[State] Entering IdleState for session ${context.sessionId}`);
  }
  async exit(context: BenchmarkContext): Promise<void> {
    console.log(`[State] Exiting IdleState for session ${context.sessionId}`);
  }

  // All configuration is now defined here.
  getEnterConfigActions(context: BenchmarkContext): (() => void)[] {
    return [
      () => context.mcpEntities.startBenchmarkTool?.enable(),
      () => context.mcpEntities.chooseCategoryTool?.disable(),
      () => context.mcpEntities.selectMenuTool?.disable(),
      () => context.mcpEntities.submitDetailsTool?.disable(),
      () => context.mcpEntities.getConfirmationEmailTool?.disable(),
    ];
  }

  getExitConfigActions(context: BenchmarkContext): (() => void)[] {
    return [() => context.mcpEntities.startBenchmarkTool?.disable()];
  }

  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    // Transition to the next state
    await context.ensureRunIsCreated();
    await context.transitionTo(new AwaitingCategoryState());
    return {
      content: [
        {
          type: 'text',
          text: 'Benchmark started. Please choose a food category from the restaurant list.',
        },
      ],
    };
  }
}
