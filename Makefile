SHELL := /bin/bash

# Default commit message if not provided: make push MSG="your message"
MSG ?= chore: dev sync

.PHONY: push build preview up down logs

push:
	@git status -sb
	@echo "Committing and pushing: $(MSG)"
	@git add -A
	@git commit -m "$(MSG)" || echo "No changes to commit"
	@git push -u origin HEAD
	@echo "Pushed to origin. CI will build and deploy."

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
