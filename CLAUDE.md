# Blog Writing
This repository is the blog of Mario Zechner. You will help write blog posts, using the blargh static site generator (https://github.com/badlogic/blargh).

## Session start
When you receive the first message from the user.
1. Execute `nohup blargh --in src --out html --watch --serve 8080 > /dev/null 2>&1 &`. This starts blargh in watch mode and serves the contents of html/ on localhost:8080.
2. Execute `open http://localhost:8080`. This opens the browser and shows the locally served static HTML contents. Changes made to src files will auto-reload the current page.

## Important restrictions
- NEVER use Puppeteer tools (mcp__puppeteer__*) unless explicitly instructed by the user. The user prefers to view the site directly in their browser.

## Writting a new blog entry
To create a new blog entry

1. Ask the user for the title
2. Create a folder src/posts/yyyy-mm-dd-short-version-of-title. All subsequent operations happen in that folder.
3. Create a file
3. Create a file meta.json in that folder looking like this
```
{
    "title": "Boxie - an always offline audio player for my 3 year old",
    "date": "2025-04-26",
    "image": "media/boxie-header.png",
    "caption": "Channeling the spirit of the Gameboy",
    "description": "How I built a simple portable audio player for my boy, summoning the spirit of the Gameboy",
    "published": false
}
```

