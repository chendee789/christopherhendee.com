# christopherhendee.com

Source for my personal portfolio site. Plain HTML/CSS/JS — no build step, no framework.

## Structure

```
index.html      Page content (all sections)
css/style.css   All styling
js/main.js      Small script: mobile nav toggle, footer year
CNAME           Tells GitHub Pages which custom domain to serve this repo on
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
