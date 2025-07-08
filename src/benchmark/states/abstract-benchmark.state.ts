import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BenchmarkContext } from '../core/benchmark-context';

/**
 * An abstract base class for all benchmark states.
 *
 * It provides default implementations for all possible actions, typically
 * returning an error to indicate the action is not valid in the current state.
 *
 * It also defines `enter` and `exit` as abstract methods, forcing every
 * concrete state class to implement its own setup and cleanup logic.
 *
 * Concrete state classes should `extend` this class and `override` only the
 * methods they need to handle.
 */
export abstract class AbstractBenchmarkState {
  // =================================================================
  // --- Abstract Methods (MUST be implemented by child classes) ---
  // =================================================================

  /**
   * Logic to execute when the state machine enters this state.
   * Typically used to enable tools and resources.
   */
  abstract enter(context: BenchmarkContext): Promise<void>;

  /**
   * Logic to execute when the state machine exits this state.
   * Typically used to disable tools and resources.
   */
  abstract exit(context: BenchmarkContext): Promise<void>;

  // These return actions to be executed by the state machine.
  getEnterConfigActions(context: BenchmarkContext): (() => void)[] {
    return []; // Default to no actions
  }

  getExitConfigActions(context: BenchmarkContext): (() => void)[] {
    return []; // Default to no actions
  }

  // =================================================================
  // --- Concrete Methods (OPTIONAL to override) ---
  // =================================================================

  /**
   * Default handler for starting the benchmark.
   */
  async startBenchmark(context: BenchmarkContext): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot start the benchmark from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for choosing a restaurant category.
   */
  async chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot choose a category from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for selecting a menu item.
   */
  async selectMenu(
    context: BenchmarkContext,
    menu: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot select a menu from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for submitting reservation details via a tool.
   */
  async submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot submit details from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for the "get confirmation email" tool.
   */
  async getConfirmationEmail(
    context: BenchmarkContext,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot get a confirmation email from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for verifying the confirmation code.
   */
  async verifyConfirmationCode(
    context: BenchmarkContext,
    code: string,
  ): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot verify a code from the current state.',
        },
      ],
    };
  }

  /**
   * Default handler for trying again. Does nothing by default.
   */
  async tryAgain(context: BenchmarkContext): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Cannot try again from the current state.',
        },
      ],
    };
  }
}
