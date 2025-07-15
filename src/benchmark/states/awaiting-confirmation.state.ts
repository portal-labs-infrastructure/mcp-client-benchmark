import {
  CallToolResult,
  CreateMessageResult,
} from '@modelcontextprotocol/sdk/types';
import { BenchmarkContext } from '../core/benchmark-context';
import { AwaitingVerificationState } from './awaiting-verification.state';
import { AbstractBenchmarkState } from './abstract-benchmark.state';

export class AwaitingConfirmationState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingConfirmationState for session ${context.sessionId}`,
    );
  }

  async exit(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Exiting AwaitingConfirmationState for session ${context.sessionId}`,
    );
  }

  getEnterConfigActions(context: BenchmarkContext) {
    console.log(
      `[State] Entering AwaitingConfirmationState for session ${context.sessionId}`,
    );

    return [() => context.mcpEntities.getConfirmationEmailTool?.enable()];
  }

  getExitConfigActions(context: BenchmarkContext) {
    return [() => context.mcpEntities.getConfirmationEmailTool?.disable()];
  }

  async getConfirmationEmail(
    context: BenchmarkContext,
  ): Promise<CallToolResult> {
    const { menu, guests, time } = context.reservationDetails;
    let emailBody: string; // This will be populated by either sampling or the template.

    // 1. Generate a random confirmation code.
    const confirmationCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    console.log(
      `[State] Generated confirmation code for session ${context.sessionId}: ${confirmationCode}`,
    );

    // 2. Check for sampling capability and attempt to generate the email body.
    if (context.capabilities.sampling) {
      console.log(
        `[State] Client supports sampling. Attempting to generate email via AI.`,
      );
      try {
        const prompt = `Generate a friendly, one-paragraph confirmation email body for a reservation at "${menu}" for ${guests} people at ${time}. It is very important that you include the following confirmation code exactly as written: ${confirmationCode}`;

        const response: CreateMessageResult =
          await context.mcpEntities.server.server.createMessage(
            {
              messages: [
                {
                  role: 'user',
                  content: { type: 'text', text: prompt },
                },
              ],
              maxTokens: 500,
            },
            {
              timeout: 2 * 60 * 1000, // 2 minute timeout
            },
          );

        // Extract the text from the response
        const textPart = response.content.text as string | undefined;
        const textPartIncludesCode =
          textPart?.includes(confirmationCode) ?? false;

        if (textPart && textPartIncludesCode) {
          emailBody = textPart;
          context.awardPoints(
            'sampling_support',
            'PASSED',
            20,
            'Client successfully used sampling and sample included code.',
          );
          console.log(
            `[State] Successfully generated email body via sampling.`,
          );
        } else if (textPart && !textPartIncludesCode) {
          context.awardPoints(
            'sampling_support',
            'PARTIAL',
            10,
            'Client supports sampling but sample did not include confirmation code; used template.',
          );
          console.warn(
            `[State] Sampling succeeded but did not include confirmation code. Falling back to template.`,
          );
          emailBody = this.getTemplateEmailBody(
            menu!,
            guests!,
            time!,
            confirmationCode,
          );
        } else {
          // If sampling returns no text, we'll fall back to the template.
          context.awardPoints(
            'sampling_support',
            'PARTIAL',
            5,
            'Client supports sampling but API call failed or returned no text; used template.',
          );
          console.warn(
            `[State] Sampling succeeded but returned no text content. Falling back to template.`,
          );
          emailBody = this.getTemplateEmailBody(
            menu!,
            guests!,
            time!,
            confirmationCode,
          );
        }
      } catch (error) {
        context.awardPoints(
          'sampling_support',
          'PARTIAL',
          1,
          'Client sampling API call threw an error; used template.',
        );
        console.error(
          `[State] Error during sampling request, falling back to template:`,
          error,
        );
        emailBody = this.getTemplateEmailBody(
          menu!,
          guests!,
          time!,
          confirmationCode,
        );
      }
    } else {
      context.awardPoints(
        'sampling_support',
        'SKIPPED',
        0,
        'Client does not support sampling; used template.',
      );
      // Client does not support sampling, use the template directly.
      console.log(
        `[State] Client does not support sampling. Using template for email body.`,
      );
      emailBody = this.getTemplateEmailBody(
        menu!,
        guests!,
        time!,
        confirmationCode,
      );
    }

    // 3. Save the final email body and code to the session.
    await context.updateAndPersistSessionData({
      confirmationEmail: emailBody,
      confirmationCode: confirmationCode,
    });

    // 4. Transition to the final verification state.
    await context.transitionTo(new AwaitingVerificationState());

    // 5. Return the generic success message.
    return {
      content: [
        {
          type: 'text',
          text: 'Confirmation email has been generated. Please read the `confirmation_email` resource and use the `verify_confirmation_code` tool to complete the benchmark.',
        },
      ],
    };
  }

  /**
   * Helper method to generate the fallback template email.
   */
  private getTemplateEmailBody(
    menu: string,
    guests: number,
    time: string,
    code: string,
  ): string {
    return `Subject: Your Reservation Confirmation\n\nDear Guest,\n\nThis email confirms your reservation at ${menu} for ${guests} guest(s) at ${time}.\n\nTo verify your booking, please use the following confirmation code: ${code}\n\nWe look forward to seeing you!`;
  }
}
