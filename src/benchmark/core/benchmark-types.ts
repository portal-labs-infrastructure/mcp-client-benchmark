import {
  McpServer,
  RegisteredResource,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

// From the MCP initialize request
export interface ClientInfo {
  name: string;
  version: string;
  // You can add other fields from the clientInfo object if needed
}

// Data collected during the benchmark run
export interface ReservationDetails {
  category?: string;
  menu?: string;
  guests?: number;
  time?: string;
  summary?: string;
}

// Maps to the 'benchmark_sessions' table
export interface BenchmarkSession {
  id: string; // session_id
  run_id: string;
  current_step: string;
  session_data: ReservationDetails;
}

// Maps to the 'benchmark_runs' table
export interface BenchmarkRun {
  id: string;
  client_id: string;
  declared_capabilities: ClientCapabilities;
  status: 'in_progress' | 'completed' | 'failed';
  success?: boolean;
  time_to_completion_ms?: number;
  results?: object; // Final scoring details
  steps_log: object[];
  created_at: string;
  completed_at?: string;
}

// Holds the live, in-memory MCP objects for a session
export interface McpEntities {
  server: McpServer;
  // Tools
  startBenchmarkTool: RegisteredTool | null;
  chooseCategoryTool: RegisteredTool | null;
  selectMenuTool: RegisteredTool | null;
  getConfirmationEmailTool: RegisteredTool | null;
  // Resources
  restaurantListResource: RegisteredResource | null;
  submitDetailsTool: RegisteredTool | null;
  // Add other tools/resources as needed
}
