<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	const fs = require('fs');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";

	function stripHeader(content) {
		const headerEnd = content.indexOf('*****************************************************************************/');
		if (headerEnd !== -1) {
			return content.substring(headerEnd + '*****************************************************************************/'.length).trimStart();
		}
		return content;
	}
%>
<%= render("../../_partials/post-header.html", { title, image, url, description, caption, date }) %>

Like most of you, I've been dabbling in what people call "agentic engineering." Truth is, there's not much engineering happening. We're basically throwing shit at the wall and hoping something sticks.

Using LLM coding tools like Claude Code to spin up throwaway greenfield projects or bang out ad hoc scripts? Pretty great experience. But try using them on a big, established codebase, or the-production-app-formerly-known-as-greenfield-project without breaking everything? That's where things get painful.

## Feeling the pain
For bigger codebases, the main issue is context, or rather, the lack of it. These tools don't have the full picture of your project. Maybe you haven't given them that overview, or maybe their context window is too small to hold all your interconnected components. But there's more to it.

Even with recent improvements like 'reasoning', which is really just the old 'think step by step' trick, with more scratch space to attend to, LLMs still can't follow execution flow all that well. They're especially lost with anything beyond sequential scripts: multiple processes, IPC, client-server architectures, concurrent execution within the same process. Even when you manage to cram all the context they need, they'll still generate code that doesn't fit your system's actual architecture.

LLMs also lack taste. Trained on all code on the web (and likely some private code), they generate, to oversimplify, the statistical mean of what they've seen. While senior engineers strive for elegant, minimal solutions that reduce bugs and complexity, LLMs reach for 'best practices' and spit out over-engineered garbage. Let them run wild and you'll get code that's hard to maintain, hard to understand, and full of places for bugs to hide.

Then there's context degradation. As your session progresses and pulls in more files, tool outputs, and other data, things start falling apart around 100k tokens. Benchmarks be damned. Whatever tricks LLM providers use to achieve those massive context windows don't work in practice. The model loses track of important details buried in the middle of all that context.

Worse still, many tools don't let you control what goes into your context. Companies like Cursor that aren't LLM providers themselves need to make a margin between what you pay them and what they pay for tokens. Their incentive? Cut down your context to save money, which means the LLM might miss crucial information or get it in a suboptimal format.

Claude Code is different. It comes straight from Anthropic with no middleman trying to squeeze margins. With the Max plan, you get essentially unlimited tokens (though folks like [Peter](https://twitter.com/steipete) manage to get rate limited even with three or four accounts). You still don't have full control: there's a system prompt you can't change, additional instructions get sneakily injected into your first message, the VS Code integration adds unwanted crap, and all the tool definitions eat up context and give the model plenty of rope to confuse itself with. But this is the best deal we're getting, so we work with what we have. (Anthropic, please OSS Claude Code. Your models are your moat, not Claude Code.)

# How do we tame this agentic mess?

What we need when using coding agents on bigger codebases is a structured way to engineer context. By that I mean: keep only the information needed for the task of modifying or generating code, minimize the number of turns the model needs to take calling tools or reporting back to us, and ensure nothing important is missing. We want reproducible workflows. We want determinism, as much as possible within the limits of these inherently non-deterministic models.

I'm a programmer. You're probably a programmer. We think in systems, deterministic workflows, and abstractions. What's more natural for us than viewing LLMs as an extremely slow kind of unreliable computer that we program with natural language?

This is a weird form of metaprogramming: we write "code" in the form of prompts that execute on the LLM to produce the actual code that runs on real CPUs.

Yes, I know LLMs aren't actually computers (though there are some papers on arXiv...). The metaphor is a bit stretched. But here's the thing: as developers, we're used to encoding specifications in precise programming languages. When we interact with LLMs, the fuzziness of natural language makes us forget we can apply the same structured thinking. This framework bridges that gap: think "inputs, state, outputs" instead of "chat with the AI" and suddenly you're closer to engineering solutions instead of just hoping for the best.

## Thinking of LLMs as Shitty General Purpose Computers

In traditional software, we create programs by writing code and importing libraries. A program takes inputs, manipulates state, and produces outputs. We can map these concepts to our LLM-as-shitty-computer metaphor like this:

**Program** is your prompt, written in natural language. It specifies initial inputs, "imports" external functions via tool descriptions, and implements business logic through control flow: sequential steps, loops, conditionals, and yes, even goto. Tool calls and user input are I/O.

**Inputs** come from three sources: prepared information (codebase docs, style guides, architecture overviews) either baked into the prompt or loaded from disk, user input during execution (clarifications, corrections, new requirements), and tool outputs (file contents, command results, API responses).

**State** evolves as the program runs. Some lives in the context, but we treat that as ephemeral: compaction will eventually wipe it (trololo). Plus, you'll quickly hit context limits with any substantial state. So we serialize to disk using formats LLMs handle well: JSON for structured data, where the LLM can surgically read and update specific fields via `jq`. Markdown for smaller unstructured data we can load fully into context if needed. The payoff? You can resume from any point with a fresh context, sidestepping the dreaded compaction issue entirely.

**Outputs** aren't limited to generated code. Just like traditional programs produce console output, write files, or display GUIs, our LLM program uses tool calls to create various outputs: the actual code, diffs, open files in an editor for us, codebase statistics, summaries of changes, or any other artifact that documents what the program did. These outputs serve multiple purposes: helping you review the work, providing input for the next steps in the workflow, or simply showing the program's progress.

Let's see how this plays out in practice.

## A Real World Example: Porting the Spine Runtimes

After experimenting with toy projects, I felt ready to apply this approach to a real codebase: the [Spine runtimes](https://github.com/EsotericSoftware/spine-runtimes).

[Spine](https://esotericsoftware.com) is 2D skeletal animation software. You create animations in the editor, export them to a runtime format, then use one of many runtimes to display them in your app or game. We maintain runtimes for C, C++, C#, Haxe, Java, Dart, Swift, and TypeScript. On top of these, we've built integrations for Unity, Unreal, Godot, Phaser, Pixi, ThreeJS, iOS, Android, web, and more.

Here's the painful part: between releases, the runtime code changes. We implement new features in our reference implementation (spine-libgdx in Java, which powers the editor), then manually port those changes to every other language runtime. It's tedious, error-prone work. Math-heavy code needs exact translation, and after hours of porting, your brain turns to mush. Bugs creep in that are hell to track down.

<img src="media/changeset.png" alt="Git diff showing thousands of lines of code changes">

And no, transpilers won't work for this (trust me, I made money doing compilers.). We need idiomatic ports that preserve the same API surface in a way that feels natural for each language.

Between releases 4.2 and 4.3-beta, the Java reference implementation  saw significant changes:

```bash
$ git diff --stat 4.2..4.3-beta -- '*.java' | tail -1
  79 files changed, 4820 insertions(+), 4679 deletions(-)
```

Here's how I'd approach this with my manual workflow:

1. Open the changeset in Fork (my git client) and scan through all changed files
2. Plan the porting order based on the dependency graph: interfaces and enums first (they're usually independent), then try to port dependencies before the classes that use them, hoping to maintain some compilability
3. Pick a type to port in Java, open a side-by-side diffs, check if the type already exists in the target runtime or needs creation from scratch
4. Port changes line-by-line, method-by-method to the target language
5. Watch the illusion of order crumble: the dependency graph is cyclic, so there's no perfect porting order that keeps everything compiling (note to self: it would be nice if we had an acyclic type dependency graph)
6. Can't test individual pieces because a skeletal animation system needs all its parts working in concert
7. Port everything blind, then face a wall of compilation errors and bugs introduced because my brain was fried after hours of human transpilation

This is especially fun when porting from Java to C, the language pair with the biggest type system and memory management mismatch.

What makes this tractable is that we maintain the same API surface across all runtime implementations. If there's a class `Animation` in Java, there's also a class `Animation` in C#, C++, and every other runtime, in a corresponding file. This one-to-one mapping exists for 99% of types. Sure, there are quirks like Java files containing dozens of inner classes, but the structural consistency is there.

Here's an example of one of the more math-heavy types, `PhysicsConstraint`:

<style>
.code-preview {
    max-height: 400px;
    overflow-y: auto;
    position: relative;
}
.code-preview pre {
    margin: 0;
}
.code-preview::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(to bottom, transparent, var(--color-background));
    pointer-events: none;
}

/* Wrap long lines only in markdown code blocks */
pre code.language-markdown {
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
}

/* For file paths in markdown, try to break at slashes */
pre code.language-markdown {
    word-break: break-all;
}

/* Normalize spacing after lists */
ul, ol {
    margin-bottom: 1em;
}

/* Ensure consistent spacing for nested lists */
ul ul:last-child,
ol ol:last-child,
ul ol:last-child,
ol ul:last-child {
    margin-bottom: 0;
}
</style>

**Java (PhysicsConstraint.java)**
<div class="code-preview">

```java
<%= stripHeader(fs.readFileSync(path.join(path.dirname(inputPath), "media/PhysicsConstraint.java"), 'utf8')) %>
```

</div>

**C++ Header (PhysicsConstraint.h)**
<div class="code-preview">

```cpp
<%= stripHeader(fs.readFileSync(path.join(path.dirname(inputPath), "media/PhysicsConstraint.h"), 'utf8')) %>
```

</div>

**C++ Implementation (PhysicsConstraint.cpp)**
<div class="code-preview">

```cpp
<%= stripHeader(fs.readFileSync(path.join(path.dirname(inputPath), "media/PhysicsConstraint.cpp"), 'utf8')) %>
```

</div>

Much of this porting work is mechanical and can be automated, like getters and setters, transferring documentation from Javadoc to docstrings, or ensuring the math matches. Some of the porting work requires a human brain, like translating Java generics to C++ templates, a task LLMs aren't very good at. What LLMs are good at is helping me double-check that I ported every line faithfully. This presented the perfect opportunity to apply my little workflow experiment to a real-world task on a real-world, largish codebase.

## The "Port Java to X" Program

Time to write our program. We're essentially encoding my manual workflow into a structured LLM program. The goal: go through each Java type that changed between two commits and port it to a target runtime (like C++) collaboratively with the user.

Instead of me manually opening diffs, tracking dependencies, and porting line-by-line while my brain melts, we'll have the LLM handle the mechanical parts while I stay in control of the decisions that matter.

The final result of this program design can be found in the [spine-port repository](https://github.com/badlogic/spine-port). The program itself is stored in a file called [`port.md`](https://github.com/badlogic/spine-port/blob/main/port.md). When I want to start or continue porting, I start Claude Code in the spine-port directory and tell it to read the `port.md` file in full and execute the workflow. That starts the "program".

In the following sections, we'll walk through each section of this program.

### Setting Up Initial Context

The `port.md` file starts with a clear description of its purpose and the data structure it works with:

```markdown
# Spine Runtimes Porting Program

Collaborative porting of changes between two commits in the Spine runtime reference implementation (Java) to a target runtime. Work tracked in `porting-plan.json` which has the following format:

​```json
{
  "metadata": {
    "prevBranch": "4.2",
    "currentBranch": "4.3-beta",
    "generated": "2024-06-30T...",
    "spineRuntimesDir": "/absolute/path/to/spine-runtimes",
    "targetRuntime": "spine-cpp",
    "targetRuntimePath": "/absolute/path/to/spine-runtimes/spine-cpp/spine-cpp",
    "targetRuntimeLanguage": "cpp"
  },
  "deletedFiles": [
    {
      "filePath": "/path/to/deleted/File.java",
      "status": "pending"
    }
  ],
  "portingOrder": [
    {
      "javaSourcePath": "/path/to/EnumFile.java",
      "types": [
        {
          "name": "Animation",
          "kind": "enum",
          "startLine": 45,
          "endLine": 52,
          "isInner": false,
          "portingState": "pending",
          "candidateFiles": ["/path/to/spine-cpp/include/spine/Animation.h", "/path/to/spine-cpp/include/spine/Animation.cpp"]
        }
      ]
    }
  ]
}
​```
```

This data structure is the central state that tracks our porting progress. The `porting-plan.json` file serves as both the initial input and the persistent state for our LLM program. Let's break down what each part means:

**metadata** - Configuration for the porting session:
- `prevBranch` and `currentBranch`: The git commits we're porting between
- `spineRuntimesDir`: Where all the runtime implementations live
- `targetRuntime`: Which runtime we're porting to (e.g., "spine-cpp")
- `targetRuntimePath` and `targetRuntimeLanguage`: Where to find the target code and what language it's in

**deletedFiles** - Java files that were removed and need corresponding deletions in the target runtime

**portingOrder** - The heart of the plan. Each entry represents a Java file that changed and contains:
- `javaSourcePath`: The full path to the Java source file
- `types`: An array of all classes, interfaces, and enums in that file, each with:
  - `name`: The type name (e.g., "Animation")
  - `kind`: Whether it's a class, interface, or enum
  - `startLine` and `endLine`: Where to find it in the Java file
  - `isInner`: Whether it's an inner type
  - `portingState`: Tracks progress ("pending" or "done")
  - `candidateFiles`: Where this type likely exists in the target runtime

The `portingState` field is crucial - it's how the LLM tracks what's been done across sessions. When I stop and restart later, the program knows exactly where to pick up.

But how do we generate all this structured data? Before the LLM can start porting, we need to analyze what changed between the two versions and prepare the data in a format the LLM can efficiently query. I wrote [`generate-porting-plan.js`](https://github.com/badlogic/spine-port/blob/main/generate-porting-plan.js) to automate this preparation:

```bash
./generate-porting-plan.js 4.2 4.3-beta /path/to/spine-runtimes spine-cpp
```

This script does several things:

1. **Runs git diff** to find all Java files that changed between the two commits
2. **Uses [`lsp-cli`](https://github.com/badlogic/lsp-cli)** to extract complete type information from both the Java reference implementation and the target runtime
3. **Analyzes dependencies** to create a porting order (enums before interfaces before classes)
4. **Finds candidate files** in the target runtime where each type likely exists
5. **Outputs a structured JSON file** that the LLM can read from and write to efficiently via `jq`.

Why pre-generate all this data instead of having the LLM explore the codebase as it goes? Three key reasons:

**Context efficiency** - Reading files repeatedly burns through context quickly. Each time the LLM needs to check if a type exists or find its methods, that's another tool call and more tokens consumed. With pre-generated JSON, the LLM can answer these questions with a single `jq` query.

**Speed** - The LLM not having to explore the codebase in an inefficient way speeds up the entire process tremendously. Pre-generating the porting plan JSON takes seconds, whereas having the LLM do this exploration would take multiple orders of magnitude longer.

**Determinism** - The same inputs (git commits and target runtime) always produce the same porting plan. When the LLM explores on its own, it might miss files, search with the wrong patterns, or get lost in the directory structure. Pre-generation ensures we get complete, accurate, and reproducible results every time.

The pre-generation step transforms an open-ended exploration problem into a structured data processing task. Instead of "figure out what changed and how to port it," the LLM gets "here's exactly what changed, where it lives, and where it should go."

No tokens and turns wasted. The context only contains exactly the information we need.

### Loading Our Function Library

[TO BE CONTINUED - tool descriptions we'll need: file reading, grep, jq, diff generation]

### The Main Workflow

[TO BE CONTINUED - the actual porting logic with loops, conditionals, and human checkpoints]

## Notes

**Sub-agent communication and observability**: Currently with Claude Code, you can spawn sub-agents but have no observability and no way to communicate with them. To make this LLMs-as-computers paradigm more general, tools like Claude Code should allow us to communicate not only with the main agent but also with any sub-agents being spawned. Sub-agents need a way to ask for more input, and we need to observe what they're doing. This means the main agent would have to program the sub-agents: which it already kind of does, but not with the same structured, program-like mindset we use for the main agent. Though I'm not sure this would work well in practice. If our prompt to the main agent also contains the exact workflows for the sub-agents, it might work. If the main agent generates the workflows for the sub-agents on its own, I doubt it would be reliable.

**Testing and debugging**: By applying this model, we might expand it to include testing and debugging capabilities. Since the workflows we create should be mostly deterministic and outputs are usually in strict formats like JSON or code, it should be possible to implement testing. We could verify that given specific inputs and state, our "program" produces expected outputs. For debugging, traditional debuggers work via instrumentation: inserting calls at specific points in program flow. Similarly, we could instrument our prompts with explicit calls to write out state information or invoke external debugging tools at key workflow points. This would let us trace execution, inspect intermediate state, and identify where workflows diverge from expectations. I haven't tried either approach yet, but the structured nature of this programming model suggests it should be feasible.


<%= render("../../_partials/post-footer.html", { title, url }) %>