import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { AbstractBenchmarkState } from './abstract-benchmark.state';
import { IdleState } from './idle.state';

export class FinishedState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering FinishedState for session ${context.sessionId}`,
    );
    // Enable the tools and resources for the end screen.
    context.mcpEntities.tryAgainTool?.enable();
    context.mcpEntities.benchmarkResultsResource?.enable();
  }

  async exit(context: BenchmarkContext): Promise<void> {
    // Disable everything when we leave this state.
    context.mcpEntities.tryAgainTool?.disable();
    context.mcpEntities.benchmarkResultsResource?.disable();
  }

  // This method will be called by the 'try_again' tool's handler.
  async tryAgain(context: BenchmarkContext): Promise<CallToolResult> {
    console.log(
      `[State] Resetting session ${context.sessionId} for a new run.`,
    );
    await context.resetForNewRun();
    await context.transitionTo(new IdleState());
    return {
      content: [
        {
          type: 'text',
          text: 'Session reset. Ready to start a new benchmark.',
        },
      ],
    };
  }
}
