# example-plugin

Demonstrates AgentForge's plugin API: registering a new tool (`word_count`)
and a new slash command (`/example`) from one plugin.

## Build

The `PluginLoader` loads compiled `index.js`, not `index.ts` directly:

```bash
npx tsc index.ts --module NodeNext --moduleResolution NodeNext --target ES2022 --outDir .
```

This produces `index.js` next to `index.ts`, which AgentForge will pick up
automatically from the `plugins/` directory on next startup.
