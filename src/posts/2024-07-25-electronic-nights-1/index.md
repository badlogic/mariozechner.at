<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url }) %>

**Table of contents**
%%toc%%

I've always been a software guy. I can barely attach a 9V battery to anything, and if I would have to jump start a car, I'd likely kill myself. I just never found hardware that enticing, because there was so much to learn and do with software.

Welp, I have a boy who just turned 3 now. And I don't want him to interact with computers and displays just yet. While he's allowed to watch a [pre-selected video](/posts/2024-07-15-two-years-in-review/#toc_15) twice a day (guess during which activity...), we generally keep him away from displays, big and small.

We do however buy the occassional electronic toy. His [Tonibox](https://tonies.com/de-de/tonieboxen/) is probably the electronic device he interacts with the most.

<img src="media/tonibox.JPEG" class="mx-auto" style="max-width: 320px">

On paper, it's fantastic little device. It's an audio play with a toddler/small child compatible user interface. Long-press an ear to turn it on or off. Press the long ear to increase volume, press the small ear to decrease it. To start playing music or a story, take one of the figures called tonies and place it at the top of the box. The first tim you do this for a specific toni, it downloads the media based on an RFID tag inside the figure, and caches it on device. To fast forward or backward, tilt the box left or right. To go to the next or previous track, smack its right or left side. That's it. You can buy "creative tonies", onto which you can load your own media files, which is pretty nice. There also don't appear to be any [privacy issues](https://medium.com/@paul.klingelhuber/first-quick-security-impressions-of-the-toniebox-d609656634ac).

It's not perfect though. The slapping and tilting mechanism barely works, or needs an immense amount of force. Maybe our Tonibox is just broken though. The speakers have absolutely terrible quality. Even worse than the quality of our cassette players back in the 80ies and 90ies. And while there is a huge selection of tonies to buy, most aren't all that great. He usually listens to stuff we load onto the creative tonies.

One of the grandparents also gifted him a [tiptoi](https://www.ravensburger.de/de-DE/produkte/tiptoi), basically the same spiel but for interactive books. You buy the tiptoi pencil. You buy a book. Inside the book there are tags. Hold the pencil over a tag and some audio will play, e.g. explaining what's underneath the pencil, animal noises, and so on. They even implemented some shallow games, like "tip all the dogs on this page". It's OK, but we aren't the biggest fans ourselves, as we like reading to him more. He enjoys it a lot.

The last elecotronic device he got in contact with was this little guy.

<img src="media/robot.jpg" class="mx-auto" style="max-width: 320px">

It's a super cheap "robot" supposed to be able to follow black lines on a white piece of paper and navigate a maze. It can do neither really. You can also press the little button on its chest, and record a short audio snippet. The robot will then play it back at you, with shifted pitch.

He laughed his ass off for almost an hour doing just that. And so did we. He also got a little creative, giving the robot instructions, which obviously didn't work. This would not have played out like that if it was a function on the Tonibox. The robot form factor, the silly movement, and the pitch shift sold the deal.

Which got me thinking. I don't want to write more software-only display-y things for him, like [his little video player](/posts/2024-07-15-two-years-in-review/#toc_15). I want to introduce him to the digital world with tangible, physical things. And I don't want to depend on companies to provide me with those things. I want to build them myself. And who knows, eventually, he might join in on the fun of building.

So that's my plan: build small electronic gadgets for the boy.

Except, I know fuck all about electronics. But I do know how to write code, which should give me a little edge getting up to speed.

## Who am I writting this for?
I'll be documenting my journey through the wonderful world of electronics here. First and foremost for myself, so I have a diary of things I read, tried, succeeded at, and failed at. Down the line, it might also come in handy to the boy, should he choose to learn these things himself.

Wading through forums and subreddits, it seems there are a lot of people like me: proficient coders who want to get into electronics without any or little prior knowledge, to build small gadgets.

So I figured I'll share my learning path. I will document:

* Books, videos, and other educational resources I found useful (or not)
* Parts, kits, tools, and software and whether they are any good (or necessary)
* Projects I built, including schematics (or photos, because how the fuck do you create schematics?), code, and a little video demoing it

During the day, I use breaks to read books or search resources. When the boy is asleep, I build things or check out software tools useful for the task at hand. This gives me about 1-3 hours in a day to learn, experiment and document as outlined above.

Every night I do the above, I'll write a blog post. At least that's the plan. I suppose I'll postpone the blog post writting every now and then, so it will be more like a do-night, write-night kind of thing.

**It is NOT my goal to teach you electronics!**

That'd be an exceptionally terrible idea. But I hope I can save you some time wading through all the low-quality information out there.

## Where to start?

Where to start? Luckily, I have many qualified people in my circle of social media friends. So I reached out on [Twitter](https://x.com/badlogicgames/status/1814014120489795853) and [Mastodon](https://mastodon.gamedev.place/@badlogic/112809058254707818).

<img src="media/twitter.jpg" class="mx-auto" style="max-width: 320px">
<img src="media/mastodon.jpg" class="mx-auto" style="max-width: 320px">

And as expected I got a ton of great suggestions. Here's what I ended up with.

## Educational resources
There were a ton of book suggestions, with many suggesting [The Art of Electronics](https://artofelectronics.net/). It's over a thousand pages. Here's page 9.

<img src="media/artofelectronics.jpg" class="mx-auto" style="max-width: 320px">

It does not fuck around. The software equivalent may be [Types and Programming Languages](https://www.cis.upenn.edu/~bcpierce/tapl/), which also does not fuck around. But neither book seems to be terribly well suited for absolute beginners, like myself.

[Practical Electronics for Inventors](https://www.oreilly.com/library/view/practical-electronics-for/9781259587559/) was another suggestion. Skimming through a very legal copy on the internet, it appeared to be a great reference book on components and circuits, but not immediately useful to an absolute beginner. This may come in handy at some point in the future though.

Another very popular suggestion where electronics books by [Forrest Mims](https://www.ersbiomedical.com/Forrest-Mims-Series_ep_126.html), specifically [Getting started in Electronics](https://www.ersbiomedical.com/assets/images/Getting%20Started%20in%20Electronics%20By%20Forrest%20Mims%20-%20Basic%20Electronics%20by%20Radio%20Shack%20Engineers%20-%20Electronics%20for%20dummies%20(handwritten).pdf).

<img src="media/mims.png" class="mx-auto" style="max-width: 320px">

It's a handwritten book, 128 pages. The tone is very informal and it features a ton of cute handdrawn illustrations. It's kinda like "Practical Electronics for Invectors" for toddlers (read: me).

Another one I found on my own was [Lessons in Electrical Circuits](https://www.ibiblio.org/kuphaldt/electricCircuits/DC/index.html). I don't know why, but this one stuck with me. I worked my way through chapters 1-8, which is mostly theory with some practical aspects mentioned here and there. I found this to be the best one in terms of learning theoretical fundamentals so far.

I also had a brief look at [Teach yourself Electricity and Electronics](https://www.mhprofessional.com/teach-yourself-electricity-and-electronics-seventh-edition-9781264441389-usa). It appears to be a sort of "Lessons in Electrical Circuits"-light. A bit too light for my taste, so I didn't spend much time on it.

Thankfully, some suggested more hands-on books as well. [Make: Electronics](https://www.makershed.com/products/make-electronics-3rd-edition-print) seems to be a very popular choice. It turns things a bit on its head by having you do practical things first and then go into the theory. The book requires you to purchase components for each section. Not something I wanted to spend time one. More on that in the next section on kits. I have only skimmed this so far, but it looks promising! I especially love how it starts out by teaching you how to not kill yourself with electricity.

[Make: Leaning Electronics with Arduino](https://www.makershed.com/products/make-learn-electronics-with-arduino) is another super hands-on book from the Make series. It walks you through creating various small projects based on [Arduino](https://arduino.cc), which is both the name of a line of micro-controllers and kits as well as the name of the company designing and producing those things. It's a super popular platform to start out with in electronics, initially geared towards hobbyists. The book walks you through a bunch of very simple projects, like getting an LED to light up, and is written in a very easy to read tone. It's intentionally light on theory and focuses on the building part. I think this is the perfect book for a motivated 10 year old who wants to learn both a bit of electronics and programming. For me, it serves as a list of small projects I can work through. This book requires you to purchase parts on your own like "Make: Electronics".

The final book I actually read isn't published on its own but comes with the [Arduino Starter Kit](https://store.arduino.cc/products/arduino-starter-kit-multi-language). It too is extremely light on any kind of theory and instead walks you through 15 projects of increasing complexity, each introducing a new component or more complex circuits. I've read through the entire book and found it to be easy to follow. The explanations for more complex circuits basically boil down to "here's how to assemble things thing that will then do X", which isn't great either. Never the less, it's the book that actually got me started doing practical stuff, because it comes with a kit full of components and an [Arduino Uno micro-controller](https://store.arduino.cc/products/arduino-uno-rev3).

## Parts, Kits, Tools, Software
Based on the list of books I figured I start out easy and purchased the [Arduino Starter Kit](https://store.arduino.cc/products/arduino-starter-kit-multi-language).

<img src="media/arduino.jpg" class="mx-auto" style="max-width: 320px">

See the store page for what's inside. There is enough stuff in there to keep you busy for a few nights and learn the most basic stuff. You can also get creative and create your own little projects.

I also bought the [Make: Electronics 3rd Kit 1 & 2 Ultimate Bundle](https://www.amazon.com/Make-Electronics-Intermediate-Component-Experiments/dp/B09HL84X33?th=1) from ProTechTrader.

<img src="media/make.jpg" class="mx-auto" style="max-width: 320px">

I likely heavily overpaid for a bunch of cheap crap. It includes the book, a multi-meter, a soldering iron, an Arduino Uno, and a ton of components I can re-use in other projects. I have not touched this one yet, as I want to work through all the Arduino Starter Kit projects first.

My office space is designed for a programmer, which means a bare table, a monitor, and a shitty desk lamp, which is more a mood light than a work light. So I also ordered [the cheapest magnifying glass + light + arm combo](https://www.amazon.de/-/en/dp/B0BLGD8D3G?psc=1&ref=ppx_yo2ov_dt_b_product_details) I could find on Amazon.

<img src="media/light.jpg" class="mx-auto" style="max-width: 320px">

Finally, I bought a [bit set + screw driver](https://www.amazon.de/-/en/dp/B08NWJH6TD?psc=1&ref=ppx_yo2ov_dt_b_product_details) and [a set of tweezers](https://www.amazon.de/-/en/dp/B079K874CQ?psc=1&ref=ppx_yo2ov_dt_b_product_details), both from iFixIt, both super overpriced.

Truthfully, to complete the Arduino Starter Kit, I wouldn't have needed anything other than the kit. Alas, daddy likes toys.

In terms of software, I of course installed the [Arduino IDE](https://www.arduino.cc/en/software), fired it up once, then closed it again. It's not great (from the perspective of a seasoned software developer). I installed the [PlatformIO](https://platformio.org/) extension in VS Code instead, as that's where I spent most of my programming time these days. Seems to do the job. The only issue I found was that it relies on the Microsoft C++ extension for auto-completions, code navigation, etc., which I don't find to be particularly great. It also clashes with my beloved [Clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension. Tried to fight it, but lost.

For educational purposes I found [CircuitJS](https://www.falstad.com/circuit/) to be super useful. It's a circuit simulator that lets you draw simple (and not so simple) circuits and poke at them, digitally, e.g. to see what a resistor does to voltage and current, etc. I used it to re-create circuits from "Lessons in Electrical Circuits" to help me build intuition. Still working on the intuition part.

The final two pieces of software I found interesting were [Tinkercad](https://www.tinkercad.com/circuits) and [Wokwi](https://wokwi.com/). Both let you simulate micro-controller based circuits in the browser. Note that Wokwi doesn't seem to actually do a proper electrical simulation. I could not find a way to probe circuits in terms of voltage, current, or resistance. Tinkercad does perform such a simulation, but probing it is very cumbersome compared to CircuitJS. Both are great options to quickly try out a micro-controller based circuit should you be away from your physical hardware.

## Project - Where the fuck is the 220 ohm resistor?
If you came here via RSS or chance,

<%= render("../../_partials/post-footer.html") %>