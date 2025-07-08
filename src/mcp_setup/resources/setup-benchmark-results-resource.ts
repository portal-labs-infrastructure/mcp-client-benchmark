import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { activeContexts } from '../../controllers/mcp.controller';
import { BenchmarkDbService, supabase } from '../../services/supabase.service';

const RESULTS_URI = 'mcp://benchmark-server/results';

export function setupBenchmarkResultsResource(
  server: McpServer,
): RegisteredResource {
  const handler = async (
    uri: URL,
    mcpContext: RequestHandlerExtra<any, any>,
  ): Promise<ReadResourceResult> => {
    const sessionId = mcpContext.sessionId;
    if (!sessionId) throw new Error('Session ID not found on transport.');

    const context = activeContexts.get(sessionId);
    if (!context) throw new Error(`No active context for session ${sessionId}`);

    const dbService = new BenchmarkDbService(supabase);

    // Fetch the most recent completed run for this session
    const thisRun = await dbService.getLatestRunForSession(sessionId);
    if (!thisRun) {
      return {
        contents: [
          {
            uri: RESULTS_URI,
            text: 'Could not find results for this session.',
            mimeType: 'text/plain',
          },
        ],
      };
    }

    // Fetch all successful runs to calculate ranking
    const allRuns = await dbService.getAllSuccessfulRunsRanked();
    const rank = allRuns.findIndex((run) => run.id === thisRun.id) + 1;
    const totalRuns = allRuns.length;

    const timeTaken = thisRun.time_to_completion_ms
      ? (thisRun.time_to_completion_ms / 1000).toFixed(2)
      : 'N/A';

    const resultsText = `
--- Benchmark Results ---
Status: ${thisRun.success ? 'SUCCESS' : 'FAILED'}
Score: ${thisRun.score || 'N/A'}
Time: ${timeTaken}s
Rank: ${rank || 'N/A'} out of ${totalRuns} successful runs.
Results: ${JSON.stringify(thisRun.results, null, 2)}
    `;

    return {
      contents: [
        {
          uri: RESULTS_URI,
          text: resultsText.trim(),
          mimeType: 'text/plain',
        },
      ],
    };
  };

  const resource = server.registerResource(
    'benchmark-results',
    RESULTS_URI,
    {
      title: 'Benchmark Results Resource',
      description:
        'This resource contains the results of your benchmark evaluation, including score, time taken, and ranking.',
    },
    handler,
  );
  resource.disable();
  return resource;
}
