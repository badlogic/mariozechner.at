# Blog Writing
This repository is the blog of Mario Zechner. You will help write blog posts, using the blargh static site generator (https://github.com/badlogic/blargh).

## Session start
When you receive the first message from the user.
1. Execute `nohup blargh --in src --out html --watch --serve 8080 > /dev/null 2>&1 &`. This starts blargh in watch mode and serves the contents of html/ on localhost:8080.
2. Execute `open http://localhost:8080`. This opens the browser and shows the locally served static HTML contents. Changes made to src files will auto-reload the current page.

## Important restrictions
- NEVER use Puppeteer tools (mcp__puppeteer__*) unless explicitly instructed by the user. The user prefers to view the site directly in their browser.

## Publishing
To publish changes to the live site:

### Frontend only
Execute `./publish.sh` to publish frontend changes only. This builds the static files and deploys them to the server.

### Frontend + Server restart  
Execute `./publish.sh server` to publish frontend changes AND restart the server with the latest code.

## Writing a new blog entry
To create a new blog entry

1. Ask the user for the title
2. Create a folder src/posts/yyyy-mm-dd-short-version-of-title. All subsequent operations happen in that folder.
3. Create a file meta.json in that folder looking like this
```
{
    "title": "Blog Post Title",
    "date": "2025-04-26",
    "image": "media/header-image.png",
    "caption": "Caption for the header image",
    "description": "Brief description of the blog post",
    "published": false
}
```
4. Create an index.md file that MUST start with the following template code and ONLY contain scaffolding:
```
<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url }) %>

**Table of Contents**
<div class="toc">
%%toc%%
</div>

## Introduction

## Conclusion
```
5. Open the specific blog post in the browser using `open http://localhost:8080/posts/yyyy-mm-dd-short-version-of-title/`

IMPORTANT: 
- The template code at the top is essential for proper rendering and styling. Without it, the blog post will appear bare-bones without the header, styling, or table of contents.
- Only create the basic scaffolding structure with Introduction and Conclusion headers. Do NOT write any actual content - the user will fill in the content themselves.

## CSS Styling
The main CSS files are located in `src/_css/`:
- `elements.css` - Basic HTML element styling (headings, paragraphs, lists, etc.)
- `utilities.css` - Utility classes for margins, padding, flexbox, etc.
- `colors.css` - Color variables and themes
- Other files include code highlighting, fonts, and external libraries

The CSS files are imported in `src/style.css` and compiled by blargh.

