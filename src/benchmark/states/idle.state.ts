import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { AwaitingCategoryState } from './awaiting-category.state';
import { IBenchmarkState } from './benchmark-state.interface';

export class IdleState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(`[State] Entering IdleState for session ${context.sessionId}`);
    // Enable the 'start' tool and disable others
    context.mcpEntities.startBenchmarkTool?.enable();
    context.mcpEntities.chooseCategoryTool?.disable();
    context.mcpEntities.selectMenuTool?.disable();
    context.mcpEntities.submitDetailsTool?.disable();
    context.mcpEntities.getConfirmationEmailTool?.disable();
  }

  async exit(context: BenchmarkContext): Promise<void> {
    // Disable the 'start' tool as we leave this state
    context.mcpEntities.startBenchmarkTool?.disable();
  }

  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    // Transition to the next state
    await context.transitionTo(new AwaitingCategoryState());
    return {
      content: [
        {
          type: 'text',
          text: 'Benchmark started. Please choose a food category.',
        },
      ],
    };
  }

  // --- Reject all other actions ---
  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        { type: 'text', text: 'Error: Benchmark has not been started yet.' },
      ],
    };
  }
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        { type: 'text', text: 'Error: Benchmark has not been started yet.' },
      ],
    };
  }
  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<void> {
    console.warn(`[State] Elicitation submitted in invalid state: IdleState`);
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    console.warn(`[State] Sampling submitted in invalid state: IdleState`);
  }
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    console.warn(`[State] Details submitted in invalid state: IdleState`);
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
