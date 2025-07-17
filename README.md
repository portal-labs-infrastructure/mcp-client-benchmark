[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/portal-labs-infrastructure-mcp-client-benchmark-badge.png)](https://mseep.ai/app/portal-labs-infrastructure-mcp-client-benchmark)

# MCP Client Benchmark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

An automated benchmark and public leaderboard for [Model-Context Protocol (MCP)](https://modelcontext.dev/) clients. This project provides a standardized testing ground to evaluate client capabilities against a consistent set of tasks.

The goal is to foster a robust ecosystem of capable clients by providing developers with a transparent, objective, and easy-to-use evaluation tool.

## Live Dashboard

View the live results, see how different clients perform, and check your own run history on the public dashboard:

**[➡️ View the Leaderboard at remote-mcp-servers.com/clients](https://remote-mcp-servers.com/clients)**

## Key Features

- **Automated Testing:** A state machine-driven server that guides clients through a series of capability checks.
- **Rubric-Based Scoring:** A detailed scoring system that awards points based on the successful completion of specific tasks.
- **Public Leaderboard:** A live, ranked dashboard showcasing the performance of all participating clients.
- **Detailed Run Analysis:** Drill down into any specific run to see a full scorecard and identify areas for improvement.
- **Easy Participation:** Simply add our server URL to your favorite MCP client.

## How to Participate

Getting your client on the leaderboard is simple.

1.  **Open your preferred MCP client** (e.g., Portal One, MCP Inspector).
2.  Find the option to **add a new remote server**.
3.  When prompted for the URL, use the following endpoint:

```
https://mcp-client-benchmark.remote-mcp-servers.com/mcp
```

Once connected, the benchmark server will appear in your client. Interacting with it will start the evaluation process. After the run is complete, refresh the leaderboard page to see your results.

## The Benchmark Rubric

Our scoring system is designed to be transparent. Points are awarded based on the successful completion of specific tasks that map to core MCP capabilities.

| Check ID              | Description                                                        | Max Points |
| --------------------- | ------------------------------------------------------------------ | :--------: |
| `elicitation_support` | Client correctly handles a server-initiated `elicitation/request`. |     25     |
| `sampling_support`    | Client uses `sampling/create_message` to generate dynamic text.    |     20     |
| `resource_reading`    | Client can read content from a dynamically enabled `resource`.     |     25     |
| `code_verification`   | Client submits data from a resource to a tool correctly.           |     25     |
| **Total**             |                                                                    |   **95**   |

## Contributing

Contributions are welcome! Whether it's improving the benchmark logic, enhancing the dashboard, or fixing a bug, please feel free to open an issue or submit a pull request.

1.  **Fork the repository.**
2.  **Create a new feature branch.** (`git checkout -b feature/your-amazing-feature`)
3.  **Commit your changes.** (`git commit -m 'Add some amazing feature'`)
4.  **Push to the branch.** (`git push origin feature/your-amazing-feature`)
5.  **Open a Pull Request.**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
