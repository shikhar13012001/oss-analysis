# Hermes v2 Complete

Hermes ingests GitHub repositories from Telegram, runs a commercial-viability analysis with Ollama Cloud, stores the results as drafts in Sanity, and renders them in a Next.js frontend.

## Public channel listener

This repo now supports listening to the public Telegram channel [github_repos](https://t.me/github_repos).

The new listener flow:

1. Subscribe to new posts from `https://t.me/github_repos`
2. Extract the first GitHub URL in each Telegram post
3. Pass the full Telegram post text into the repo-analysis prompt as supplemental context
4. Save the analysis plus source-channel metadata into Sanity

## Ingestion modes

`python -m bot.main`

- Uses the Telegram Bot API
- Best for channels where your bot is an admin
- Sends Telegram status replies for qualified/rejected outcomes

`python -m bot.channel_listener`

- Uses Telethon with a Telegram user session
- Best for public channels like `https://t.me/github_repos`
- Backfills recent posts and then keeps listening for new ones
- Stores `sourceChannel`, `sourceMessageUrl`, and `sourceMessageText` with each analysis

## Core flow

1. Telegram post arrives
2. Hermes extracts the GitHub URL
3. Hermes fetches repo metadata, README, and LICENSE from GitHub
4. Ollama Cloud analyses the repo using repository data plus Telegram post context
5. The result is written to Sanity as a draft
6. The website reads the draft and displays it locally

## Setup

Use [SETUP.md](/D:/claude-work/hermes-v2-complete/SETUP.md) for the full setup.
Use [DEPLOY.md](/D:/claude-work/hermes-v2-complete/DEPLOY.md) for container deployment of the backend worker and frontend web app.

For the public listener mode you will need:

- `TELEGRAM_CHANNEL_URL=https://t.me/github_repos`
- `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org)
- `python -m bot.channel_listener`

The first Telethon run will prompt for Telegram login and create a local session file.
