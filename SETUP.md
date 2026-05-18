# Hermes v2 Local Setup

Hermes has two Telegram ingestion modes:

1. `bot.main` for a channel you control with a bot admin
2. `bot.channel_listener` for a public source channel such as `https://t.me/github_repos`

For the `github_repos` use case, use `bot.channel_listener`.

## What runs locally

1. Sanity Studio at `http://localhost:3333`
2. A Telegram ingestion worker in a terminal
3. Next.js website at `http://localhost:3000`

## Prerequisites

- Python 3.11+
- Node.js 18+
- Telegram account
- Sanity account
- Ollama Cloud API key
- GitHub token

## 1. Create the Python environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

## 2. Fill `.env`

Required for all modes:

```env
OLLAMA_API_KEY=...
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b
GITHUB_TOKEN=...
SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_WRITE_TOKEN=...
```

### Public channel listener mode

Set these values for `https://t.me/github_repos`:

```env
TELEGRAM_CHANNEL_URL=https://t.me/github_repos
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_PHONE=+919555607181
TELEGRAM_SESSION_NAME=hermes-github-repos
TELEGRAM_SESSION_STRING=
TELEGRAM_CHANNEL_BACKFILL_LIMIT=10
```

Get `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org).
Use your own Telegram account phone number in full international format for `TELEGRAM_PHONE`.
Create `OLLAMA_API_KEY` from your Ollama account API key settings.
For remote deployment, generate `TELEGRAM_SESSION_STRING` with `python -m bot.print_session_string`.

### Bot mode

Only needed if you also want the reply bot for a channel you control:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=-100123456789
WEBHOOK_URL=
PORT=8080
```

## 3. Create or connect Sanity

Create a Sanity project if you do not already have one:

```powershell
npm create sanity@latest
```

Copy the schema files from this repo into your Sanity Studio project:

```powershell
Copy-Item studio-schemas\repoAnalysis.ts <your-studio>\schemaTypes\repoAnalysis.ts
Copy-Item studio-schemas\index.ts <your-studio>\schemaTypes\index.ts
```

Start Studio:

```powershell
cd <your-studio>
npm install
npm run dev
```

Studio should be available at `http://localhost:3333`.

## 4. Start the website

```powershell
cd website
npm install
npm run dev
```

Website should be available at `http://localhost:3000`.

## 5. Start Telegram ingestion

### Public `github_repos` channel listener

```powershell
python -m bot.channel_listener
```

On first run, Telethon will prompt for your Telegram login and store a local session file. Hermes will backfill only the latest 10 posts from `github_repos`, skip repos that already exist in Sanity, and then keep listening for new ones.

### Bot mode

```powershell
python -m bot.main
```

## 6. Verify the flow

For `bot.channel_listener`:

1. Start the listener
2. Wait for it to ingest recent `github_repos` posts
3. Open Sanity Studio and confirm draft `repoAnalysis` documents appear
4. Open `http://localhost:3000` and confirm the analyses are visible

For `bot.main`:

1. Post a GitHub URL in the configured Telegram channel
2. Watch Hermes reply in Telegram
3. Confirm the draft appears in Studio and on the website

## Notes

- `bot.main` uses the Bot API and only works for channels where your bot can receive updates.
- `bot.channel_listener` uses a Telegram user session, which is the practical option for monitoring a public channel like `https://t.me/github_repos`.
- Telegram post text is now passed into the Ollama prompt as supplemental repo-analysis context.
- Sanity documents now store the source channel, source message URL, and source message text.
