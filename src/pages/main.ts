import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseElement } from "../app.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";
import { githubIcon, mastodonIcon, twitterIcon } from "../utils/icons.js";

@customElement("main-page")
export class MainPage extends BaseElement {
    render() {
        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle} p-4 gap-4 min-h-[100vh]">
                <div class="flex items-center mb-4 mt-4">
                    <div class="flex flex-col">
                        <h1 class="text-3xl">{ Mario Zechner }</h1>
                        <span>${i18n("developer, coach, speaker")}</span>
                    </div>
                    <theme-toggle class="mb-auto ml-auto -mr-2 -mt-2"></theme-toggle>
                </div>
                <color-band class="w-full h-[80px]"></color-band>
                <h2>Who I am</h2>
                <p>
                    I'm an independent software developer, coach, and angel investor with over 15 years of experience in academia
                    <q-l href="https://scholar.google.at/citations?user=6hFnJ00AAAAJ&hl=en"></q-l>, startups
                    <q-l
                        href="https://www.businesswire.com/news/home/20151021005382/en/Xamarin-Acquires-RoboVM-Now-the-Only-Cross-Platform-Mobile-Development-Company-for-the-Top-Two-Enterprise-Languages"
                    ></q-l
                    >, industry, and open-source software <q-l href="https://github.com/badlogic"></q-l>.
                </p>
                <p>My primary technical expertise lies in applied machine learning, data science, compiler engineering, and computer graphics.</p>
                <p>
                    I've led interdisciplinary, international teams and projects, devised and supervised the implementation of product roadmaps and
                    business plans, acquired customers, and secured funding.
                </p>
                <p>
                    I've authored books <q-l href="https://link.springer.com/book/10.1007/978-1-4302-3043-4"></q-l> and academic papers
                    <q-l href="https://scholar.google.com/citations?user=6hFnJ00AAAAJ&hl=en&oi=ao"></q-l>, been a speaker on the technical conference
                    circuit <q-l href="https://vimeo.com/181931320"></q-l><q-l href="https://gamedevdays.com/speaker/mario-zechner/"></q-l>, won
                    awards <q-l href="https://web.archive.org/web/20160312004045/https://www.oracle.com/javaone/rock-star-wall-of-fame.html"></q-l
                    ><q-l
                        href="https://web.archive.org/web/20210921141558/https://www.constantinus.net/de/wall-of-fame/archiv/wall-of-fame-archiv.html?Ergebnisse=50&blatt=13"
                    ></q-l
                    ><q-l href="https://blogs.oracle.com/java/post/2014-dukes-choice-award-winners"></q-l>, taught at school and university, mentored
                    young entrepreneurs, and invested in early-stage startups.
                </p>
                <p>
                    The birth of my son was a pivotal moment, inspiring me to contribute to the community
                    <q-l href="https://cards-for-ukraine.at"></q-l> and leverage my skills to highlight societal issues
                    <q-l href="https://www.wired.com/story/heisse-preise-food-prices/"></q-l><q-l href="https://heisse-preise.io/media.html"></q-l>.
                </p>

                <h2 class="mt-8">What I offer</h2>
                <ul>
                    <li>- Pro-bono mentoring of young entrepreneurs on technical and business aspects</li>
                    <li>- Technical workshops <q-l href="https://github.com/badlogic/genai-workshop/tree/main"></q-l></li>
                    <li>- Independent consulting on compelling projects</li>
                </ul>
                <div>Pricing is tailored to meet individual or organizational needs.</div>

                <h2 class="mt-8">Get in touch</h2>
                <div class="flex flex-col">
                    <div class="flex gap-2 mb-3">
                        <a href="https://twitter.com/badlogic"><i class="icon w-8 h-8">${twitterIcon}</i></a>
                        <a href="https://mastodon.gamedev.place/@badlogic"><i class="icon w-8 h-8">${mastodonIcon}</i></a>
                        <a href="https://github.com/badlogic"><i class="icon w-8 h-8">${githubIcon}</i></a>
                    </div>
                    <a href="mailto:contact@mariozechner.at">contact@mariozechner.at</a>
                    <span>Schörgelgasse 3</span>
                    <span>8010 Graz</span>
                    <span>Austria</span>
                </div>

                <h2 class="mt-8">Musings</h2>
                <ul>
                    <li><a href="https://marioslab.io">Personal blog</a></li>
                </ul>

                <div class="mt-auto text-xs text-center">
                    This page respects your privacy, not employing cookies or similar technologies, nor collecting any personally identifiable
                    information.
                </div>
            </div>
        </div>`;
    }
}
