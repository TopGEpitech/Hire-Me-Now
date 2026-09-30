// MCP server over stdio. add it to Claude Desktop / Claude Code / Cursor:
//   { "command": "npx", "args": ["tsx", "mcp/server.mts"], "cwd": "/path/to/this/repo" }
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// stdout IS the protocol here, a stray log line would break it. set this before the app boots
process.env.LOG_STREAM = "stderr";

const { app } = await import("@/composition/server");
const { PokeApiCatalog } = await import("@/adapters/driven/pokeapi/pokeapi-catalog");
const { createMcpServer } = await import("@/adapters/driving/mcp/mcp-server");

await createMcpServer(app, new PokeApiCatalog()).connect(new StdioServerTransport());
