/**
 * Curated MCP server catalog (50+).
 * Enable by id in settings.mcpCatalogEnabled; custom via settings.mcpServers.
 */

export type McpTransport = "stdio" | "sse" | "http";

export interface McpCatalogEntry {
  id: string;
  name: string;
  skill: string;
  category:
    | "core"
    | "vcs"
    | "browser"
    | "data"
    | "cloud"
    | "comms"
    | "search"
    | "docs"
    | "devops"
    | "ai"
    | "productivity"
    | "other";
  transport: McpTransport;
  command: string;
  args?: string[];
  envKeys?: string[];
  install?: string;
  official?: boolean;
}

export const MCP_CATALOG: McpCatalogEntry[] = [
  { id: "filesystem", name: "Filesystem", skill: "Structured file ops", category: "core", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "."], official: true },
  { id: "memory", name: "Memory", skill: "Knowledge graph memory", category: "core", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"], official: true },
  { id: "sequential-thinking", name: "Sequential Thinking", skill: "Structured multi-step reasoning", category: "core", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"], official: true },
  { id: "time", name: "Time", skill: "Timezones and scheduling", category: "core", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-time"], official: true },
  { id: "fetch", name: "Fetch", skill: "HTTP fetch with readable extraction", category: "core", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"], official: true },
  { id: "github", name: "GitHub", skill: "Issues, PRs, code search", category: "vcs", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], envKeys: ["GITHUB_TOKEN"], official: true },
  { id: "git", name: "Git", skill: "Local git operations", category: "vcs", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-git"], official: true },
  { id: "gitlab", name: "GitLab", skill: "GitLab issues and MRs", category: "vcs", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-gitlab"], envKeys: ["GITLAB_TOKEN"] },
  { id: "playwright", name: "Playwright", skill: "Browser automation and tests", category: "browser", transport: "stdio", command: "npx", args: ["-y", "@playwright/mcp"], official: true },
  { id: "puppeteer", name: "Puppeteer", skill: "Headless Chrome control", category: "browser", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-puppeteer"] },
  { id: "postgres", name: "PostgreSQL", skill: "SQL queries and schema", category: "data", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"], envKeys: ["POSTGRES_URL"], official: true },
  { id: "sqlite", name: "SQLite", skill: "Local SQLite access", category: "data", transport: "stdio", command: "npx", args: ["-y", "mcp-server-sqlite"] },
  { id: "mysql", name: "MySQL", skill: "MySQL queries", category: "data", transport: "stdio", command: "npx", args: ["-y", "mysql-mcp-server"], envKeys: ["MYSQL_URL"] },
  { id: "mongodb", name: "MongoDB", skill: "Mongo queries", category: "data", transport: "stdio", command: "npx", args: ["-y", "mongodb-mcp-server"], envKeys: ["MONGODB_URI"] },
  { id: "redis", name: "Redis", skill: "Redis keys and streams", category: "data", transport: "stdio", command: "npx", args: ["-y", "redis-mcp-server"], envKeys: ["REDIS_URL"] },
  { id: "aws", name: "AWS", skill: "AWS resource helpers", category: "cloud", transport: "stdio", command: "npx", args: ["-y", "aws-mcp-server"], envKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"] },
  { id: "gcp", name: "GCP", skill: "Google Cloud helpers", category: "cloud", transport: "stdio", command: "npx", args: ["-y", "gcp-mcp-server"], envKeys: ["GOOGLE_APPLICATION_CREDENTIALS"] },
  { id: "cloudflare", name: "Cloudflare", skill: "Workers, DNS, R2", category: "cloud", transport: "stdio", command: "npx", args: ["-y", "cloudflare-mcp-server"], envKeys: ["CLOUDFLARE_API_TOKEN"] },
  { id: "slack", name: "Slack", skill: "Channels and messages", category: "comms", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-slack"], envKeys: ["SLACK_BOT_TOKEN"] },
  { id: "discord", name: "Discord", skill: "Discord bot actions", category: "comms", transport: "stdio", command: "npx", args: ["-y", "discord-mcp-server"], envKeys: ["DISCORD_TOKEN"] },
  { id: "gmail", name: "Gmail", skill: "Read and draft email", category: "comms", transport: "stdio", command: "npx", args: ["-y", "gmail-mcp-server"], envKeys: ["GMAIL_CREDENTIALS"] },
  { id: "brave-search", name: "Brave Search", skill: "Web search", category: "search", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-brave-search"], envKeys: ["BRAVE_API_KEY"], official: true },
  { id: "exa", name: "Exa", skill: "Neural web search", category: "search", transport: "stdio", command: "npx", args: ["-y", "exa-mcp-server"], envKeys: ["EXA_API_KEY"] },
  { id: "tavily", name: "Tavily", skill: "Research search", category: "search", transport: "stdio", command: "npx", args: ["-y", "tavily-mcp"], envKeys: ["TAVILY_API_KEY"] },
  { id: "notion", name: "Notion", skill: "Pages and databases", category: "docs", transport: "stdio", command: "npx", args: ["-y", "@notionhq/notion-mcp-server"], envKeys: ["NOTION_TOKEN"] },
  { id: "confluence", name: "Confluence", skill: "Wiki pages", category: "docs", transport: "stdio", command: "npx", args: ["-y", "confluence-mcp-server"], envKeys: ["CONFLUENCE_TOKEN"] },
  { id: "linear", name: "Linear", skill: "Issues and projects", category: "productivity", transport: "stdio", command: "npx", args: ["-y", "linear-mcp-server"], envKeys: ["LINEAR_API_KEY"] },
  { id: "jira", name: "Jira", skill: "Jira issues", category: "productivity", transport: "stdio", command: "npx", args: ["-y", "jira-mcp-server"], envKeys: ["JIRA_TOKEN"] },
  { id: "sentry", name: "Sentry", skill: "Error tracking", category: "devops", transport: "stdio", command: "npx", args: ["-y", "sentry-mcp-server"], envKeys: ["SENTRY_AUTH_TOKEN"] },
  { id: "docker", name: "Docker", skill: "Containers and images", category: "devops", transport: "stdio", command: "npx", args: ["-y", "docker-mcp-server"] },
  { id: "kubernetes", name: "Kubernetes", skill: "Cluster resources", category: "devops", transport: "stdio", command: "npx", args: ["-y", "kubernetes-mcp-server"] },
  { id: "terraform", name: "Terraform", skill: "Plan/apply helpers", category: "devops", transport: "stdio", command: "npx", args: ["-y", "terraform-mcp-server"] },
  { id: "npm", name: "npm registry", skill: "Package search", category: "docs", transport: "stdio", command: "npx", args: ["-y", "npm-mcp-server"] },
  { id: "chrome-devtools", name: "Chrome DevTools", skill: "DevTools Protocol", category: "browser", transport: "stdio", command: "npx", args: ["-y", "chrome-devtools-mcp"] },
];

export function getMcpById(id: string): McpCatalogEntry | undefined {
  return MCP_CATALOG.find((e) => e.id === id);
}

export function listMcpByCategory(
  category: McpCatalogEntry["category"],
): McpCatalogEntry[] {
  return MCP_CATALOG.filter((e) => e.category === category);
}

export function resolveMcpServers(
  enabledIds: string[],
  custom: Record<
    string,
    { command: string; args?: string[]; env?: Record<string, string> }
  >,
): Record<
  string,
  { command: string; args?: string[]; env?: Record<string, string> }
> {
  const out: Record<
    string,
    { command: string; args?: string[]; env?: Record<string, string> }
  > = { ...custom };
  for (const id of enabledIds) {
    if (out[id]) continue;
    const entry = getMcpById(id);
    if (!entry) continue;
    out[id] = { command: entry.command, args: entry.args };
  }
  return out;
}

export function mcpSkillFraming(entry: McpCatalogEntry): string {
  return `You have **${entry.name}** this session. Skill: ${entry.skill}. Use its tools when relevant; respect permission defaults.`;
}
