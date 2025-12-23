# Year in Review 2025 - Blog Post Context

## Current State
- Blog post started at `src/posts/2025-12-22-year-in-review-2025/index.md`
- Header image added at `media/header.png`
- Caption: "Guess when I was in the hospital"
- Dev server running in tmux session `blog` at http://localhost:8080
- Utilities section drafted at bottom of post

## Data Sources

### Bluesky Projects Data
Location: `../bsky/output/projects_2025_final.md` (and `.json`)

This file contains 83 projects extracted from Bluesky posts throughout 2025. Each project has:
- Name and summary
- All related threads with dates, engagement stats, and media references
- Media files are in `../bsky/output/media/`

To get Bluesky URLs (media filenames are blob IDs, NOT post IDs):
```bash
# Search posts.json by unique text snippet:
cat ../bsky/output/posts.json | jq -r '.[] | select(.text | contains("UNIQUE_TEXT")) | "https://bsky.app/profile/badlogic.bsky.social/post/" + (.uri | split("/") | .[-1])'

# Example - Boxie first post:
cat ../bsky/output/posts.json | jq -r '.[] | select(.text | contains("There are many audio players for kids like it")) | "https://bsky.app/profile/badlogic.bsky.social/post/" + (.uri | split("/") | .[-1])'
# Returns: https://bsky.app/profile/badlogic.bsky.social/post/3lgyehtyn6227
```

### GitHub Projects Created in 2025
61 public repos created. Key command to regenerate list:
```bash
gh repo list badlogic --limit 200 --json name,createdAt,description,url,isPrivate --jq '.[] | select(.createdAt >= "2025-01-01" and .isPrivate == false) | "\(.name) | \(.description // "no description") | \(.url)"' | sort
```

### GitHub Contributions (external repos)
```bash
gh api graphql -f query='{ user(login: "badlogic") { contributionsCollection(from: "2025-01-01T00:00:00Z", to: "2025-12-31T23:59:59Z") { commitContributionsByRepository(maxRepositories: 50) { repository { nameWithOwner description } contributions { totalCount } } } } }' | jq -r '.data.user.contributionsCollection.commitContributionsByRepository[] | "\(.repository.nameWithOwner) (\(.contributions.totalCount) commits)"'
```

Key external contributions:
- **amantus-ai/vibetunnel (282 commits)** - "Turn any browser into your terminal" - NEEDS STORY

### Blog Posts Written in 2025
Located in `src/posts/`:
1. `2025-04-20-boxie` - Boxie build guide with full instructions
2. `2025-06-02-prompts-are-code` - Agentic engineering philosophy
3. `2025-08-03-cchistory` - Hacking Claude Code, extracting system prompts
4. `2025-08-06-cc-antidebug` - Claude Code anti-debugging bypass
5. `2025-08-15-mcp-vs-cli` - MCP vs CLI tools comparison
6. `2025-10-05-jailjs` - JailJS JavaScript sandbox behind the scenes
7. `2025-11-02-what-if-you-dont-need-mcp` - More MCP critique
8. `2025-11-22-armin-is-wrong` - NEED TO CHECK WHAT THIS IS ABOUT
9. `2025-11-30-pi-coding-agent` - pi coding agent writeup

## Major Project Categories (from Bluesky data)

### Hardware/Maker
- **Boxie** - Offline Tonie Box clone, ESP32, custom PCBs, cartridges, NiMH batteries
  - Blog post exists: `/posts/2025-04-20-boxie/`
  - Multiple Bluesky threads throughout year

### Charity
- **Cards for Ukraine** - €300k+ raised, 5798+ food vouchers sent
  - Zero overhead, 100% transparent
  - Multiple threads, major one around October with 308 cards

### Price Tracking/Consumer Advocacy
- **heisse-preise.io** - Grocery price tracking
  - SPAR closed API in December 2024, fixed in May 2025
  - Cory Doctorow mentioned it in The Verge
  - Ongoing advocacy for legalizing scraping

### AI Tools Built
- **Sitegeist** - Browser AI agent for research/scraping
- **Cellgeist** - Excel AI add-in
- **pi coding agent** - Ranked 7th on terminal-bench, beats Claude Code
- **Texty** - Browser extension + Android app for spell checking
- **lemmy** - LLM wrapper for agentic workflows, red-teaming tool

### Investigations/Exposés
- **Austrian media LLM usage** - OE24, Heute, Exxpress using LLMs, funded by RTR
- **fobizz school AI tools** - Sophie Scholl chatbot, problematic grading
- **Government chatbots** - Kremsi, Feldi, Tirol bot testing
- **Clinara medical transcription** - Privacy/accuracy issues
- **Coalition protocols** - Published leaked FPÖ/ÖVP and ÖVP/SPÖ/NEOS docs
- **StoryOne book generator** - FAZ promoted AI slop
- **Facial recognition hiring paper** - Debunked Wharton pseudoscience

### Education/Outreach
- **GenAI Workshop** - 1.5 hour interactive workshop, YouTube live stream
- **GEWI data pipeline tutorial** - Teaching humanities researchers to use LLMs for data work
- **Bit & Babel podcast** - With @schenior.bsky.social

### Other Notable
- **Parliament Watch** - Austrian parliament attendance tracker
- **Carinthian Honors Dashboard** - Gender analysis of state honors
- **Guitar Tuner** - Free, no tracking
- **Cremer Archive** - Scraped photo blog for preservation

## MISSING/NEEDS CLARIFICATION

### VibeTunnel Story - DONE
- 282 commits to `amantus-ai/vibetunnel`
- Peter Steinberger, Armin Ronacher, Mario - June 2025
- 24-hour hackathon in Peter's Vienna flat
- Built mobile control for Claude Code
- Armin: backend (Rust then Node.js), Peter: macOS app, Mario: frontend
- Ended up unmaintainable Frankenstein
- Peter later created Clawdis (https://clawdis.ai/) which works better

### "armin-is-wrong" Blog Post
- Located at `src/posts/2025-11-22-armin-is-wrong/`
- NEED TO READ AND UNDERSTAND CONTEXT

### Hospital Stay - DONE
- Feb/March 2025 gap in GitHub contributions
- Mario: "I have become old. My body is falling apart slowly."
- Needed time to recover, no energy for side projects

## Proposed Blog Structure

1. **Intro** - Year overview, hospital mention
2. **Boxie** - Hardware project, proudest achievement
3. **Cards for Ukraine** - Charity work continues
4. **heisse-preise.io** - Price tracking saga continues
5. **AI Tools & Messing with Claude Code** - Sitegeist, Cellgeist, pi, VibeTunnel hackathon
6. **Investigations** - Media LLM usage, fobizz, government chatbots
7. **Education** - GenAI workshop, GEWI tutorials
8. **Small tools & utilities** - Already drafted, link dump at bottom

## Files Already Modified
- `src/posts/2025-12-22-year-in-review-2025/meta.json` - metadata
- `src/posts/2025-12-22-year-in-review-2025/index.md` - post content with utilities section
- `src/posts/2025-12-22-year-in-review-2025/media/header.png` - header image
- `src/posts/2025-12-22-year-in-review-2025/media/cards-for-ukraine.jpg` - €300k screenshot
- `src/posts/2025-12-22-year-in-review-2025/media/dorks.jpg` - Peter/Armin/Mario photo for VibeTunnel
- `src/posts/2025-12-22-year-in-review-2025/media/vibetunnel.mp4` - VibeTunnel demo video

## Sections Completed
1. **Intro** - Hospital stay explanation, gap in Feb/March contributions
2. **Boxie** - Video from blog post, Doom port video, 72 cartridges, Game Boy nostalgia
3. **Cards for Ukraine** - Crossed €300k, two batches (May 190 cards, October 308 cards), Tanja's Substack
4. **Messing with AI** (partial):
   - Intro paragraphs linking to previous year LLM projects and all 2025 blog posts
   - Summary paragraph: "nobody knows how to do this properly"
   - **VibeTunnel subsection DONE** - Peter/Armin hackathon story, dorks photo, demo video, Clawdis mention

## Sections Still Needed
- More subsections under "Messing with AI" (Sitegeist, Cellgeist, pi coding agent, etc.)
- Investigations section
- heisse-preise.io section
- GenAI Workshop / GEWI tutorials
- Small tools section already drafted at bottom

## Commands to Resume
```bash
# Check dev server
tmux attach -t blog

# Or restart if needed
cd /Users/badlogic/workspaces/mariozechner.at
./dev.sh

# Open in browser
open http://localhost:8080/posts/2025-12-22-year-in-review-2025/
```

## Writing Guidelines (from AGENTS.md)
- NO em-dashes, use periods/commas/parentheses instead
- No flowery language
- Be direct and technical
- When dictating: fix grammar/spelling only, don't change tone
- Apply changes directly without asking for confirmation
