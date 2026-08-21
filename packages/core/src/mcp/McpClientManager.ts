import type { Tool } from "../tools/ToolRegistry.js";

/**
 * Minimal MCP (Model Context Protocol) client manager.
 * Connects to stdio-based MCP servers defined in settings.mcpServers and
 * registers their tools into the shared ToolRegistry.
 *
 * Full HTTP/SSE transport is planned for Phase 2.
 */
export class McpClientManager {
  private clients: Map<string, any> = new Map();

  async connectAll(
    servers: Record<string, { command: string; args?: string[] }>,
  ): Promise<Tool[]> {
    const tools: Tool[] = [];
    // Placeholder: real MCP SDK integration would spawn the process and
    // negotiate tools via the protocol. For v1 we surface an empty list
    // when no servers are configured, and log a note when they are.
    for (const [name, cfg] of Object.entries(servers)) {
      console.log(`[MCP] Would connect to ${name}: ${cfg.command} ${(cfg.args || []).join(" ")}`);
      // Real implementation would use @modelcontextprotocol/sdk Client + StdioClientTransport
    }
    return tools;
  }

  async disconnectAll(): Promise<void> {
    this.clients.clear();
  }
}
