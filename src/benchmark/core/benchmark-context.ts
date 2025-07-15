import { BenchmarkDbService, supabase } from '../../services/supabase.service';
import {
  BenchmarkSession,
  McpEntities,
  ReservationDetails,
  Scorecard,
  ScorecardLineItem,
} from './benchmark-types';
import {
  CallToolResult,
  ClientCapabilities,
  InitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { AwaitingMenuState } from '../states/awaiting-menu.state';
import { IdleState } from '../states/idle.state';
import { AwaitingCategoryState } from '../states/awaiting-category.state';
import { AwaitingDetailsToolState } from '../states/awaiting-details-tool.state';
import { AwaitingConfirmationState } from '../states/awaiting-confirmation.state';
import { AwaitingVerificationState } from '../states/awaiting-verification.state';
import { AbstractBenchmarkState } from '../states/abstract-benchmark.state';
import { FinishedState } from '../states/finished.state';

// This map defines our entire rubric.
const RUBRIC_TEMPLATE: Scorecard = {
  elicitation_support: {
    description: 'Client correctly handles an elicitation request.',
    status: 'PENDING',
    pointsEarned: 0,
    maxPoints: 25,
  },
  sampling_support: {
    description: 'Client uses sampling to generate confirmation email.',
    status: 'PENDING',
    pointsEarned: 0,
    maxPoints: 20,
  },
  resource_reading: {
    description: 'Client can read from a dynamically enabled resource.',
    status: 'PENDING',
    pointsEarned: 0,
    maxPoints: 25,
  },
  code_verification: {
    description: 'Client submits correct data from a resource to a tool.',
    status: 'PENDING',
    pointsEarned: 0,
    maxPoints: 25,
  },
  // We can add more checks here later, like for progress notifications.
};

// A map to convert state names from the DB into class constructors.
// We will add more states to this map as we create them.
const stateClassMap: { [key: string]: new () => AbstractBenchmarkState } = {
  [IdleState.name]: IdleState,
  [AwaitingCategoryState.name]: AwaitingCategoryState,
  [AwaitingMenuState.name]: AwaitingMenuState,
  [AwaitingDetailsToolState.name]: AwaitingDetailsToolState,
  [AwaitingConfirmationState.name]: AwaitingConfirmationState,
  [AwaitingVerificationState.name]: AwaitingVerificationState,
  [FinishedState.name]: FinishedState,
};

/**
 * Manages the state and data for a single, active benchmark session.
 * It orchestrates state transitions and persists data using the BenchmarkDbService.
 */
export class BenchmarkContext {
  private _currentState!: AbstractBenchmarkState;
  private dbService: BenchmarkDbService;
  private scorecard!: Scorecard;

  // Public properties accessible by states and commands
  public readonly sessionId: string;
  public runId: string | null; // Run ID can be null if not yet created
  public readonly mcpEntities: McpEntities;
  public reservationDetails: ReservationDetails;
  public readonly capabilities: ClientCapabilities;

  private constructor(
    sessionId: string,
    runId: string | null,
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
    const dbService = new BenchmarkDbService(supabase);
    let runCapabilities: InitializeRequest['params']['capabilities'] = {};
    let loadedScorecard: Scorecard | null = null; // <-- MODIFICATION: Prepare to load scorecard

    if (session.run_id) {
      // SCENARIO 1: Resuming an existing run.
      const runRecord = await dbService.getRun(session.run_id);
      runCapabilities = runRecord.declared_capabilities || {};
      // --- MODIFICATION: Load scorecard from the run record ---
      if (runRecord.results && (runRecord.results as any).details) {
        loadedScorecard = (runRecord.results as any).details as Scorecard;
      }
      // --- END MODIFICATION ---
    } else {
      // SCENARIO 2: A new session that has not yet started a run.
      const initParams = (session.session_data as any)
        ?.initParams as InitializeRequest['params'];
      if (initParams && initParams.capabilities) {
        runCapabilities = initParams.capabilities;
      }
    }

    const context = new BenchmarkContext(
      session.id,
      session.run_id,
      runCapabilities,
      mcpEntities,
      // session_data is now correctly just for reservation details
      (session.session_data as ReservationDetails) || {},
    );

    // --- MODIFICATION: Initialize scorecard based on what was loaded ---
    if (loadedScorecard) {
      context.scorecard = loadedScorecard;
      console.log('[Context] Resumed run with existing scorecard.');
    } else {
      context.scorecard = JSON.parse(JSON.stringify(RUBRIC_TEMPLATE));
      console.log('[Context] Started with a fresh scorecard.');
    }
    // --- END MODIFICATION ---

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
  }

  /**
   * Transitions the context to a new state.
   * @param state The new state object to transition to.
   */
  public async transitionTo(state: AbstractBenchmarkState): Promise<void> {
    const newStateName = state.constructor.name;
    const oldState = this._currentState;

    const exitConfigActions = oldState.getExitConfigActions(this);
    const enterConfigActions = state.getEnterConfigActions(this);

    for (const action of [...exitConfigActions, ...enterConfigActions]) {
      action();
    }

    await oldState.exit(this);

    this._currentState = state;
    // Persist session data (which no longer includes the scorecard)
    await this.dbService.updateSession(
      this.sessionId,
      newStateName,
      this.reservationDetails,
    );

    await this._currentState.enter(this);
  }

  /**
   * Updates the reservation details and persists the session_data to the DB.
   * Note: This no longer persists the scorecard.
   * @param newData A partial object of the reservation details to update.
   */
  public async updateAndPersistSessionData(
    newData: Partial<ReservationDetails>,
  ): Promise<void> {
    // Update local state
    this.reservationDetails = { ...this.reservationDetails, ...newData };
    // Persist to DB - only reservationDetails are saved to the session.
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
  async finalize() {
    const totalScore = Object.values(this.scorecard).reduce(
      (sum, item) => sum + item.pointsEarned,
      0,
    );

    const result = {
      success: totalScore > 50,
      score: totalScore,
      details: this.scorecard,
    };

    await this.dbService.finalizeRun(this.sessionId, result);
  }

  public async ensureRunIsCreated(): Promise<void> {
    if (this.runId) {
      return;
    }

    console.log(
      `[Context] No run found for session ${this.sessionId}. Creating one now.`,
    );
    const newRunId = await this.dbService.createRunForSession(this.sessionId);
    this.runId = newRunId;
  }

  /**
   * Resets the context for a new benchmark run.
   * This clears in-memory details and persists the reset to the database.
   */
  public async resetForNewRun(): Promise<void> {
    this.reservationDetails = {};
    this.scorecard = JSON.parse(JSON.stringify(RUBRIC_TEMPLATE));
    await this.dbService.resetSessionData(this.sessionId);
  }

  /**
   * Awards points and persists the updated scorecard to the run record.
   * @param checkId The ID of the check to award points for.
   * @param status The status to set for this check.
   * @param points The number of points awarded (capped at max).
   * @param notes Optional notes about the award.
   */
  public async awardPoints(
    checkId: keyof typeof RUBRIC_TEMPLATE,
    status: ScorecardLineItem['status'],
    points: number,
    notes?: string,
  ): Promise<void> {
    if (this.scorecard[checkId]) {
      const item = this.scorecard[checkId];
      item.status = status;
      item.pointsEarned = Math.min(points, item.maxPoints);
      item.notes = notes;
      console.log(
        `[Score] Awarded ${item.pointsEarned}/${item.maxPoints} for '${checkId}'. Notes: ${notes || 'N/A'}`,
      );

      await this.ensureRunIsCreated(); // Make sure we have a run to save to.
      await this.dbService.updateRunResult(this.runId!, {
        details: this.scorecard,
      });
    }
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

  public async verifyConfirmationCode(code: string): Promise<CallToolResult> {
    return this._currentState.verifyConfirmationCode(this, code);
  }

  public async tryAgain(): Promise<CallToolResult> {
    return this._currentState.tryAgain(this);
  }

  public get currentState(): AbstractBenchmarkState {
    return this._currentState;
  }
}
