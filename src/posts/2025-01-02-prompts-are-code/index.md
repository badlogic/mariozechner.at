<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url, description, caption, date }) %>

Like most of you, I've been dabbling in what people call "agentic engineering." Truth is, there's not much engineering happening. We're basically throwing shit at the wall and hoping something sticks.

Using LLM coding tools like Claude Code to spin up throwaway greenfield projects or bang out ad hoc scripts? Pretty great experience. But try using them on an established codebase, or your former greenfield project now production app without breaking everything? That's where things get painful.

The main issue is context, or rather, the lack of it. These tools don't have the full picture of your project. Maybe you haven't given them that overview, or maybe their context window is too small to hold all your interconnected components. But there's more to it.

Even with recent improvements like 'reasoning', which is really just the old 'think step by step' trick, with more scratch space to attend to, LLMs still can't follow execution flow all that well. They're especially lost with anything beyond sequential scripts: multiple processes, IPC, client-server architectures. Even when you manage to cram all the context they need, they'll still generate code that doesn't fit your system's actual architecture.

Another issue: LLMs have no taste. Trained on all code on the web (and likely some private code), they generate, to oversimplify, the statistical mean of what they've seen. While senior engineers strive for elegant, minimal solutions that reduce bugs and complexity, LLMs reach for 'best practices' and spit out over-engineered garbage. Let them run wild and you'll get code that's hard to maintain, hard to understand, and full of places for bugs to hide.

Then there's context degradation. As your session progresses and pulls in more files, tool outputs, and other data, things start falling apart around 100k tokens. Benchmarks be damned. Whatever tricks LLM providers use to achieve those massive context windows don't work in practice. The model loses track of important details buried in the middle of all that context.

Worse still, many tools don't let you control what goes into your context. Companies like Cursor that aren't LLM providers themselves need to make a margin between what you pay them and what they pay for tokens. Their incentive? Cut down your context to save money, which means the LLM might miss crucial information or get it in a suboptimal format.

Claude Code is different. It comes straight from Anthropic with no middleman trying to squeeze margins. With the Max plan, you get essentially unlimited tokens (though folks like [Peter](https://twitter.com/steipete) manage to get rate limited even with three or four accounts). You still don't have full control: there's a system prompt you can't change, additional instructions get sneakily injected into your first message, the VS Code integration adds unwanted crap, and all the tool definitions eat up context and give the model plenty of rope to confuse itself with. But this is the best deal we're getting, so we work with what we have. (Anthropic, please OSS Claude Code. Your models are your moat, not Claude Code.)

So how do we tame this agentic mess?

What we need is a structured way to engineer context. By that I mean: keep only the information needed for the task, minimize the number of turns the model needs to take calling tools or reporting back to us, and ensure nothing important is missing. We want reproducible workflows. We want determinism, as much as possible within the limits of these inherently non-deterministic models.

I'm a programmer. You're probably a programmer. We think in systems, deterministic workflows, and abstractions. What's more natural for us than viewing LLMs as an extremely slow kind of computer that we program with natural language?

This is a weird form of metaprogramming: we write "code" in the form of prompts that execute on the LLM to produce the actual code that runs on real CPUs. But we need more than "code".

## Thinking of LLMs as Shitty General Purpose Computers

Look, I know LLMs aren't actually computers (though there are some papers on arXiv...). The metaphor is leaky as hell. But as developers, we struggle with fuzzy natural language. This framework lets us apply our existing mental models: think "inputs, state, outputs" instead of "chat with the AI" and suddenly you're closer to engineering solutions instead of just hoping for the best.

So let's think about programs. What makes a program? A program takes inputs, executes instructions that manipulate state, and produces outputs.

**Inputs** can be information we prepare ahead of time (documentation that helps the LLM navigate your codebase, understand your coding style, grasp the system architecture, avoid known gotchas), come from the user during execution (clarifications, corrections, additional requirements), or flow in from tool invocations (file contents, command outputs, API responses).

**Instructions** are your prompts, structured as workflows with control flow and checkpoints where you, the human, stay in the loop to review code and guide execution. Human in the loop, literally. Tools to read files or the `jq` CLI to query JSON data can be viewed as functions inside this "program" that we can call to fetch data or write data.

**State** gets modified and updated as the program runs. Part of it lives in the context itself: the conversation history, which isn't ephemeral (unless you run into compaction, trololo). But not all state fits in the context window. That's why we serialize to disk: JSON files tracking progress, markdown documenting decisions. The key is making this state queryable so the LLM doesn't have to read everything, just the parts it needs. The more we rely on serialized state on disk, the easier it becomes to resume sessions: something that's notoriously hard with normal programs but surprisingly natural with this LLM-as-computer model. (Generated code could be considered state if you iterate on it during program execution, but I generally consider them outputs.)

**Outputs** aren't just the generated code. They include any visualization the LLM produces to illustrate what it did: automatically opening diffs, displaying newly created files, providing summaries of changes.

Unlike traditional programs where state vanishes when you quit, this approach forces you to serialize everything. That constraint becomes a feature: full observability and resumability come for free.

## A Real World Example: Porting the Spine Runtimes

After experimenting with toy projects, I felt ready to apply this approach to a real codebase: the [Spine runtimes](https://github.com/EsotericSoftware/spine-runtimes).

Spine is 2D skeletal animation software. You create animations in the editor, export them to a runtime format, then use one of many runtimes to display them in your app or game. We maintain runtimes for C, C++, C#, Haxe, Java, Dart, Swift, and TypeScript. On top of these, we've built integrations for Unity, Unreal, iOS, Android, web, and more.

Here's the painful part: between releases, the runtime code changes. We implement new features in our reference implementation (spine-libgdx in Java, which powers the editor), then manually port those changes to every other language runtime. It's tedious, error-prone work. Math-heavy code needs exact translation, and after hours of porting, your brain turns to mush. Bugs creep in that are hell to track down.

<img src="media/changeset.png" alt="Git diff showing thousands of lines of code changes">

And no, transpilers won't work for this. We need idiomatic ports that preserve the same API surface in a way that feels natural for each language. Trust me, I made money doing compilers.

Between releases 4.2 and 4.3-beta, the Java reference implementation alone saw significant changes:

```bash
$ git diff --stat 4.2..4.3-beta -- '*.java' | tail -1
  79 files changed, 4820 insertions(+), 4679 deletions(-)
```

My manual workflow was torture:

1. Open the changeset in Fork (my git client) and scan through all changed files
2. Plan the porting order based on the dependency graph: interfaces and enums first (they're usually independent), then try to port dependencies before the classes that use them, hoping to maintain some compilability
3. Open side-by-side diffs and check if each Java type already exists in the target runtime or needs creation from scratch
4. Port changes line-by-line to the target language
5. Watch the illusion of order crumble: the dependency graph is cyclic, so there's no perfect porting order that keeps everything compiling (it would be nice if we had an acyclic type dependency graph)
6. Can't test individual pieces because a skeletal animation system needs all its parts working in concert
7. Port everything blind, then face a wall of compilation errors and bugs introduced because my brain was fried after hours of meticulous translation

This is especially fun when porting from Java to C, which has the biggest mismatching type system and memory management.

What makes this tractable is that we maintain the same API surface across all runtime implementations. If there's a class Animation in Java, there's also a class Animation in C#, C++, and every other runtime, in a corresponding file. This one-to-one mapping exists for 99% of types. Sure, there are quirks like Java files containing dozens of inner classes, but the structural consistency is there.

Much of this porting work is mechanical and can be automated. So I applied the concepts described above to create a workflow with Claude Code that handles the tedious parts while I stay in control of the important decisions.

## Notes

**Sub-agent communication and observability**: Currently with Claude Code, you can spawn sub-agents but have no observability and no way to communicate with them. To make this LLMs-as-computers paradigm more general, tools like Claude Code should allow us to communicate not only with the main agent but also with any sub-agents being spawned. Sub-agents need a way to ask for more input, and we need to observe what they're doing. This means the main agent would have to program the sub-agents: which it already kind of does, but not with the same structured, program-like mindset we use for the main agent. Though I'm not sure this would work well in practice. If our prompt to the main agent also contains the exact workflows for the sub-agents, it might work. If the main agent generates the workflows for the sub-agents on its own, I doubt it would be reliable.


<%= render("../../_partials/post-footer.html", { title, url }) %>