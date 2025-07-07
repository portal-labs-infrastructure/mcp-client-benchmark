import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';
import { DetailsSchema } from '../../mcp_setup/tools/setup-submit-details-tool';
import { AwaitingConfirmationState } from './awaiting-confirmation.state';

export class AwaitingDetailsToolState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingDetailsToolState for session ${context.sessionId}`,
    );
    // Enable the tool for the client to use.
    context.mcpEntities.submitDetailsTool?.enable();
  }

  async exit(context: BenchmarkContext): Promise<void> {
    context.mcpEntities.submitDetailsTool?.disable();
  }

  // This new method will be called by the tool's handler.
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    const validationResult = DetailsSchema.safeParse(data);

    if (!validationResult.success) {
      // Return a user-facing error message.
      return {
        content: [
          {
            type: 'text',
            text: `Submission failed. Errors: ${validationResult.error.flatten().fieldErrors}`,
          },
        ],
      };
    }

    // On success, update data and transition.
    const { guests, time } = validationResult.data;
    await context.updateAndPersistSessionData({ guests, time });
    await context.transitionTo(new AwaitingConfirmationState());

    return {
      content: [{ type: 'text', text: 'Reservation details accepted.' }],
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
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Error: Menu already chosen.' }],
    };
  }
  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<void> {
    console.warn(
      `[State] Elicitation submitted in invalid state: AwaitingDetailsToolState`,
    );
    // Optionally, you could throw an error or return a specific result.
    throw new Error('Elicitation not allowed in this state');
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    console.warn(
      `[State] Sampling submitted in invalid state: AwaitingDetailsToolState`,
    );
    // Optionally, you could throw an error or return a specific result.
    throw new Error('Sampling not allowed in this state');
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
