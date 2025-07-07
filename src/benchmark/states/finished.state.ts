import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';

export class FinishedState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering FinishedState for session ${context.sessionId}`,
    );
    // This is the successful completion of the benchmark.
    await context.finalize({
      success: true,
      score: 100, // For v0, score is binary. Can be more nuanced later.
      details: { ...context.reservationDetails },
    });
    // TODO: Enable a 'view_results' or 'restart' tool.
  }

  async exit(context: BenchmarkContext): Promise<void> {
    /* Terminal state, no exit */
  }

  // --- Reject all actions, the benchmark is over ---
  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Benchmark finished. Please restart.' }],
    };
  }
  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Benchmark finished. Please restart.' }],
    };
  }
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Benchmark finished. Please restart.' }],
    };
  }
  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<void> {
    console.warn(
      `[State] Elicitation submitted in invalid state: FinishedState`,
    );
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    console.warn(`[State] Sampling submitted in invalid state: FinishedState`);
  }
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    console.warn(`[State] Details submitted in invalid state: FinishedState`);
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
