# example-plugin

Demonstrates AgentForge's plugin API: registering a new tool (`word_count`)
and a new slash command (`/example`) from one plugin.

## Build

The `PluginLoader` loads compiled `index.js`, not `index.ts` directly.
