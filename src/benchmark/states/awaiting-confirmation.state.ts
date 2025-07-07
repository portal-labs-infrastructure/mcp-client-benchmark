import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { IBenchmarkState } from './benchmark-state.interface';

export class AwaitingConfirmationState implements IBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingConfirmationState for session ${context.sessionId}`,
    );
    context.mcpEntities.getConfirmationEmailTool?.enable();
  }

  async exit(context: BenchmarkContext): Promise<void> {
    context.mcpEntities.getConfirmationEmailTool?.disable();
  }

  // --- THIS IS THE CORE LOGIC, NOW IN THE CORRECT PLACE ---
  async getConfirmationEmail(
    context: BenchmarkContext,
  ): Promise<CallToolResult> {
    const { menu, guests, time } = context.reservationDetails;

    if (context.capabilities.sampling) {
      console.log(
        `[State] Client supports sampling. Requesting email generation.`,
      );
      const prompt = `Please generate a brief, one-sentence confirmation summary for the following reservation:\n- Restaurant: ${menu}\n- Guests: ${guests}\n- Time: ${time}`;

      try {
        // Send the sampling request to the client
        const samplingResult =
          await context.mcpEntities.server.server.createMessage({
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: prompt,
                },
              },
            ],
            maxTokens: 500,
          });

        await context.finalize({
          success: true,
          score: 100,
          details: {
            ...context.reservationDetails,
            summary: samplingResult.text,
            usedSampling: true,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: 'Confirmation email generated successfully.',
            },
          ],
        };
      } catch (error) {
        await context.finalize({
          success: false,
          score: 0,
          details: {
            reason: 'Client failed sampling request',
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: `The request to generate an email failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    } else {
      console.log(`[State] Client does not support sampling. Using template.`);
      const template = `Subject: Your Reservation Confirmation\n\nDear Guest,\n\nThis email confirms your reservation at ${menu} for ${guests} guest(s) at ${time}. We look forward to seeing you!\n\nSincerely,\nThe Restaurant Team`;

      await context.finalize({
        success: true,
        score: 80,
        details: {
          ...context.reservationDetails,
          summary: template,
          usedSampling: false,
        },
      });
      return { content: [{ type: 'text', text: template }] };
    }
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
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    return {
      content: [{ type: 'text', text: 'Error: Details already submitted.' }],
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
}
