import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';
import { AwaitingConfirmationState } from './awaiting-confirmation.state';

// Define the schema for the data we expect from the client
const ElicitationSchema = z.object({
  guests: z.number().int().min(1).max(20),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export class AwaitingElicitationState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingElicitationState for session ${context.sessionId}`,
    );

    // --- PROACTIVE CHECK (Optional but Recommended) ---
    // This assumes you've stored capabilities in the context
    if (!context.capabilities.elicitation) {
      console.error(
        `[State] Client for session ${context.sessionId} does not support elicitation. Failing run.`,
      );
      await context.finalize({
        success: false,
        score: 0,
        details: { reason: 'Client does not support elicitation' },
      });
      return;
    }

    // --- IMMEDIATE FIX: CHECK THE RESPONSE ---
    try {
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
            additionalProperties: false,
          },
        });

      // If the client sent back an error (e.g., feature not supported), the request fails.
      if (!elicitationResult.success) {
        console.error(
          `[State] Elicitation request failed for session ${context.sessionId}:`,
          elicitationResult.error,
        );
        await context.finalize({
          success: false,
          score: 0,
          details: {
            reason: 'Client rejected or failed the elicitation request.',
            error: elicitationResult.error,
          },
        });
        return;
      }

      console.log(
        `[State] Elicitation request successfully sent to client for session ${context.sessionId}.`,
      );
      // Now we wait for the client to send the 'elicitation/response' which triggers submitElicitation().
    } catch (error) {
      console.error(
        `[State] Critical error during elicitation for session ${context.sessionId}:`,
        error,
      );
      await context.finalize({
        success: false,
        score: 0,
        details: { reason: 'Server error during elicitation.' },
      });
    }
  }

  async exit(context: BenchmarkContext): Promise<void> {
    /* No action needed */
  }

  async submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult | void> {
    const validationResult = ElicitationSchema.safeParse(data);

    if (!validationResult.success) {
      // Finalize the run in the DB first.
      await context.finalize({
        success: false,
        score: 0,
        details: {
          reason: 'Invalid elicitation data submitted',
          errors: validationResult.error.issues,
        },
      });

      // --- NEW: Return a user-facing error message ---
      return {
        content: [
          {
            type: 'text',
            text: `Submission failed. Please check your input and try again. Errors: ${validationResult.error.flatten().fieldErrors}`,
          },
        ],
      };
    }

    // On success, we proceed as normal and don't return anything.
    // The next state transition will handle the UI update.
    const { guests, time } = validationResult.data;
    await context.updateAndPersistSessionData({ guests, time });
    await context.transitionTo(new AwaitingConfirmationState());
  }

  // --- Reject other actions ---
  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    /* ... */ return {
      content: [
        { type: 'text', text: 'Error: Benchmark is already in progress.' },
      ],
    };
  }
  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    /* ... */ return {
      content: [{ type: 'text', text: 'Error: Category already chosen.' }],
    };
  }
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    /* ... */ return {
      content: [{ type: 'text', text: 'Error: Menu already chosen.' }],
    };
  }
  async submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<void> {
    /* ... */ console.warn(
      `[State] Sampling submitted in invalid state: AwaitingElicitationState`,
    );
  }
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    console.warn(
      `[State] Details submitted in invalid state: AwaitingElicitationState`,
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
