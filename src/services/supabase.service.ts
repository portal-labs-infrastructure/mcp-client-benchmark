import { SupabaseClient } from '@supabase/supabase-js';
import {
  BenchmarkRun,
  BenchmarkSession,
  ClientInfo,
  ReservationDetails,
  Scorecard, // <-- Import Scorecard type
} from '../benchmark/core/benchmark-types';
import { createClient } from '../db/supabase';
import { InitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Database } from '../../types/supabase';

// Export the client for direct use if needed, and the service for structured access
export const supabase: SupabaseClient<Database> = createClient();

/**
 * Manages all database operations for the benchmark service.
 */
export class BenchmarkDbService {
  private db: SupabaseClient;

  constructor(supabaseInstance: SupabaseClient<Database>) {
    this.db = supabaseInstance;
  }

  /**
   * Finds a client by its info, or creates a new one if it doesn't exist.
   * @param clientInfo The client information from the MCP initialize request.
   * @returns The UUID of the client record.
   */
  async findOrCreateClient(clientInfo: ClientInfo): Promise<string> {
    // Supabase syntax for querying a JSONB column
    const { data: existingClient, error: findError } = await this.db
      .from('clients')
      .select('id')
      .eq('client_info->>name', clientInfo.name)
      .eq('client_info->>version', clientInfo.version)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 = "exact one row not found"
      throw findError;
    }

    if (existingClient) {
      return existingClient.id;
    }

    // Create a new client
    const { data: newClient, error: createError } = await this.db
      .from('clients')
      .insert({ client_info: clientInfo })
      .select('id')
      .single();

    if (createError || !newClient) {
      throw createError || new Error('Failed to create new client.');
    }

    return newClient.id;
  }
  /**
   * MODIFIED: Creates a session without a run. The run is created later.
   */
  public async getOrCreateSession(
    sessionId: string,
    initParams: InitializeRequest['params'],
  ): Promise<BenchmarkSession> {
    const { data: existingSession } = await this.db
      .from('benchmark_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (existingSession) {
      return existingSession as BenchmarkSession;
    }

    // --- THE CHANGE ---
    // We no longer create a benchmark_runs record here.
    // Instead, we store the initParams in the session_data to use later.
    const newSessionData: Omit<BenchmarkSession, 'created_at' | 'updated_at'> =
      {
        id: sessionId,
        run_id: null, // The run has not started yet.
        current_step: 'IdleState',
        session_data: {
          // Store init params so we can create the run correctly when the user clicks "start".
          initParams,
        },
      };

    const { data: newSession, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .insert(newSessionData)
      .select()
      .single();

    if (sessionError || !newSession) {
      throw sessionError || new Error('Failed to create benchmark session.');
    }

    return newSession as BenchmarkSession;
  }

  /**
   * NEW METHOD: Creates a run record and links it to an existing session.
   * This is called when the user actually starts the benchmark.
   * @returns The ID of the newly created run.
   */
  public async createRunForSession(sessionId: string): Promise<string> {
    // 1. Get the session and its stored initParams
    const { data: session, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .select('session_data')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw sessionError || new Error('Session not found to create run for.');
    }

    const initParams = (session.session_data as any)
      ?.initParams as InitializeRequest['params'];
    if (!initParams) {
      throw new Error('initParams not found in session data.');
    }

    // 2. Create the client record
    const clientId = await this.findOrCreateClient(initParams.clientInfo);

    // 3. Create the benchmark_runs record
    const { data: runData, error: runError } = await this.db
      .from('benchmark_runs')
      .insert({
        client_id: clientId,
        status: 'in_progress',
        declared_capabilities: initParams.capabilities,
      })
      .select('id')
      .single();

    if (runError || !runData) {
      throw runError || new Error('Failed to create benchmark run.');
    }
    const newRunId = runData.id;

    // 4. Update the session to link to the new run
    const { error: updateError } = await this.db
      .from('benchmark_sessions')
      .update({ run_id: newRunId })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    console.log(`[DB] Created run ${newRunId} for session ${sessionId}.`);
    return newRunId;
  }

  /**
   * Retrieves the full benchmark_runs record by its ID.
   * @param runId The UUID of the run to retrieve.
   */
  public async getRun(runId: string): Promise<BenchmarkRun> {
    const { data, error } = await this.db
      .from('benchmark_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !data) {
      throw (
        error || new Error(`Could not find benchmark run with ID: ${runId}`)
      );
    }
    return data as BenchmarkRun;
  }

  /**
   * Updates the `results` column of a run record with the latest scorecard.
   * This is used for persisting progress during an incomplete run.
   * @param runId The UUID of the run to update.
   * @param result The partial result object containing the scorecard details.
   */
  async updateRunResult(
    runId: string,
    result: { details: Scorecard },
  ): Promise<void> {
    // Calculate the current score from the provided details.
    const score = Object.values(result.details).reduce(
      (sum, item) => sum + item.pointsEarned,
      0,
    );

    // Structure the payload to match the `results` column format.
    const resultsPayload = {
      score,
      details: result.details,
    };

    const { error } = await this.db
      .from('benchmark_runs')
      .update({
        results: resultsPayload,
        // Also update the score at the top level for easy querying
        score: score,
      })
      .eq('id', runId);

    if (error) {
      console.error(`[DB] Error updating run result for ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Updates the state of a live session.
   * @param sessionId The UUID of the session to update.
   * @param step The new current_step.
   * @param data The new session_data.
   */
  async updateSession(
    sessionId: string,
    step: string,
    data: ReservationDetails,
  ) {
    const { error } = await this.db
      .from('benchmark_sessions')
      .update({
        current_step: step,
        session_data: data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Finalizes a benchmark run, calculating results and updating the session state.
   * @param sessionId The UUID of the session that has finished.
   * @param result The final result object.
   */
  async finalizeRun(
    sessionId: string,
    result: { success: boolean; score: number; details: object },
  ) {
    // 1. Get run_id and start_time from the session and run tables
    const { data: session, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .select('run_id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session)
      throw sessionError || new Error('Session not found for finalization.');
    const runId = session.run_id;

    const { data: run, error: runError } = await this.db
      .from('benchmark_runs')
      .select('created_at')
      .eq('id', runId)
      .single();
    if (runError || !run)
      throw runError || new Error('Run not found for finalization.');

    // 2. Calculate duration
    const startTime = new Date(run.created_at);
    const endTime = new Date();
    const timeToCompletion = endTime.getTime() - startTime.getTime();

    // 3. Update the final run record
    const { error: updateError } = await this.db
      .from('benchmark_runs')
      .update({
        status: 'completed',
        success: result.success,
        score: result.score,
        results: { score: result.score, details: result.details },
        time_to_completion_ms: timeToCompletion,
        completed_at: endTime.toISOString(),
      })
      .eq('id', runId);
    if (updateError) throw updateError;

    // 4. *** THE FIX ***: Update the session to 'FinishedState' instead of deleting it.
    // This keeps the session alive so the user can see results and try again.
    const { error: updateSessionError } = await this.db
      .from('benchmark_sessions')
      .update({
        current_step: 'FinishedState',
        session_data: {}, // Clear session data as it's now stored in the run
      })
      .eq('id', sessionId);
    if (updateSessionError) throw updateSessionError;
  }

  /**
   * Resets a session for a new run. It creates a new `benchmark_runs` record
   * and points the existing `benchmark_sessions` record to it.
   * @param sessionId The UUID of the session to reset.
   */
  public async resetSessionData(sessionId: string): Promise<void> {
    // 1. Get the current run to find the client_id and capabilities.
    const { data: currentSession, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .select('run_id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !currentSession)
      throw sessionError || new Error('Session not found for reset.');

    const { data: currentRun, error: runError } = await this.db
      .from('benchmark_runs')
      .select('client_id, declared_capabilities')
      .eq('id', currentSession.run_id)
      .single();
    if (runError || !currentRun)
      throw runError || new Error('Original run not found for reset.');

    // 2. Create a new `benchmark_runs` record for the same client.
    const { data: newRun, error: newRunError } = await this.db
      .from('benchmark_runs')
      .insert({
        client_id: currentRun.client_id,
        status: 'in_progress',
        declared_capabilities: currentRun.declared_capabilities,
      })
      .select('id')
      .single();
    if (newRunError || !newRun)
      throw newRunError || new Error('Failed to create new run for reset.');

    // 3. Update the existing session to point to the new run and reset its state.
    const { error: updateError } = await this.db
      .from('benchmark_sessions')
      .update({
        run_id: newRun.id,
        current_step: 'IdleState',
        session_data: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    if (updateError) throw updateError;

    console.log(
      `[DB] Session ${sessionId} has been reset with new run ID ${newRun.id}.`,
    );
  }

  /**
   * Retrieves the most recently completed run for a given session.
   * @param sessionId The session to find the latest run for.
   */
  public async getLatestRunForSession(
    sessionId: string,
  ): Promise<BenchmarkRun | null> {
    const { data: session, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .select('run_id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) return null;

    return this.getRun(session.run_id);
  }

  /**
   * Retrieves all successful runs, ordered by score and then time, for ranking.
   */
  public async getAllSuccessfulRunsRanked(): Promise<BenchmarkRun[]> {
    const { data, error } = await this.db
      .from('benchmark_runs')
      .select('*')
      .eq('status', 'completed')
      .eq('success', true)
      .order('score', { ascending: false })
      .order('time_to_completion_ms', { ascending: true });

    if (error) throw error;
    return data as BenchmarkRun[];
  }
}
