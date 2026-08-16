# christopherhendee.com

Source for my personal portfolio site. Plain HTML/CSS/JS — no build step, no framework.

## Structure

```
index.html      Page content (all sections)
css/style.css   All styling
js/main.js      Small script: mobile nav toggle, footer year, contact email reveal
CNAME           Tells GitHub Pages which custom domain to serve this repo on
robots.txt      Crawler rules — see "Security / privacy" below
```

## Viewing it locally

No build tools needed. Either:

- Double-click `index.html` to open it directly in a browser, or
- From this folder, run a tiny local server so relative paths behave exactly like they will in production:

  ```
  python3 -m http.server 8000
  ```

  then visit `http://localhost:8000` in a browser.

## Deploying

This repo is set up to deploy via **GitHub Pages**:

1. Push this repo to GitHub.
2. In the repo's Settings → Pages, set the source to the `main` branch, root folder.
3. In Settings → Pages, set the custom domain to `christopherhendee.com` (the `CNAME` file in
   this repo already declares it, but GitHub Pages also wants it set in the UI).
4. At the domain registrar for christopherhendee.com, add the DNS records GitHub Pages
   instructs (typically four `A` records pointing the apex domain at GitHub's IPs, plus
   optionally a `CNAME` record for `www`).

Full step-by-step is tracked in the "Getting Christopher A New Job" Claude project.

## Editing content

All page copy lives directly in `index.html`, organized by `<section id="...">` blocks:
`about`, `experience`, `projects`, `leadership`, `skills`, `contact`. Styling lives in
`css/style.css`, grouped by the same sections.

## Security / privacy

This site is intentionally set up to be reachable only via a direct link, not discovered
through search:

- **`robots.txt`** disallows all crawlers by default — including Google, Bing, and general
  AI-training bots (GPTBot, CCBot, Google-Extended, Bytespider, etc.) — with one exception:
  Anthropic's `Claude-User` crawler (the one that fetches a page live when someone asks Claude
  to look at it) is explicitly allowed. `ClaudeBot` (Anthropic's training crawler) and
  `Claude-SearchBot` are blocked like everything else.
- **`<meta name="robots" content="noindex, nofollow">`** in `index.html`'s `<head>` backs this
  up — it's the more reliable of the two ways to stay out of Google's index, since robots.txt
  alone doesn't guarantee a linked page won't get indexed.
- **The contact email is built in JavaScript** (`js/main.js`) instead of being written directly
  in the HTML, so simple scrapers that just read page source won't pick it up as easily.

**Important limitation:** robots.txt and the noindex tag are both *requests* that well-behaved
crawlers choose to honor — they are not access control. Nothing here stops a scraper that's
built to ignore them, and the page's HTML is still publicly reachable by anyone who has (or
guesses) the URL, since GitHub Pages serves static files to any request without
authentication. There's no way to actually restrict "humans only" without adding a layer in
front of GitHub Pages (e.g. Cloudflare) that can inspect and challenge traffic — see the
"Getting Christopher A New Job" Claude project for notes on that, if/when it gets set up.

Separately, the domain registration itself (GoDaddy account 2FA, domain transfer lock, WHOIS
privacy, DNSSEC) matters more for security than anything in this repo — a compromised
registrar account can redirect the whole domain regardless of what the site's code does.
