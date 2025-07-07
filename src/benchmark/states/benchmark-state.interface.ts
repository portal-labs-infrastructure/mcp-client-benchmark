import { BenchmarkContext } from '../core/benchmark-context';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

/**
 * Defines the contract for all states in the benchmark flow.
 * Each method represents an action that can be triggered by a client.
 * States are responsible for handling or rejecting these actions.
 */
export interface IBenchmarkState {
  // Lifecycle methods called by the context during transitions
  enter(context: BenchmarkContext): Promise<void>;
  exit(context: BenchmarkContext): Promise<void>;

  // Actions triggered by tool executions
  startBenchmark(context: BenchmarkContext): Promise<CallToolResult>;
  chooseCategory(
    context: BenchmarkContext,
    category: string,
  ): Promise<CallToolResult>;
  selectMenu(context: BenchmarkContext, menu: string): Promise<CallToolResult>;
  submitDetailsAsTool(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult>;
  getConfirmationEmail(context: BenchmarkContext): Promise<CallToolResult>;

  // Actions triggered by other MCP responses
  submitElicitation(
    context: BenchmarkContext,
    data: object,
  ): Promise<CallToolResult | void>;
  submitSampling(
    context: BenchmarkContext,
    summary: string,
  ): Promise<CallToolResult | void>;
}
