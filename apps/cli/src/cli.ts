#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { startRepl } from "./repl.js";
import { SessionStore } from "@agentforge/core";

const program = new Command();

program
  .name("agentforge")
  .description("AgentForge - open source terminal-first AI coding agent")
  .version("0.1.0")
  .option("-r, --resume", "Resume the last session")
  .option("--plan", "Start in Plan Mode instead of Agent Mode")
  .action(async (opts) => {
    const cwd = process.cwd();
    let resumeSessionId: string | undefined;

    if (opts.resume) {
      const last = SessionStore.loadLast();
      if (last) resumeSessionId = last.id;
    }

    await startRepl({
      cwd,
      resumeSessionId,
      initialMode: opts.plan ? "plan" : "agent",
    });
  });

program.parse();
