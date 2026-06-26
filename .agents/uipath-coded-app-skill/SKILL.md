---
name: uipath-coded-app-skill
description: Helper skill for scaffolding, building, and deploying UiPath Coded Apps from the sample Maestro app.
---

# UiPath Coded Apps Skill

This skill provides commands and scripts to work with UiPath Coded Apps within the **sample** directory of the Maestro application.

## Features

- **Scaffold a new coded app** using `uip codedapp init` with the appropriate configuration.
- **Build** the app (`npm run build` or `uip codedapp build`) and generate the deployment bundle.
- **Publish** the app to UiPath Cloud (`uip codedapp publish`) with automatic version bump.
- **Run locally** for development (`uip codedapp dev`).
- **Utility scripts** for updating the `app.config.json` and `action-schema.json` files.

## Usage

From the repository root:

```sh
# Navigate to the sample Coded App directory (if it exists)
cd .agents/uipath-coded-app-skill/sample

# Initialize a new coded app
uip codedapp init --name MyApp --template basic

# Build the app
uip codedapp build

# Publish to UiPath
uip codedapp publish --tenant <tenant-id> --org <org-id>
```

## Scripts

The `scripts/` folder contains:
- `init.sh` – Wrapper around `uip codedapp init`.
- `publish.sh` – Publishes the app and logs the result.
- `update-config.js` – Node script to programmatically modify `app.config.json`.

## References

- UiPath Coded Apps documentation: https://docs.uipath.com/coded-apps
- `@uipath/uipath-typescript` SDK used in the Maestro app.

---
*Add this skill to your workspace by placing the folder under `.agents` as shown above.*
