<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url }) %>

<h1 class="toc-header">Table of contents</h1>
<div class="toc">
%%toc%%
</div>

In the past three years, I've been using LLMs in some form for assisted coding. If you read this, you probably went through the same evolution as me: from copying and pasting code into the [ChatGPT](https://chatgpt.com) web interface, to auto-completions via [Copilot](https://github.com/features/copilot) (which never worked for me), to switching to [Cursor](https://cursor.com) and editing individual files with it, and finally a new breed of coding agent harnesses like [Claude Code](https://claude.ai/code), [Codex](https://github.com/openai/codex), [Amp](https://ampcode.com), [Droid](https://factory.ai), and [opencode](https://opencode.ai) that became our daily drivers in 2025.

I personally preferred Claude Code for most of my work so far, because it was the first thing I tried back in April this year after using Cursor for one and a half years. Back then, Claude Code was much more basic than what you have today. And that fit my workflow perfectly, because I'm a simple boy who likes simple tools. Simple and predictable tools. Over the past few months, Claude Code has turned into a spaceship with 80% of functionality that I personally have no use for. The [system prompt and tools also change](/posts/2025-08-03-cchistory/) pretty much on every release, which breaks my workflows and changes the behavior of the model. I hate that. Also, it flickers.

I've also built a bunch of agents over the past years of various complexity. For example, [Sitegeist](https://sitegeist.ai), my little browser-use agent, is essentially a coding agent that lives inside the browser. In all that work, I found that constraining the inputs to the agent, specifically if it's required to write code, yields better outputs from the model. With all the things that go on behind the scenes in existing coding harnesses, it is extremely hard to have control over the context.

I've also dabbled in self-hosting, both locally and on [DataCrunch](https://datacrunch.io). And while some harnesses like opencode allow working with self-hosted models, that usually doesn't work quite well. Mostly because these harnesses rely on libraries like the [Vercel AI SDK](https://sdk.vercel.ai/), which doesn't do great when it comes to interacting with self-hosted models.

So what's an old guy yelling at Claudes going to do? He's going to write his own coding agent harness and give it a name that's entirely un-Google-able, so there will never be any users, which means there will also never be any issues on the GitHub issue tracker. How hard can it be?

<%= render("../../_partials/post-footer.html", { title, url }) %>