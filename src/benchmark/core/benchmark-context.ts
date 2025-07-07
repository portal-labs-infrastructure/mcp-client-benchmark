import { IBenchmarkState } from '../states/benchmark-state.interface';

import { BenchmarkDbService, supabase } from '../../services/supabase.service';
import {
  BenchmarkSession,
  McpEntities,
  ReservationDetails,
} from './benchmark-types';
import {
  CallToolResult,
  ClientCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
import { AwaitingMenuState } from '../states/awaiting-menu.state';
import { AwaitingElicitationState } from '../states/awaiting-elicitation.state';
import { FinishedState } from '../states/finished.state';
import { IdleState } from '../states/idle.state';
import { AwaitingCategoryState } from '../states/awaiting-category.state';
import { AwaitingDetailsToolState } from '../states/awaiting-details-tool.state';
import { AwaitingConfirmationState } from '../states/awaiting-confirmation.state';

// A map to convert state names from the DB into class constructors.
// We will add more states to this map as we create them.
const stateClassMap: { [key: string]: new () => IBenchmarkState } = {
  [IdleState.name]: IdleState,
  [AwaitingCategoryState.name]: AwaitingCategoryState,
  [AwaitingMenuState.name]: AwaitingMenuState,
  [AwaitingDetailsToolState.name]: AwaitingDetailsToolState,
  [AwaitingElicitationState.name]: AwaitingElicitationState,
  [AwaitingConfirmationState.name]: AwaitingConfirmationState,
  [FinishedState.name]: FinishedState,
};

/**
 * Manages the state and data for a single, active benchmark session.
 * It orchestrates state transitions and persists data using the BenchmarkDbService.
 */
export class BenchmarkContext {
  private _currentState!: IBenchmarkState;
  private dbService: BenchmarkDbService;

  // Public properties accessible by states and commands
  public readonly sessionId: string;
  public readonly runId: string;
  public readonly mcpEntities: McpEntities;
  public reservationDetails: ReservationDetails;
  public readonly capabilities: ClientCapabilities;

  private constructor(
    sessionId: string,
    runId: string,
    capabilities: ClientCapabilities,
    mcpEntities: McpEntities,
    initialDetails: ReservationDetails,
  ) {
    this.sessionId = sessionId;
    this.runId = runId;
    this.mcpEntities = mcpEntities;
    this.reservationDetails = initialDetails;
    this.dbService = new BenchmarkDbService(supabase);
    this.capabilities = capabilities;
  }

  /**
   * Asynchronously creates and initializes a BenchmarkContext from a pre-fetched session object.
   * @param session The full session object from the database.
   * @param mcpEntities The live MCP tool/resource objects for this session.
   */
  public static async create(
    session: BenchmarkSession,
    mcpEntities: McpEntities,
  ): Promise<BenchmarkContext> {
    // Use the service to get the run details, including capabilities
    const dbService = new BenchmarkDbService(supabase);
    const runRecord = await dbService.getRun(session.run_id);

    const context = new BenchmarkContext(
      session.id,
      session.run_id,
      runRecord.declared_capabilities || {}, // Pass capabilities from the run record
      mcpEntities,
      session.session_data as ReservationDetails,
    );

    await context.loadState(session.current_step);
    return context;
  }

  /**
   * Loads the correct state class based on the state name from the database.
   * @param stateName The name of the state, e.g., "IdleState".
   */
  private async loadState(stateName: string): Promise<void> {
    const StateClass = stateClassMap[stateName];
    if (!StateClass) {
      throw new Error(`Unknown state name loaded from DB: ${stateName}`);
    }
    this._currentState = new StateClass();
    // Note: We don't call enter() here. The initial UI setup is handled
    // by the controller after the context is fully created.
  }

  /**
   * Transitions the context to a new state.
   * @param state The new state object to transition to.
   */
  public async transitionTo(state: IBenchmarkState): Promise<void> {
    const newStateName = state.constructor.name;

    await this._currentState.exit(this);
    this._currentState = state;

    // Persist the new state name to the database
    await this.dbService.updateSession(
      this.sessionId,
      newStateName,
      this.reservationDetails,
    );

    await this._currentState.enter(this);
  }

  /**
   * Updates the reservation details and persists the entire session_data to the DB.
   * @param newData A partial object of the reservation details to update.
   */
  public async updateAndPersistSessionData(
    newData: Partial<ReservationDetails>,
  ): Promise<void> {
    // Update local state
    this.reservationDetails = { ...this.reservationDetails, ...newData };
    // Persist to DB
    await this.dbService.updateSession(
      this.sessionId,
      this._currentState.constructor.name,
      this.reservationDetails,
    );
  }

  /**
   * Finalizes the benchmark run.
   * @param result The final result of the benchmark.
   */
  public async finalize(result: {
    success: boolean;
    score: number;
    details: object;
  }): Promise<void> {
    await this.dbService.finalizeRun(this.sessionId, result);
  }

  // --- Action Methods (Delegated to Current State) ---

  public async startBenchmark(): Promise<CallToolResult> {
    return this._currentState.startBenchmark(this);
  }

  public async chooseCategory(category: string): Promise<CallToolResult> {
    return this._currentState.chooseCategory(this, category);
  }

  public async selectMenu(menu: string): Promise<CallToolResult> {
    return this._currentState.selectMenu(this, menu);
  }

  public async submitDetailsAsTool(data: object): Promise<CallToolResult> {
    return this._currentState.submitDetailsAsTool(this, data);
  }

  public async getConfirmationEmail(): Promise<CallToolResult> {
    return this._currentState.getConfirmationEmail(this);
  }

  public async submitElicitation(data: object): Promise<CallToolResult | void> {
    return this._currentState.submitElicitation(this, data);
  }

  public async submitSampling(summary: string): Promise<CallToolResult | void> {
    return this._currentState.submitSampling(this, summary);
  }

  public get currentState(): IBenchmarkState {
    return this._currentState;
  }
}
