import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { DetailsSchema } from '../../mcp_setup/tools/setup-submit-details-tool';
import { AwaitingConfirmationState } from './awaiting-confirmation.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';

export class AwaitingDetailsToolState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingDetailsToolState for session ${context.sessionId}`,
    );
  }

  async exit(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Exiting AwaitingDetailsToolState for session ${context.sessionId}`,
    );
  }

  getEnterConfigActions(context: BenchmarkContext) {
    console.log(
      `[State] Entering AwaitingDetailsToolState for session ${context.sessionId}`,
    );
    // Enable the tool for the client to use.
    return [() => context.mcpEntities.submitDetailsTool?.enable()];
  }

  getExitConfigActions(context: BenchmarkContext) {
    return [() => context.mcpEntities.submitDetailsTool?.disable()];
  }

  // This new method will be called by the tool's handler.
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    const validationResult = DetailsSchema.safeParse(data);

    if (!validationResult.success) {
      context.awardPoints(
        'elicitation_support',
        'FAILED',
        0,
        'Client attempted to submit details via a tool but validation failed.',
      );
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

    context.awardPoints(
      'elicitation_support',
      'FAILED',
      0,
      'Client submitted data via a tool call instead of elicitation.',
    );

    // On success, update data and transition.
    const { guests, time } = validationResult.data;
    await context.updateAndPersistSessionData({ guests, time });
    await context.transitionTo(new AwaitingConfirmationState());

    return {
      content: [{ type: 'text', text: 'Reservation details accepted.' }],
    };
  }
}
