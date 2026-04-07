<%
meta("../../meta.json")
meta()
const path = require('path');
url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../\_partials/post-header.html", { title, image, url, caption }) %>

<h1 class="toc-header">Table of contents</h1>
<div class="toc">
%%toc%%
</div>

So, this is awkward. I've joined Cristina, Jakob, Ramiz, Vegard, [Armin](https://lucumr.pocoo.org/), and Colin at [Earendil](https://earendil.com). And I'm taking [pi](https://pi.dev), the little coding agent that could, with me.

Now, before you get out the pitchforks, hear me out.

## Why would you do that?

Many reasons! Let me give you a "quick" history lesson.

### "It's like poetry, it rhymes" - the great George Lucas

I've been doing OSS since 2009ish. My first "success story" was [libGDX](https://libgdx.com), a cross-platform game development framework. Back in 2011, it was all the rage and the most used game development framework on Android. Some prominent libGDX users included Niantic (Ingress was built with libGDX, Pokemon Go was not) and the peeps behind Slay the Spire. It also powers Spine, a commercial game development tool I've been involved in for almost 10 years now.

I mostly handed over the reins to a beautiful team of core contributors in 2016, who to this day keep the project well maintained. I never commercialized libGDX, unless you consider it commercialization to build a proprietary piece of software like Spine on top of it.

Zero regrets, worked out beautifully, opened many doors, and got me in touch with a lot of very interesting (and kind) people. Some I proudly call friends.

libGDX also got me involved with the now defunct RoboVM by Niklas Therning and Henric Müller. RoboVM was an ahead-of-time compiler and runtime for JVM code on iOS, similar to the (also defunct) Xamarin which did the same for C#. Niklas created a RoboVM-based iOS backend for libGDX, allowing libGDX users to easily port their games over to Apple's devices. He and Henric eventually realized that RoboVM might have commercial potential, and built a company around it. They got me on board early on and put me in charge of creating the first commercial, proprietary add-on: a debugger.

Within a year, we grew the team by another 5 people and eventually reached almost full feature parity with Xamarin, including an IntelliJ IDEA based IDE that made cross-platform mobile development pretty enjoyable. The core RoboVM tech stayed open-source, while the debugger, Xcode storyboard integration, and other bells and whistles were our commercial offering.

Then Miguel and Nat approached us. Long story short: we sold RoboVM to Xamarin. A short while later Xamarin closed-sourced our open-source RoboVM core, quickly followed by Xamarin selling to Microsoft. Then Microsoft shut down RoboVM immediately.

While there was some monetary gain, everything about this fucking sucked. As the "OSS guy", who held pull request contests for the RoboVM repo and did most of the community management on the side, I was also the guy who had to write the "Sorry, no more OSS, suckers" blog post. You cannot imagine what people called me on social media and via email, despite me having zero control over the situation (I was not a majority shareholder). RoboVM going closed-source was devastating, and it made me sour on both VC-funded startups and OSS. But ultimately, none of this bullshit mattered.

What did matter was the community we built around both libGDX and RoboVM. A few days after RoboVM's open-source core was closed-source, a handful of libGDX contributors forked the old RoboVM repo and got to work. Within days, libGDX games could be compiled via the fork. Within a handful of months, they got back full feature parity, including a debugger, Xcode integration and more. To this day, libGDX is powered by this RoboVM fork, called MobiVM, on iOS.

Why am I telling you this? Because I want you to know that I've seen some shit when it comes to OSS and commercial efforts. Good and bad. I've learned some things along the way. And I don't take any of this lightly.

### "I tell you what I want, what I really, really want" - Spice Girls

Maybe you've heard about the little app called [OpenClaw](https://openclaw.ai). OpenClaw is powered by pi. That made me collateral of [Peter](https://steipete.me)'s success. Especially after Armin thought it's a good idea to tell the whole world about the relationship between OpenClaw and pi on his [blog](https://lucumr.pocoo.org/2026/1/31/pi/).

Anyone who couldn't reach Peter would reach out to me. Any VC or big corp you can think of in this space has knocked on my door one way or another. I've also had many calls with people I look up to who turned out to be pi users. I've spent the last 2 months in 3-5 calls per day.

I learned a few things. My European brain thinks pi is just another small, mildly useful OSS project of mine with no commercial value. My peers in the space seem to think it has properties that make it stand out over the alternatives. VCs and big corps seem to think that pi has commercial value. Some demonstrated their conviction by sending term sheets or "dream job" offers.

Seeing all this interest, and watching more and more people build real things with pi, part of me wants to take this further. That includes building a team. It also includes commercialization to feed the team, done in a way that doesn't repeat the shit I lived through with RoboVM.

But I've also learned what I do not want. I do not want to build my own company around pi. We have a four-year-old kid. I want to watch and help him grow up as best as I can. This is, first and foremost, what I want. Everything else is secondary to that. In the past 2 months, he cried a lot because "daddy isn't here". I never ever want to experience that again.

Now here's what my professional life as Mr. CEO of a freshly VC-funded startup would look like: get a team together, possibly a co-founder, find product market fit, establish a company culture, resolve interpersonal relationship issues within the team, step into every landmine you can step into along the way, feel alone and stressed out, spend every waking hour worrying how you'll make the company work, be uniquely responsible for increasing shareholder value, stop engineering, become a dull boy managing (again).

On top of that, such a VC-funded startup entirely focused on commercializing pi, and only pi, would have to make some decisions that'd lead to the same bullshit I've experienced at RoboVM. It is extremely hard to find co-founders and investors who understand this space. And while I have some experience with VCs, I don't feel confident in my ability to select a VC that is OSS compatible.

The immense stress associated with all this is not something I strive for. And it would be at odds with my biggest want: help our little one grow up. And yet, I'd probably also have big regrets if I didn't give it a try in some way.

So, here's what I want:

- Be with our kid, keep our lifestyle, never have our boy cry again because of "work"
- Make pi OSS sustainable by putting a small team together and adding a commercial topping, that doesn't go against the OSS spirit and the community
- Don't repeat the errors of the past

What to do, what to do?

### Of Demented Elves

I think Armin and I first met 14 years ago, on the r/austria subreddit. We did not align politically on many things, him being a "hyper neoliberal" and me being a "social democrat" (at least according to what I feel was our mutual impression of each other). Any time I saw that @mitsuhiko handle in a thread, I felt the urge to tell someone they are wrong on the internet.

The one thing that differentiated Armin from other internet trolls was the way he conducted himself in these heated discussions. He was never emotional or aggressive. Our discussions would either end in cordial disagreement, or a newfound common understanding. That's extremely rare on the internet.

We eventually met up in Vienna in real-life, sometime in 2016. The Sentry office was still in its infancy, and a young [Daniel](https://danielgriesser.com/3/), whom I'd shared an office with in Graz before he joined Sentry, was all excited showing me his new workplace.

Over coffee, Armin and I found we had more in common than we thought. Not only politically, but also in the way we think about software, and OSS specifically. In my recollection, we became actual friends that day, even if we didn't meet again for many years in real life. But we kept trolling each other on the internet, with a newfound appreciation for each other.

The same day I also visited Peter in his Vienna office, where he'd casually grill the biggest steak I've ever seen while we discussed how our businesses were going. Classic Peter.

Fast forward 9 years. It is April 2025. Peter is going banana cuckoo on Twitter, yelling at anyone who wants to listen: THE AGENTS, THEY WORK. Naturally, Armin and I were skeptical, but we each got a Claude Code subscription, installed the latest CLI and ... well. Stopped sleeping for a while. A very long while.

In May, the three of us ended up at Peter's flat in Vienna and built our first vibe slopped project together: VibeTunnel. Ever since then, we experimented, threw ideas at each other, commented on or revised each other's technical blog posts, and generally had a lot of fun together, online and offline. Spectators would eventually give a name to our madness: the Vienna School of Agentic Coding. I'm not Viennese, but I'll allow it.

In September, Peter organized the first Claude Code Anonymous in Vienna, a meetup of kindred sleepless people. That's when I first met Colin. He had very expensive-looking shoes and a "finance guy" aura, but was otherwise personable. We ended up spending an hour just talking about our lives in a weirdly open way. At least given the fact that we only knew each other for 10 minutes before that. In retrospect, I think it was kind of a cute hit job: Colin was likely tasked with checking out if we vibe. From that point onwards, he and Armin tried to "poach" me. Gently. Guess the vibe check passed.

I wasn't really interested at the time though. I'd just finished my work on Sitegeist, a browser agent, which had me excited. I thought that'd be a nice side-gig and income stream just for fun, and declined their advances.

I was going to Vienna more often, for talks, meetups, or with family, and usually ended up at the Earendil offices one way or another. Armin and Colin would show me their progress with Elwing, an email agent, and get me super early access to try it (and break it). They each created their own version of Elwing. With hilarious results. In one long red teaming conversation, Colin's Elwing would go off the rails. It was henceforth known as "demented elf". It has since been put out of its misery, which kinda makes me sad.

During my Earendil office visits I also got to know Cristina, a young engineer and one of the first Earendil hires. We had a one-on-one at some point where I got to learn about her background. Turns out, she had a connection to Peter via a mentorship, is a brilliant engineer and funny human.

I also became an early (small-scale) investor in Earendil. Why not throw a bunch of dudes and dudettes in a garage some bones for nice office furniture? Especially if I can sit in that used Herman Miller anytime I visit? Great deal.

Then Peter decided to build Warelay/Claudebot/Moltbot/OpenClaw on top of pi, OpenClaw exploded in popularity, Armin wrote that blog post telling everyone the role of pi in OpenClaw, and I got a lot of calls (see above).

I kept Armin and Colin in the loop, asking for their advice. Until one fateful day in February, whenj they themselves called with an offer. Well played, gents, you got all the inside information to design a great deal.

Now, for me, deal making is usually a very dry, mechanical affair. But it becomes hard if it involves friends. I'd lie if I'd say it wasn't an emotional struggle for all three of us. But I think that was actually valuable. We got to test how the three of us work together under stress. I got to see Colin work. And we set expectations. Eventually, we worked it out.

### But why Earendil?

Well, the wall of text above should give you an idea. But let me spell it out.

Armin has a proven track record in open-source and its commercialization. He deeply understands the dynamics and fine lines that combination entails. Like me, he thinks open-source and open protocols are a necessity, not just lipstick on a corporate pig. We've loosely worked together on the "Vienna School of Agentic Coding", via VibeTunnel, by commenting on each other's ideas, via pi, and by going on podcasts together. We vibe, both on a personal and technical level.

Colin is pretty OK for an ex-finance dude. He has good product sense and isn't afraid to get his hands dirty (with slop). He also knows how to navigate all the parts of a startup I do not want to deal with. We vibe on a personal level. Him and his agents won't ever get write access to the pi repository though.

Before we closed the deal, I got to see Cristina, Jakob, Ramiz, Vegard in action, at the office, on the Earendil Discord, and in repositories on GitHub. While each of them has a (somewhat) specialized background, they are actually all generalists. And great human beings with a great sense of humor. I also like to think we are vibing. But it could also be just a case of kids being nice to weird old gramps on the internet, tolerating his shitty jokes. In either case, the kids are alright.

None of the early-stage investors are on my naughty list, quite the opposite. Some of them I know in person. Many of them have experience in the dev tools space. I have high confidence that they will have the right mixture of "let them do their thing" and "here's some actually helpful feedback from our point of view and experience".

Earendil's products are built on top of pi. That gives me additional signal with respect to what works and doesn't work in pi. And eventually, some Earendil team members will help with pi work under my supervision and direction. Conversely, I get to contribute to consumer-facing products. Something that's quite new for me, as I've always been more on the dev tools side of things aimed at technical people.

Despite its Tolkien-inspired name, Earendil is not a tech company with fascist tendencies. Quite the opposite. They are basically well-meaning hippies in my book, who think software, and specifically AI, should serve humans, not the other way around. In their view, software should not replace humans, it should enable them. Like many companies, they have a [charter outlining their values](https://earendil.com/values/). I contributed a tiny amount to this charter. I align with it, even though my old grumpy cold heart still needs to warm up to the Kumbaya wording.

If you are as big of a cynical old person as I am, you will roll your eyes and say: charters are worth exactly nothing. We've seen this before: "Don't be evil", "Developers, developers, developers", etc. And I agree.

But I like to think I do not misjudge the people of Earendil. I've seen them work, I've seen them be humans. And I have shared history with Armin. All this gives me high confidence that Earendil will not do anything super duper extra dumb. It would hurt both Earendil and Armin's reputation. And as a last resort, pi can be forked by anyone able to click that button on GitHub. Just like the people of libGDX did with RoboVM.

Finally, and most importantly to me, almost everyone on the team has kids. And Earendil, the company, is mindful of that as a consequence.

## What does this all mean for pi?

There are multiple layers to this pie. See what I did there?

### The mechanical parts

The GitHub repository moves from `badlogic/pi-mono` to `earendil-works/pi`. We're hoping GitHub will set up a redirect so existing links and clones don't break. TBD on that.

Similarly, the package name changes from @mariozechner/pi-coding-agent to @earendil/pi. We’ll set up a sort of redirect here as well.

[pi.dev](https://pi.dev) remains pi's home. It will get an Earendil logo alongside what's already there. That's it.

The [Discord](link) stays as is. It's a community effort, not an Earendil property. I'll continue to be on there to field questions when I have time, same as before.

### Governance

pi is owned by Earendil, the company. I'm a shareholder of Earendil and in charge of all pi decisions, along with Armin and Colin. Technical direction, roadmap, what gets merged, what doesn't, what is open-source and what is not.

External contributions continue to work exactly as they do today. No CLA, no DCO, no new hoops to jump through. You open a PR, I review it, we go from there.

The pi name and logo are trademarked by Earendil. When you see pi, it's an Earendil product with me at the helm. This is the same approach used by Mozilla, Linux, and others. The trademark is our main mechanism of protection, not license tricks.

OSS weekends and vacations will continue to be a thing until we've figured out a different type of bottleneck that helps us deal with the influx of agent-generated slop. Once we've onboarded some trustworthy individuals as contributors, they may get less frequent. At the moment I still don't trust anyone, as everyone is just slinging their clanker without a lot of thought.

### Open-Source-ness

pi is MIT licensed. It will stay MIT licensed. You can use it, fork it, build products on top of it, sell those products. Nothing changes.

On top of the MIT core, there will be some commercial additions over time. Here's how we think about it in three tiers:

1. **MIT (the core):** pi as you know it. MIT, forever. Non-negotiable.
2. **Fair Source (value-add features):** Some future commercial features will be Fair Source licensed. Free to use, source available, and they convert to full open-source after a set period via Delayed Open Source Publication (DOSP). Think of it as open-source on a delay, and downside risk protection for you as a user.
3. **Proprietary (enterprise):** Some enterprise-specific features and cloud infrastructure will be proprietary. No source available. This is the stuff that pays the bills for the stuff in tiers 1 and 2.

We haven't built tiers 2 and 3 yet. When we do, you'll know. For a deeper dive into the licensing philosophy, read [Armin's post on licensing pi](https://rfc.earendil.com/0015/).

And if you ever feel like we've lost the plot, the fork button on GitHub still works. Always will.

## In Closing

I'm very happy that the last 2 months are behind me. I think I've found a good home for pi, with great humans helping me take care of it. Being part of a team that builds consumer-facing products is new territory for me, and I'm genuinely looking forward to it.

And not having to go this alone feels great.

Sincerely,
Pidalf

<%= render("../../\_partials/post-footer.html", { title, url }) %>
