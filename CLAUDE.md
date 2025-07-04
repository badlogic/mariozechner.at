# mariozechner.at - Personal Blog & Portfolio

A minimalist personal blog and portfolio website built with **blargh**, a custom static site generator using JavaScript/EJS templating.

## Project Structure

```
.
├── src/                    # Source files
│   ├── posts/             # Blog posts (YYYY-MM-DD-title format)
│   │   └── */             # Each post directory contains:
│   │       ├── index.md   # Post content in Markdown
│   │       ├── meta.json  # Post metadata
│   │       └── media/     # Images, videos, and other assets
│   ├── _css/              # Modular CSS files
│   ├── _icons/            # SVG icons
│   ├── _partials/         # Reusable HTML templates
│   ├── components.js      # Web components (theme toggle, color band)
│   ├── index.html         # Homepage template
│   └── style.css          # Main stylesheet (imports _css files)
├── html/                  # Generated output (git-ignored)
├── publish.sh             # Build & deployment script
└── docker/                # Server-side Docker configuration
```

## Common Tasks

### Add a New Blog Post
1. Create directory: `src/posts/YYYY-MM-DD-post-title/`
2. Add `meta.json`:
   ```json
   {
       "title": "Post Title",
       "date": "YYYY-MM-DD",
       "image": "media/header.png",
       "caption": "Header image caption",
       "description": "SEO description",
       "published": true
   }
   ```
3. Write content in `index.md` with EJS front matter:
   ```ejs
   <%
   	meta("../../meta.json")
   	meta()
   	const path = require('path');
   	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
   %>
   <%= render("../../_partials/post-header.html", { title, image, url }) %>
   
   Your post content here...
   
   <%= render("../../_partials/post-footer.html", { title, url }) %>
   ```
4. Add media files to `media/` subdirectory

### Development Mode
```bash
# Run blargh with watch mode and local server
nohup blargh --in src --out html --watch --serve 8080 &

# The site will be available at http://localhost:8080
# Changes to source files will automatically rebuild
```

### Build for Production
```bash
blargh --in src --out html
```

### Deploy to Production
```bash
./publish.sh         # Client only
./publish.sh server  # Client + restart server
```

## Key Features

- **Templating**: EJS-style syntax with `<%= %>` for expressions and `<% %>` for logic
- **Markdown**: Full support with HTML, code highlighting, and KaTeX math
- **Media**: Lazy-loaded images and HTML5 video support
- **RSS**: Auto-generated feed at `/rss.xml`
- **Themes**: Dark/light mode toggle with localStorage persistence
- **Responsive**: Max width 720px for optimal readability

## Template Functions

- `meta()` - Include page metadata
- `render(path, data)` - Render partial templates
- `metas(path)` - Get metadata for posts
- `rss(path, channel, items)` - Generate RSS feed

## Styling

- Fira Code font for code blocks
- Atom One Dark syntax highlighting
- Custom color palette in `_css/colors.css`
- Utility classes in `_css/utilities.css`

## Special Markdown Features

- `%%toc%%` - Auto-generate table of contents
- `<q-l href="..."></q-l>` - Styled external links
- Standard GitHub Flavored Markdown support

## Writing Guidelines

- NEVER use em-dashes. Start a new sentence, or if you must, use a colon.

## Development Tricks

- Always use the Bash tool to find out the current date