import { TaskGraph } from "./TaskGraph.js";

/**
 * Lightweight structured planner used until the model emits a full graph.
 * Produces a useful default DAG for common coding tasks.
 */
export function planFromGoal(goal: string): TaskGraph {
  const graph = new TaskGraph(goal);
  const g = goal.toLowerCase();

  const explore = graph.addNode({
    kind: "tool_call",
    description: "Explore relevant files and project structure",
    toolName: "list_dir",
    args: { path: "." },
    touches: [],
  });

  const isCodeChange =
    /\b(fix|add|implement|create|edit|refactor|update|write|change)\b/.test(g);
  const isTest = /\b(test|spec|coverage)\b/.test(g);
  const isCommit = /\b(commit|pr|pull request|ship)\b/.test(g);
  const isDebug = /\b(fix|bug|error|failing|broken)\b/.test(g);

  let lastId = explore.id;

  if (isDebug || isCodeChange) {
    const read = graph.addNode({
      kind: "tool_call",
      description: "Read key files related to the task",
      dependsOn: [lastId],
      toolName: "read_file",
      args: {},
    });
    lastId = read.id;
  }

  if (isCodeChange) {
    const edit = graph.addNode({
      kind: "tool_call",
      description: "Apply code changes",
      dependsOn: [lastId],
      toolName: "write_file",
      args: {},
      touches: ["src/"],
    });
    lastId = edit.id;

    const verify = graph.addNode({
      kind: "verification",
      description: "Verify changes (typecheck / lint)",
      dependsOn: [edit.id],
      verifyCommands: ["typecheck", "lint"],
    });
    lastId = verify.id;
  }

  if (isTest || isCodeChange) {
    const test = graph.addNode({
      kind: "verification",
      description: "Run tests",
      dependsOn: [lastId],
      verifyCommands: ["test"],
    });
    lastId = test.id;
  }

  if (isCommit) {
    graph.addNode({
      kind: "human_review",
      description: "Prepare commit (show diff, wait for confirmation)",
      dependsOn: [lastId],
      toolName: "git",
      args: { action: "status" },
    });
  }

  if (graph.getNodes().length === 1) {
    graph.addNode({
      kind: "tool_call",
      description: "Execute the requested task",
      dependsOn: [explore.id],
    });
  }

  graph.setStatus("running");
  return graph;
}

export function addVerificationAfter(
  graph: TaskGraph,
  afterIds: string[],
  commands: string[],
  description = "Verify changes",
): string {
  const node = graph.addNode({
    kind: "verification",
    description,
    dependsOn: afterIds,
    verifyCommands: commands,
  });
  return node.id;
}
