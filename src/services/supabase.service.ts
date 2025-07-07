import { SupabaseClient } from '@supabase/supabase-js';
import {
  BenchmarkRun,
  BenchmarkSession,
  ClientInfo,
  ReservationDetails,
} from '../benchmark/core/benchmark-types';
import { createClient } from '../db/supabase';
import { InitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Export the client for direct use if needed, and the service for structured access
export const supabase: SupabaseClient = createClient();

/**
 * Manages all database operations for the benchmark service.
 */
export class BenchmarkDbService {
  private db: SupabaseClient;

  constructor(supabaseInstance: SupabaseClient) {
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
   * Retrieves a benchmark session by its ID. If it doesn't exist, it creates
   * all necessary records (client, run, session) and returns the new session.
   * This is the primary method for starting or resuming a session.
   * @param sessionId The transport-generated session identifier.
   * @param clientInfo The client info, required only if creating a new session.
   * @returns A promise that resolves to the full BenchmarkSession object.
   */
  public async getOrCreateSession(
    sessionId: string,
    initParams: InitializeRequest['params'],
  ): Promise<BenchmarkSession> {
    // 1. Try to get the existing session first.
    const { data: existingSession } = await this.db
      .from('benchmark_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (existingSession) {
      return existingSession as BenchmarkSession;
    }

    // 2. If it doesn't exist, create the full stack.
    const clientInfo = initParams.clientInfo;
    const capabilities = initParams.capabilities; // <-- Get capabilities here

    const clientId = await this.findOrCreateClient(clientInfo);

    // Create the parent benchmark_runs record
    const { data: runData, error: runError } = await this.db
      .from('benchmark_runs')
      .insert({
        client_id: clientId,
        status: 'in_progress',
        declared_capabilities: capabilities, // <-- SAVE THE CAPABILITIES
      })
      .select('id')
      .single();

    if (runError || !runData)
      throw runError || new Error('Failed to create benchmark run.');
    const runId = runData.id;

    // Create the live benchmark_sessions record
    const newSessionData: Omit<BenchmarkSession, 'created_at' | 'updated_at'> =
      {
        id: sessionId,
        run_id: runId,
        current_step: 'IdleState', // The name of the initial state class
        session_data: {},
      };

    const { data: newSession, error: sessionError } = await this.db
      .from('benchmark_sessions')
      .insert(newSessionData)
      .select()
      .single();

    if (sessionError || !newSession)
      throw sessionError || new Error('Failed to create benchmark session.');

    return newSession as BenchmarkSession;
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
   * Finalizes a benchmark run, calculating results and cleaning up the session.
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
        results: { score: result.score, details: result.details },
        time_to_completion_ms: timeToCompletion,
        completed_at: endTime.toISOString(),
      })
      .eq('id', runId);
    if (updateError) throw updateError;

    // 4. Clean up the live session
    const { error: deleteError } = await this.db
      .from('benchmark_sessions')
      .delete()
      .eq('id', sessionId);
    if (deleteError) throw deleteError;
  }
}
