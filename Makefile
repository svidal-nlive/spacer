SHELL := /bin/bash

# Default commit message if not provided: make push MSG="your message"
MSG ?= chore: dev sync

.PHONY: push build preview up down logs deploy-ci dispatch-ci

push:
	@git status -sb
	@echo "Committing and pushing: $(MSG)"
	@git add -A
	@git commit -m "$(MSG)" || echo "No changes to commit"
	@git push -u origin HEAD
	@echo "Pushed to origin. CI will build and deploy."

# Force a CI run even when there are no file changes by creating an empty commit
deploy-ci:
	@echo "Creating empty commit to trigger CI deploy..."
	@git commit --allow-empty -m "ci: redeploy $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")"
	@git push -u origin HEAD
	@echo "Pushed empty commit to origin. CI should build and deploy."

# Alternatively, trigger the workflow via GitHub CLI (requires gh to be installed and authenticated)
dispatch-ci:
	@which gh >/dev/null 2>&1 || (echo "gh CLI not found. Install GitHub CLI or use 'make deploy-ci'" && exit 1)
	@echo "Dispatching workflow build-and-push via GitHub CLI..."
	@gh workflow run build-and-push.yml || gh workflow run build-and-push
	@echo "Workflow dispatch requested. Check GitHub Actions tab."

# Local helpers
build:
	@npm install --silent
	@npm run -s build

preview:
	@npm run -s preview -- --port 5173 --strictPort

up:
	@docker compose up -d --build spacer

down:
	@docker compose down

logs:
	@docker compose logs -f --tail=200 spacer
