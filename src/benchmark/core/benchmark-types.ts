import {
  McpServer,
  RegisteredResource,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ClientCapabilities,
  InitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';

// From the MCP initialize request
export interface ClientInfo {
  name: string;
  version: string;
  // You can add other fields from the clientInfo object if needed
}

export interface RestaurantDetails {
  id: string; // Unique identifier for the restaurant
  name: string; // Name of the restaurant
  description: string; // Description of the restaurant
}

// Data collected during the benchmark run
export interface ReservationDetails {
  initParams?: InitializeRequest['params'];
  category?: string;
  menu?: string;
  guests?: number;
  time?: string;
  summary?: string;
  confirmationCode?: string;
  confirmationEmail?: string; // The text of the confirmation email
}

// Maps to the 'benchmark_sessions' table
export interface BenchmarkSession {
  id: string; // session_id
  run_id: string | null; // The ID of the run this session is associated with, if any
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
  score?: number; // Final score for the run
  results?: object; // Final scoring details
  steps_log: object[];
  created_at: string;
  completed_at?: string;
}

export interface ScorecardLineItem {
  description: string; // e.g., "Responds to Elicitation Request"
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'PARTIAL' | 'SKIPPED';
  pointsEarned: number;
  maxPoints: number;
  notes?: string; // e.g., "Client used fallback instead of primary method."
}

export interface Scorecard {
  [key: string]: ScorecardLineItem;
}

// Holds the live, in-memory MCP objects for a session
export interface McpEntities {
  server: McpServer;
  // Tools
  startBenchmarkTool: RegisteredTool | null;
  chooseCategoryTool: RegisteredTool | null;
  selectMenuTool: RegisteredTool | null;
  getConfirmationEmailTool: RegisteredTool | null;
  verifyCodeTool: RegisteredTool | null;
  submitDetailsTool: RegisteredTool | null;
  tryAgainTool?: RegisteredTool | null;
  // Resources
  restaurantListResource: RegisteredResource | null;
  confirmationEmailResource?: RegisteredResource | null;
  benchmarkResultsResource?: RegisteredResource | null;
  // Add other tools/resources as needed
}
