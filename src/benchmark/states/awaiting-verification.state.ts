import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BenchmarkContext } from '../core/benchmark-context';
import { AbstractBenchmarkState } from './abstract-benchmark.state';
import { FinishedState } from './finished.state';

export class AwaitingVerificationState extends AbstractBenchmarkState {
  async enter(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Entering AwaitingVerificationState for session ${context.sessionId}`,
    );
  }

  async exit(context: BenchmarkContext): Promise<void> {
    console.log(
      `[State] Exiting AwaitingVerificationState for session ${context.sessionId}`,
    );
  }

  getEnterConfigActions(context: BenchmarkContext) {
    console.log(
      `[State] Entering AwaitingVerificationState for session ${context.sessionId}`,
    );
    return [
      () => context.mcpEntities.verifyCodeTool?.enable(),
      () => context.mcpEntities.confirmationEmailResource?.enable(),
    ];
  }

  getExitConfigActions(context: BenchmarkContext) {
    return [
      () => context.mcpEntities.verifyCodeTool?.disable(),
      () => context.mcpEntities.confirmationEmailResource?.disable(),
    ];
  }

  async verifyConfirmationCode(
    context: BenchmarkContext,
    code: string,
  ): Promise<CallToolResult> {
    const expectedCode = context.reservationDetails.confirmationCode;

    if (code === expectedCode) {
      context.awardPoints(
        'resource_reading',
        'PASSED',
        25,
        'Inferred from correct code submission.',
      );
      context.awardPoints(
        'code_verification',
        'PASSED',
        25,
        'Client submitted the correct code.',
      );

      await context.finalize();
      // Instead of returning a message, transition to the results screen.
      await context.transitionTo(new FinishedState());

      return {
        content: [
          {
            type: 'text',
            text: 'Verification successful! Your reservation is confirmed.',
          },
        ],
      };
    } else {
      context.awardPoints(
        'resource_reading',
        'FAILED',
        0,
        'Cannot confirm resource was read due to incorrect code.',
      );
      context.awardPoints(
        'code_verification',
        'FAILED',
        0,
        `Incorrect code. Expected ${expectedCode}, got ${code}.`,
      );

      await context.finalize();
      return {
        content: [
          {
            type: 'text',
            text: `Verification failed. Incorrect code provided. Expected ${expectedCode} but got ${code}.`,
          },
        ],
      };
    }
  }
}
