# Spacer Development & Deployment Instructions

This guide explains how to build, test, and deploy Spacer for local development and production. Follow these steps during any development progress. These instructions are referenced at the top of `dev_checlist.md`.

---

## Local Development & Quick Testing

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm run dev
   ```

   - Open the printed URL in your browser (default: [http://localhost:5173](http://localhost:5173)).

3. **Preview production build**

   ```bash
   npm run build
   npm run preview -- --port 5173 --strictPort
   ```

   - This serves the built files as they would appear in production.

4. **Run Playwright snapshots (optional visual regression)**

   ```bash
   npm run snap
   ```

   - Screenshots are saved in `playwright_screenshots/`.

---

## Docker-based Local Testing

1. **Build and run with local code (no CI delay):**

   ```bash
   make up-local
   ```

   - Uses `docker-compose.yml` + `docker-compose.local.yml` to build from your current code and start the container.

2. **Stop and clean up containers/images:**

   ```bash
   make down-clean
   ```

---

## Pushing Changes & CI/CD

1. **Commit and push your changes:**

   ```bash
   make push MSG="your commit message"
   ```

   - This will commit all changes and push to the remote repository. CI will build and deploy automatically.

2. **Force a CI redeploy (no code changes):**

   ```bash
   make deploy-ci
   ```

   - Creates an empty commit to trigger CI/CD pipeline.

3. **Trigger CI workflow manually (requires GitHub CLI):**

   ```bash
   make dispatch-ci
   ```

   - Dispatches the workflow via GitHub CLI if installed.

---

## Additional Makefile Targets

- `make build` — Installs dependencies and builds the project.
- `make preview` — Serves the production build locally.
- `make up` — Runs the published image from GHCR (production-like test).
- `make down` — Stops the running container.
- `make logs` — Follows container logs.
- `make pull` — Pulls the latest published image.
- `make refresh` — Pulls and force-recreates the container.

---

## Notes

- All Docker Compose commands use the `spacer` service and the external `web` network for Traefik routing.
- For local builds, the Dockerfile uses multi-stage Node → Nginx static serving.
- See `dev_checlist.md` for current development priorities and checklist.
- See `README.md` for game overview and controls.

---

## Troubleshooting

- If you encounter issues with Docker or Nginx, check `nginx.conf` and container logs (`make logs`).
- For CI/CD issues, check GitHub Actions tab for workflow status.
