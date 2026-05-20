import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Client } from "twitter-api-sdk";

const DEFAULT_USERNAME = "badlogicgames";
const DEFAULT_OUT_FILE = "/www/recommended-reading/recommendations.json";
const DEFAULT_RSS_FILE = "/www/recommended-reading/rss.xml";
const DEFAULT_DATA_FILE = "/state/recommendations.json";
const DEFAULT_STATE_FILE = "/state/recommendations-state.json";
const DEFAULT_INTERVAL_SECONDS = 60 * 60;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_DAYS_BACK = 365;
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (process.argv.includes("--loop")) {
    while (true) {
        await syncOnce();
        await sleep(numberEnv("SYNC_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS) * 1000);
    }
} else {
    await syncOnce();
}

async function syncOnce() {
    try {
        const token = process.env.TWITTER_BEARER_TOKEN?.trim() || requiredEnv("TWITTER_API_KEY");
        const username = (process.env.TWITTER_USERNAME ?? DEFAULT_USERNAME).trim().replace(/^@/, "");
        const outFile = process.env.RECOMMENDATIONS_FILE ?? DEFAULT_OUT_FILE;
        const rssFile = process.env.RECOMMENDATIONS_RSS_FILE ?? DEFAULT_RSS_FILE;
        const dataFile = process.env.RECOMMENDATIONS_DATA_FILE ?? DEFAULT_DATA_FILE;
        const stateFile = process.env.STATE_FILE ?? DEFAULT_STATE_FILE;

        const client = new Client(token);
        const user = await getUser(client, process.env.TWITTER_USER_ID?.trim(), username);
        const state = await readJson(stateFile, { lastFetchedTweetId: null, fetchedAt: null });
        const oldItems = await readJson(dataFile, await readJson(outFile, []));
        const byId = new Map(oldItems.map((item) => [item.id, item]));
        const backfill = process.env.BACKFILL === "true" || process.argv.includes("--backfill");
        const sinceId = backfill ? null : state.lastFetchedTweetId;
        const usernameForUrls = user.username ?? username;
        const flushProgress = (progress) =>
            writeRecommendationOutputs({ ...progress, byId, username: usernameForUrls, outFile, dataFile, rssFile });
        const { tweets, media, quotedTweets } = await fetchNewTweets(client, user.id, usernameForUrls, sinceId, backfill, flushProgress);

        if (tweets.length === 0) {
            const items = await refreshStaleMetadata(oldItems);
            await writeJson(dataFile, items);
            await writeJson(outFile, items);
            await writeRss(rssFile, items);
            console.log(`[${new Date().toISOString()}] No new tweets.`);
            return;
        }

        const items = await writeRecommendationOutputs({
            label: "final",
            tweets,
            media,
            quotedTweets,
            byId,
            username: usernameForUrls,
            outFile,
            dataFile,
            rssFile,
            refreshMeta: true,
        });

        state.lastFetchedTweetId = maxId(state.lastFetchedTweetId, ...tweets.map((tweet) => tweet.id));
        state.fetchedAt = new Date().toISOString();
        await writeJson(stateFile, state);

        console.log(`[${state.fetchedAt}] Done. Fetched ${tweets.length} tweet(s), saved ${items.length} recommendation(s).`);
    } catch (err) {
        if (err.status && err.error) {
            console.error(`${err.status} ${err.statusText}: ${err.error.title ?? "Twitter API error"}`);
            if (err.error.detail) console.error(err.error.detail);
        } else {
            console.error(err.stack ?? err.message ?? err);
        }
    }
}

async function getUser(client, id, username) {
    if (id) return { id, username };

    const res = await client.users.findUserByUsername(username, {
        "user.fields": ["id", "username"],
    });

    if (!res.data?.id) throw new Error(`Could not find user ${username}`);
    return res.data;
}

async function fetchNewTweets(client, userId, username, sinceId, backfill, onProgress) {
    if (backfill) return fetchBackfillTweets(client, username, onProgress);

    const tweetsById = new Map();
    const media = new Map();
    const quotedTweets = new Map();
    const maxPages = numberEnv("MAX_PAGES", DEFAULT_MAX_PAGES);

    const baseParams = {
        max_results: 100,
        ...(sinceId ? { since_id: sinceId } : {}),
        "tweet.fields": ["created_at", "conversation_id", "entities", "referenced_tweets", "attachments"],
        expansions: ["attachments.media_keys", "referenced_tweets.id", "referenced_tweets.id.attachments.media_keys"],
        "media.fields": ["media_key", "type", "variants", "url", "preview_image_url"],
    };

    async function readTimelinePages(exclude) {
        await withRetries(async () => {
            let pages = 0;
            for await (const page of client.tweets.usersIdTweets(userId, { ...baseParams, exclude })) {
                collectPage(page, tweetsById, media, quotedTweets);
                pages += 1;
                await onProgress?.({
                    label: `timeline ${exclude.join(",")} page ${pages}`,
                    tweets: [...tweetsById.values()],
                    media,
                    quotedTweets,
                });
                if (pages >= maxPages) break;
            }
        }, `user timeline fetch: ${exclude.join(",")}`);
    }

    if (sinceId) {
        await readTimelinePages(["retweets"]);
    } else {
        await readTimelinePages(["retweets", "replies"]);
        await readTimelinePages(["retweets"]);
    }

    return { tweets: [...tweetsById.values()], media, quotedTweets };
}

async function fetchBackfillTweets(client, username, onProgress) {
    const tweetsById = new Map();
    const media = new Map();
    const quotedTweets = new Map();
    const startTime = recommendationsStartTime();
    const maxPages = numberEnv("MAX_PAGES", DEFAULT_MAX_PAGES);

    await readSearchPages(
        client,
        {
            query: `from:${username} ("recommended reading" OR "recommended viewing") -is:retweet -is:reply`,
            start_time: startTime,
        },
        maxPages,
        tweetsById,
        media,
        quotedTweets,
        onProgress,
    );

    await readSearchPages(
        client,
        {
            query: `from:${username} is:reply -is:retweet`,
            start_time: startTime,
        },
        maxPages,
        tweetsById,
        media,
        quotedTweets,
        onProgress,
    );

    return { tweets: [...tweetsById.values()], media, quotedTweets };
}

async function readSearchPages(client, searchParams, maxPages, tweetsById, media, quotedTweets, onProgress) {
    const params = {
        max_results: 100,
        ...searchParams,
        "tweet.fields": ["created_at", "conversation_id", "entities", "referenced_tweets", "attachments"],
        expansions: ["attachments.media_keys", "referenced_tweets.id", "referenced_tweets.id.attachments.media_keys"],
        "media.fields": ["media_key", "type", "variants", "url", "preview_image_url"],
    };

    await withRetries(async () => {
        let pages = 0;
        for await (const page of client.tweets.tweetsFullarchiveSearch(params)) {
            collectPage(page, tweetsById, media, quotedTweets);
            pages += 1;
            await onProgress?.({
                label: `${searchParams.query} page ${pages}`,
                tweets: [...tweetsById.values()],
                media,
                quotedTweets,
            });
            if (pages >= maxPages) break;
        }
    }, `full archive search: ${searchParams.query}`);
}

async function withRetries(operation, label) {
    const maxRetries = numberEnv("TWITTER_MAX_RETRIES", DEFAULT_MAX_RETRIES);
    const baseDelayMs = numberEnv("TWITTER_BACKOFF_MS", DEFAULT_BACKOFF_MS);
    const maxDelayMs = numberEnv("TWITTER_MAX_BACKOFF_MS", DEFAULT_MAX_BACKOFF_MS);

    for (let attempt = 0; ; attempt++) {
        try {
            return await operation();
        } catch (err) {
            if (!isRetryableTwitterError(err) || attempt >= maxRetries) throw err;

            const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
            const resetDelay = rateLimitResetDelayMs(err);
            const delay = resetDelay === undefined ? exponentialDelay : Math.max(exponentialDelay, resetDelay);
            console.warn(`${label} failed with ${err.status ?? "error"}. Retrying in ${Math.round(delay / 1000)}s.`);
            await sleep(delay);
        }
    }
}

function isRetryableTwitterError(err) {
    return err?.status === 429 || err?.status === 500 || err?.status === 502 || err?.status === 503 || err?.status === 504;
}

function rateLimitResetDelayMs(err) {
    const reset = headerValue(err, "x-rate-limit-reset");
    if (!reset) return undefined;

    const resetMs = Number(reset) * 1000 - Date.now() + 1000;
    return Number.isFinite(resetMs) && resetMs > 0 ? resetMs : undefined;
}

function headerValue(err, name) {
    const headers = err?.headers;
    if (!headers) return undefined;
    if (typeof headers.get === "function") return headers.get(name);
    return headers[name] ?? headers[name.toLowerCase()];
}

async function writeRecommendationOutputs({ label, tweets, media, quotedTweets, byId, username, outFile, dataFile, rssFile, refreshMeta = false }) {
    const context = { media, quotedTweets, username };
    const newItems = tweets.map((tweet) => toRecommendation(tweet, context)).filter(Boolean);

    for (const item of newItems) {
        const old = byId.get(item.id);
        byId.set(item.id, {
            ...old,
            ...item,
            meta: old?.meta ?? (await fetchPageMeta(item.url)),
        });
    }

    addReviewsFromReplyChains(tweets, byId, username);

    let items = [...byId.values()].sort((a, b) => compareIds(b.id, a.id));
    if (refreshMeta) items = await refreshStaleMetadata(items);
    await writeJson(dataFile, items);
    await writeJson(outFile, items);
    await writeRss(rssFile, items);

    const reviews = items.reduce((sum, item) => sum + (item.reviews?.length ?? 0), 0);
    console.log(
        `[${new Date().toISOString()}] ${label}: ${tweets.length} tweet(s), ${items.length} recommendation(s), ${reviews} review(s), oldest: ${items.at(-1)?.createdAt ?? "n/a"}`,
    );

    return items;
}

function collectPage(page, tweetsById, media, quotedTweets) {
    for (const item of page.data ?? []) tweetsById.set(item.id, item);
    for (const item of page.includes?.media ?? []) media.set(item.media_key, item);
    for (const item of page.includes?.tweets ?? []) quotedTweets.set(item.id, item);
}

function toRecommendation(tweet, context) {
    const kind = recommendationKind(tweet.text);

    if (!kind || isReplyTweet(tweet)) return null;

    const url = kind === "viewing" ? videoUrl(tweet, context) : readingUrl(tweet, context);
    if (!url) {
        console.warn(`Skipping ${tweet.id}: no linked ${kind === "reading" ? "article" : "video"} URL found.`);
        return null;
    }

    return {
        id: tweet.id,
        kind,
        createdAt: tweet.created_at ?? null,
        text: plainText(tweet.text),
        url,
        tweetUrl: context.username ? `https://x.com/${context.username}/status/${tweet.id}` : `https://twitter.com/i/web/status/${tweet.id}`,
    };
}

function recommendationKind(text) {
    const normalized = text.trimStart().toLowerCase();
    if (normalized.startsWith("recommended reading")) return "reading";
    if (normalized.startsWith("recommended viewing")) return "viewing";
}

function externalUrl(tweet) {
    return (tweet.entities?.urls ?? [])
        .map((url) => url.unwound_url ?? url.expanded_url ?? url.url)
        .find((url) => url && !isTweetUrl(url));
}

function readingUrl(tweet, context) {
    const linkedArticle = externalUrl(tweet);
    if (linkedArticle) return linkedArticle;

    for (const ref of tweet.referenced_tweets ?? []) {
        if (ref.type !== "quoted") continue;
        const quoted = context.quotedTweets.get(ref.id);
        if (!quoted) continue;
        const quotedArticle = externalUrl(quoted);
        if (quotedArticle) return quotedArticle;
    }
}

function videoUrl(tweet, context) {
    const linkedVideo = externalUrl(tweet) ?? nativeVideoUrl(tweet, context.media);
    if (linkedVideo) return linkedVideo;

    for (const ref of tweet.referenced_tweets ?? []) {
        if (ref.type !== "quoted") continue;
        const quoted = context.quotedTweets.get(ref.id);
        if (!quoted) continue;
        const quotedVideo = externalUrl(quoted) ?? nativeVideoUrl(quoted, context.media);
        if (quotedVideo) return quotedVideo;
    }
}

function nativeVideoUrl(tweet, media) {
    for (const key of tweet.attachments?.media_keys ?? []) {
        const item = media.get(key);
        if (item?.type !== "video" && item?.type !== "animated_gif") continue;

        const bestMp4 = (item.variants ?? [])
            .filter((variant) => variant.content_type === "video/mp4" && variant.url)
            .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0))[0];

        if (bestMp4?.url) return bestMp4.url;
        if (item.url) return item.url;
        if (item.preview_image_url) return item.preview_image_url;
    }
}

function isReplyTweet(tweet) {
    return tweet.referenced_tweets?.some((ref) => ref.type === "replied_to") ?? false;
}

function addReviewsFromReplyChains(tweets, recommendationsById, username) {
    const repliesByParentId = new Map();

    for (const tweet of tweets) {
        const parentId = tweet.referenced_tweets?.find((ref) => ref.type === "replied_to")?.id;
        if (!parentId) continue;

        const replies = repliesByParentId.get(parentId) ?? [];
        replies.push(tweet);
        repliesByParentId.set(parentId, replies);
    }

    for (const replies of repliesByParentId.values()) {
        replies.sort((a, b) => compareIds(a.id, b.id));
    }

    for (const recommendation of recommendationsById.values()) {
        const reviews = recommendation.reviews ?? [];
        const seenReviewIds = new Set(reviews.map((review) => review.id));
        let currentTweetId = reviews.at(-1)?.id ?? recommendation.id;

        while (true) {
            const nextReply = (repliesByParentId.get(currentTweetId) ?? []).find((reply) => !seenReviewIds.has(reply.id));
            if (!nextReply) break;

            reviews.push(reviewFromTweet(nextReply, username));
            seenReviewIds.add(nextReply.id);
            currentTweetId = nextReply.id;
        }

        if (reviews.length) recommendation.reviews = reviews;
        else delete recommendation.reviews;
    }
}

function reviewFromTweet(tweet, username) {
    return {
        id: tweet.id,
        inReplyToTweetId: tweet.referenced_tweets?.find((ref) => ref.type === "replied_to")?.id,
        createdAt: tweet.created_at ?? null,
        text: plainText(tweet.text).replace(new RegExp(`^@${username}\\s+`, "i"), ""),
        tweetUrl: username ? `https://x.com/${username}/status/${tweet.id}` : `https://twitter.com/i/web/status/${tweet.id}`,
    };
}

function isTweetUrl(raw) {
    try {
        const url = new URL(raw);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();
        return ["x.com", "twitter.com", "mobile.twitter.com"].includes(host) && url.pathname.includes("/status/");
    } catch {
        return false;
    }
}

function isYouTubeUrl(raw) {
    try {
        const url = new URL(raw);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();
        return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
    } catch {
        return false;
    }
}

async function fetchYouTubeMeta(url) {
    try {
        const oembedUrl = new URL("https://www.youtube.com/oembed");
        oembedUrl.searchParams.set("url", url);
        oembedUrl.searchParams.set("format", "json");

        const response = await fetch(oembedUrl, {
            signal: AbortSignal.timeout(10_000),
            headers: {
                "user-agent": "mariozechner.at recommendation fetcher (+https://mariozechner.at/recommended-reading/)",
                accept: "application/json",
            },
        });

        if (!response.ok) return null;

        const data = await response.json();
        return {
            title: data.title,
            description: data.author_name ? `Video by ${data.author_name}` : undefined,
            image: data.thumbnail_url,
            siteName: data.provider_name ?? "YouTube",
            fetchedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.warn(`Could not fetch YouTube metadata for ${url}: ${err.message ?? err}`);
        return null;
    }
}

async function refreshStaleMetadata(items) {
    const refreshed = [];
    let count = 0;

    for (const item of items) {
        if (!isStaleMeta(item)) {
            refreshed.push(item);
            continue;
        }

        const meta = await fetchPageMeta(item.url);
        refreshed.push({ ...item, meta });
        count += 1;
    }

    if (count > 0) console.log(`[${new Date().toISOString()}] Refreshed metadata for ${count} item(s).`);
    return refreshed;
}

function isStaleMeta(item) {
    if (!item.meta?.title) return true;
    if (!isYouTubeUrl(item.url)) return false;

    const title = item.meta.title.trim().toLowerCase();
    const siteName = item.meta.siteName?.trim().toLowerCase();
    return title === "- youtube" || title === "youtube" || siteName !== "youtube";
}

async function fetchPageMeta(url) {
    const youtubeMeta = isYouTubeUrl(url) ? await fetchYouTubeMeta(url) : null;
    if (youtubeMeta) return youtubeMeta;

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10_000),
            headers: {
                "user-agent": "mariozechner.at recommendation fetcher (+https://mariozechner.at/recommended-reading/)",
                accept: "text/html,application/xhtml+xml",
            },
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.toLowerCase().includes("html")) {
            return { fetchedAt: new Date().toISOString() };
        }

        const html = await response.text();
        const title = pickMeta(html, "og:title", "twitter:title") ?? tagText(html, "title");
        const description = pickMeta(html, "og:description", "twitter:description", "description");
        const image = pickMeta(html, "og:image", "twitter:image");
        const siteName = pickMeta(html, "og:site_name");

        return {
            title: title ? decodeHtml(title.trim()) : undefined,
            description: description ? decodeHtml(description.trim()) : undefined,
            image: image ? new URL(decodeHtml(image.trim()), url).href : undefined,
            siteName: siteName ? decodeHtml(siteName.trim()) : undefined,
            fetchedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.warn(`Could not fetch metadata for ${url}: ${err.message ?? err}`);
        return { fetchedAt: new Date().toISOString(), error: String(err.message ?? err) };
    }
}

function pickMeta(html, ...names) {
    const metaTags = html.match(/<meta\s[^>]*>/gi) ?? [];
    for (const name of names) {
        for (const tag of metaTags) {
            const property = attr(tag, "property") ?? attr(tag, "name");
            if (property?.toLowerCase() === name.toLowerCase()) return attr(tag, "content");
        }
    }
}

function tagText(html, tagName) {
    return html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"))?.[1];
}

function attr(tag, name) {
    return tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"))?.[1];
}

function plainText(text) {
    return decodeHtml(text.replace(/\s*https?:\/\/t\.co\/[A-Za-z0-9_]+/g, "").trim());
}

function decodeHtml(text) {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

async function readJson(file, fallback) {
    try {
        return JSON.parse(await readFile(file, "utf8"));
    } catch (err) {
        if (err.code === "ENOENT") return fallback;
        throw err;
    }
}

async function writeJson(file, value) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeRss(file, items) {
    const entries = items.map((item) => {
        const title = item.meta?.title ?? item.text ?? item.url;
        const description = [item.text, ...(item.reviews ?? []).map((review) => review.text)].filter(Boolean).join("\n\n");
        const pubDate = item.createdAt ? new Date(item.createdAt).toUTCString() : new Date().toUTCString();

        return `        <item>
            <title>${xml(title)}</title>
            <link>${xml(item.url)}</link>
            <guid isPermaLink="false">${xml(item.tweetUrl)}</guid>
            <pubDate>${xml(pubDate)}</pubDate>
            <description>${xml(description)}</description>
        </item>`;
    });

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Mario Zechner recommended reading/viewing</title>
        <link>https://mariozechner.at/recommended-reading/</link>
        <description>Articles and videos I recommended on socials.</description>
${entries.join("\n")}
    </channel>
</rss>
`;

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, rss);
}

function xml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function requiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
}

function numberEnv(name, fallback) {
    const value = Number(process.env[name] ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function recommendationsStartTime() {
    if (process.env.RECOMMENDATIONS_START_TIME) return process.env.RECOMMENDATIONS_START_TIME;

    const date = new Date();
    date.setUTCDate(date.getUTCDate() - numberEnv("RECOMMENDATIONS_DAYS_BACK", DEFAULT_DAYS_BACK));
    return date.toISOString();
}

function maxId(...ids) {
    return ids.filter(Boolean).sort(compareIds).at(-1) ?? null;
}

function compareIds(a, b) {
    return BigInt(a) > BigInt(b) ? 1 : BigInt(a) < BigInt(b) ? -1 : 0;
}
