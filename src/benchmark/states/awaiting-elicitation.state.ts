import { z } from 'zod';
import { BenchmarkContext } from '../core/benchmark-context';
import { AwaitingConfirmationState } from './awaiting-confirmation.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';

// Define the schema for the data we expect from the client
const ElicitationSchema = z.object({
  guests: z.number().int().min(1).max(20),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export class AwaitingElicitationState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingElicitationState for session ${context.sessionId}`,
    );

    try {
      // This single call handles the entire request/response cycle.
      // The 'await' will not resolve until the client sends back its data.
      const elicitationResult =
        await context.mcpEntities.server.server.elicitInput({
          message: 'Please provide the reservation details.',
          requestedSchema: {
            type: 'object',
            properties: {
              guests: {
                type: 'integer',
                description: 'Number of guests (1-20)',
              },
              time: {
                type: 'string',
                description: 'Reservation time (HH:MM)',
                pattern: '^\\d{2}:\\d{2}$',
              },
            },
            required: ['guests', 'time'],
          },
        });

      // --- All validation and state transition logic now happens here ---

      // Case 1: The user cancelled, or the client returned an error.
      if (elicitationResult.action !== 'accept') {
        console.error(
          `[State] Elicitation was not accepted by client for session ${context.sessionId}:`,
          elicitationResult.error,
        );
        context.awardPoints(
          'elicitation_support',
          'FAILED',
          0,
          `Client returned action '${elicitationResult.action}'.`,
        );
        await context.finalize();
        return; // End the flow here.
      }

      // Case 2: The user submitted data. We must validate it.
      // The result already contains the user's data in the `content` property.
      const validationResult = ElicitationSchema.safeParse(
        elicitationResult.content,
      );

      if (!validationResult.success) {
        context.awardPoints(
          'elicitation_support',
          'FAILED',
          0,
          'Client submitted data that failed schema validation.',
        );
        // The submitted data was invalid. Finalize the run as a failure.
        await context.finalize();
        // We could optionally send a message back to the client here if the protocol supported it,
        // but for the benchmark, finalizing is sufficient.
        return; // End the flow here.
      }

      // Case 3: The data is valid. Proceed to the next state.
      context.awardPoints(
        'elicitation_support',
        'PASSED',
        25,
        'Client successfully submitted valid data via elicitation.',
      );

      const { guests, time } = validationResult.data;
      await context.updateAndPersistSessionData({ guests, time });
      await context.transitionTo(new AwaitingConfirmationState());
      console.log(
        `[State] Elicitation successful for session ${context.sessionId}. Transitioning...`,
      );
    } catch (error) {
      console.error(
        `[State] Critical error during elicitation for session ${context.sessionId}:`,
        error,
      );
      await context.finalize();
    }
  }

  async exit(context: BenchmarkContext) {
    console.log(
      `[State] Exiting AwaitingElicitationState for session ${context.sessionId}`,
    );
    // No specific actions needed on exit, but we could disable tools if any were enabled.
  }
}
