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

In the past three years, I've been using LLMs for assisted coding. If you read this, you probably went through the same evolution: from copying and pasting code into [ChatGPT](https://chatgpt.com), to [Copilot](https://github.com/features/copilot) auto-completions (which never worked for me), to [Cursor](https://cursor.com), and finally the new breed of coding agent harnesses like [Claude Code](https://claude.ai/code), [Codex](https://github.com/openai/codex), [Amp](https://ampcode.com), [Droid](https://factory.ai), and [opencode](https://opencode.ai) that became our daily drivers in 2025.

I preferred Claude Code for most of my work. It was the first thing I tried back in April after using Cursor for a year and a half. Back then, it was much more basic. That fit my workflow perfectly, because I'm a simple boy who likes simple, predictable tools. Over the past few months, Claude Code has turned into a spaceship with 80% of functionality I have no use for. The [system prompt and tools also change](/posts/2025-08-03-cchistory/) on every release, which breaks my workflows and changes model behavior. I hate that. Also, it flickers.

I've also built a bunch of agents over the years, of various complexity. For example, [Sitegeist](https://sitegeist.ai), my little browser-use agent, is essentially a coding agent that lives inside the browser. In all that work, I learned that context engineering is paramount. Exactly controlling what goes into the model's context yields better outputs, especially when it's writing code. Existing harnesses make this extremely hard or impossible by injecting stuff behind your back that isn't even surfaced in the UI.

Speaking of surfacing things, I want to inspect every aspect of my interactions with the model. Basically no harness allows that. I also want a cleanly documented session format I can post-process automatically, and a simple way to build alternative UIs on top of the agent core. While some of this is possible with existing harnesses, the APIs smell like organic evolution. These solutions had to learn bitter lessons along the way and keep dragging around the resulting baggage, which shows in the developer experience. I'm not blaming anyone for this. If tons of people use your shit and you need some sort of backwards compatibility, that's the price you pay.

I've also dabbled in self-hosting, both locally and on [DataCrunch](https://datacrunch.io). While some harnesses like opencode support self-hosted models, it usually doesn't work well. Mostly because they rely on libraries like the [Vercel AI SDK](https://sdk.vercel.ai/), which doesn't play nice with self-hosted models for some reason, specifically when it comes to tool calling.

So what's an old guy yelling at Claudes going to do? He's going to write his own coding agent harness and give it a name that's entirely un-Google-able, so there will never be any users, which means there will also never be any issues on the GitHub issue tracker. How hard can it be?

To make this work, I needed to build:

- **[pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai)**: A unified LLM API with multi-provider support (Anthropic, OpenAI, Google, xAI, Groq, Cerebras, OpenRouter, and any OpenAI-compatible endpoint), streaming, tool calling with TypeBox schemas, thinking/reasoning support, seamless cross-provider context handoffs, and token and cost tracking.
- **[pi-tui](https://github.com/badlogic/pi-mono/tree/main/packages/tui)**: A minimal terminal UI framework with differential rendering, synchronized output for flicker-free updates, and components like editors with autocomplete and markdown rendering.
- **[pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/agent)**: An agent loop that handles tool execution, validation, and event streaming.
- **[pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)**: The actual CLI that wires it all together with session management, custom tools, themes, and project context files.

My philosophy in all of this was: if I don't need it, it won't be built. And I don't need a lot of things.

## pi-ai

I'm not going to bore you with the API specifics of this package. You can read it all in the [README.md](https://github.com/badlogic/pi-mono/blob/main/packages/ai/README.md). Instead, I want to document the problems I ran into while creating a unified LLM API and how I resolved them. I'm not claiming my solutions are the best, but they've been working pretty well throughout various agentic and non-agentic LLM projects.

There's really only four APIs you need to speak to talk to pretty much any LLM provider: [OpenAI's Completions API](https://platform.openai.com/docs/api-reference/chat/create), their newer [Responses API](https://platform.openai.com/docs/api-reference/responses), [Anthropic's Messages API](https://docs.anthropic.com/en/api/messages), and [Google's Generative AI API](https://ai.google.dev/api).

They're all pretty similar in features, so building an abstraction on top of them isn't rocket science. There are, of course, provider-specific peculiarities you have to care for. That's especially true for the Completions API, which is spoken by pretty much all providers, but each of them has a different understanding of what this API should do. For example, while OpenAI doesn't support reasoning traces in their Completions API, other providers do in their version of the Completions API. This is also true for inference engines like [llama.cpp](https://github.com/ggml-org/llama.cpp), [Ollama](https://ollama.com/), [vLLM](https://github.com/vllm-project/vllm), and [LM Studio](https://lmstudio.ai/).

For example, in [openai-completions.ts](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/providers/openai-completions.ts):

- Cerebras, xAI, Mistral, and Chutes don't like the `store` field
- Mistral and Chutes use `max_tokens` instead of `max_completion_tokens`
- Cerebras, xAI, Mistral, and Chutes don't support the `developer` role for system prompts
- Grok models don't like `reasoning_effort`
- Different providers return reasoning content in different fields (`reasoning_content` vs `reasoning`)

To ensure all features actually work across the gazillion of providers, pi-ai has a pretty extensive test suite covering image inputs, reasoning traces, tool calling, and other features you'd expect from an LLM API. Tests run across all supported providers and popular models. While this is a good effort, it still won't guarantee that new models and providers will just work out of the box.

Another big difference is how providers report tokens and cache reads/writes. Anthropic has the sanest approach, but generally it's the Wild West. Some report token counts at the start of the SSE stream, others only at the end, making accurate cost tracking impossible if a request is aborted. To add insult to injury, you can't provide a unique ID to later correlate with their billing APIs and figure out which of your users consumed how many tokens. So pi-ai does token and cache tracking on a best-effort basis. Good enough for personal use, but not for accurate billing if you have end users consuming tokens through your service.

Context handoff between providers was a feature pi-ai was designed for from the start. Since each provider has their own way of tracking tool calls and thinking traces, this can only be a best-effort thing. For example, if you switch from Anthropic to OpenAI mid-session, Anthropic thinking traces are converted to content blocks inside assistant messages, delimited by `<thinking></thinking>` tags. This may or may not be sensible, because the thinking traces returned by Anthropic and OpenAI don't actually represent what's happening behind the scenes.

These providers also insert signed blobs into the event stream that you have to replay on subsequent requests containing the same messages. This also applies when switching models within a provider. It makes for a cumbersome abstraction and transformation pipeline in the background.

I'm happy to report that cross-provider context handoff and context serialization/deserialization work pretty well in pi-ai:

<div class="code-preview">

```typescript
import { getModel, complete, Context } from '@mariozechner/pi-ai';

// Start with Claude
const claude = getModel('anthropic', 'claude-sonnet-4-5');
const context: Context = {
  messages: []
};

context.messages.push({ role: 'user', content: 'What is 25 * 18?' });
const claudeResponse = await complete(claude, context, {
  thinkingEnabled: true
});
context.messages.push(claudeResponse);

// Switch to GPT - it will see Claude's thinking as <thinking> tagged text
const gpt = getModel('openai', 'gpt-5.1-codex');
context.messages.push({ role: 'user', content: 'Is that correct?' });
const gptResponse = await complete(gpt, context);
context.messages.push(gptResponse);

// Switch to Gemini
const gemini = getModel('google', 'gemini-2.5-flash');
context.messages.push({ role: 'user', content: 'What was the question?' });
const geminiResponse = await complete(gemini, context);

// Serialize context to JSON (for storage, transfer, etc.)
const serialized = JSON.stringify(context);

// Later: deserialize and continue with any model
const restored: Context = JSON.parse(serialized);
restored.messages.push({ role: 'user', content: 'Summarize our conversation' });
const continuation = await complete(claude, restored);
```

</div>

Speaking of models, I wanted a typesafe way of specifying them in the `getModel` call. For that I needed a model registry that I could turn into TypeScript types. I'm parsing data from both [OpenRouter](https://openrouter.ai/) and [models.dev](https://models.dev/) (created by the opencode folks, thanks for that, it's super useful) into [models.generated.ts](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/models.generated.ts). This includes token costs and capabilities like image inputs and thinking support.

And if I ever need to add a model that's not in the registry, I wanted a type system that makes it easy to create new ones. This is especially useful when working with self-hosted models, new releases that aren't yet on models.dev or OpenRouter, or trying out one of the more obscure LLM providers:

```typescript
import { Model, stream } from '@mariozechner/pi-ai';

const ollamaModel: Model<'openai-completions'> = {
  id: 'llama-3.1-8b',
  name: 'Llama 3.1 8B (Ollama)',
  api: 'openai-completions',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000
};

const response = await stream(ollamaModel, context, {
  apiKey: 'dummy' // Ollama doesn't need a real key
});
```

Many unified LLM APIs completely ignore providing a way to abort requests. This is entirely unacceptable if you want to integrate your LLM into any kind of production system. Many unified LLM APIs also don't return partial results to you, which is kind of ridiculous. pi-ai was designed from the beginning to support aborts throughout the entire pipeline, including tool calls. Here's how it works:

```typescript
import { getModel, stream } from '@mariozechner/pi-ai';

const model = getModel('openai', 'gpt-5.1-codex');
const controller = new AbortController();

// Abort after 2 seconds
setTimeout(() => controller.abort(), 2000);

const s = stream(model, {
  messages: [{ role: 'user', content: 'Write a long story' }]
}, {
  signal: controller.signal
});

for await (const event of s) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  } else if (event.type === 'error') {
    console.log(`${event.reason === 'aborted' ? 'Aborted' : 'Error'}:`, event.error.errorMessage);
  }
}

// Get results (may be partial if aborted)
const response = await s.result();
if (response.stopReason === 'aborted') {
  console.log('Partial content:', response.content);
}
```

Another abstraction I haven't seen in any unified LLM API is splitting tool results into a portion handed to the LLM and a portion for UI display. The LLM portion is generally just text or JSON, which doesn't necessarily contain all the information you'd want to show in a UI. pi-ai's tool implementation allows returning both content blocks for the LLM and separate content blocks for UI rendering. Tools can also return attachments like images that get attached in the native format of the respective provider. Tool arguments are automatically validated using [TypeBox](https://github.com/sinclairzx81/typebox) schemas and [AJV](https://ajv.js.org/), with detailed error messages when validation fails:

<div class="code-preview">

```typescript
import { Type, AgentTool } from '@mariozechner/pi-ai';

const weatherSchema = Type.Object({
  city: Type.String({ minLength: 1 }),
});

const weatherTool: AgentTool<typeof weatherSchema, { temp: number }> = {
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: weatherSchema,
  execute: async (toolCallId, args) => {
    const temp = Math.round(Math.random() * 30);
    return {
      // Text for the LLM
      output: `Temperature in ${args.city}: ${temp}°C`,
      // Structured data for the UI
      details: { temp }
    };
  }
};

// Tools can also return images
const chartTool: AgentTool = {
  name: 'generate_chart',
  description: 'Generate a chart from data',
  parameters: Type.Object({ data: Type.Array(Type.Number()) }),
  execute: async (toolCallId, args) => {
    const chartImage = await generateChartImage(args.data);
    return {
      content: [
        { type: 'text', text: `Generated chart with ${args.data.length} data points` },
        { type: 'image', data: chartImage.toString('base64'), mimeType: 'image/png' }
      ]
    };
  }
};
```

</div>

What's still lacking is tool result streaming. Imagine a bash tool where you want to display ANSI sequences as they come in. That's currently not possible, but it's a simple fix that will eventually make it into the package.

Partial JSON parsing during tool call streaming is essential for good UX. As the LLM streams tool call arguments, pi-ai progressively parses them so you can show partial results in the UI before the call completes. For example, you can display a diff streaming in as the agent rewrites a file.

pi-ai also works in the browser, which is useful for building web-based interfaces.

Finally, pi-ai provides an [agent loop](https://github.com/badlogic/pi-mono/blob/main/packages/ai/src/agent/agent-loop.ts) that handles the full orchestration: processing user messages, executing tool calls, feeding results back to the LLM, and repeating until the model produces a response without tool calls. The loop also supports message queuing via a callback: after each turn, it asks for queued messages and injects them before the next assistant response. The loop emits events for everything, making it easy to build reactive UIs.

On top of the agent loop, [pi-agent-core](https://github.com/badlogic/pi-mono/tree/main/packages/agent) provides an `Agent` class with additional creature comforts: state management, simplified event subscriptions, the actual queue storage with two modes (one-at-a-time or all-at-once), attachment handling (images, documents), and a transport abstraction that lets you run the agent either directly or through a proxy.

Am I happy with pi-ai? For the most part, yes. Like any unifying API, it can never be perfect due to leaky abstractions. But it's been used in seven different production projects and has served me extremely well.

Why build this instead of using the Vercel AI SDK? [Armin's blog post](https://lucumr.pocoo.org/2025/11/21/agents-are-hard/) mirrors my experience. Building on top of the provider SDKs directly gives me full control and lets me design the APIs exactly as I want, with a much smaller surface area.

<!--
TODO: Continue with pi-tui and pi-coding-agent sections.

Relevant files for next session:
- ../pi-mono/packages/tui/README.md
- ../pi-mono/packages/tui/src/
- ../pi-mono/packages/coding-agent/README.md
- ../pi-mono/packages/coding-agent/src/
-->

<%= render("../../_partials/post-footer.html", { title, url }) %>