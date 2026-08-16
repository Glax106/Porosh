# Porosh — Channel HUD

A static, multi-file portfolio site for [@poroshyt](https://youtube.com/@poroshyt) built with HTML5, Tailwind CSS (CDN), GSAP + ScrollTrigger, and Lenis smooth scroll. No build step — deploys straight to GitHub Pages.

## File structure

```
index.html         DOM markup, sections, video modal
css/styles.css      Custom glows, glassmorphism, preloader, cursor, grid
js/loader.js        Preloader progress bar + entry handoff
js/youtube.js       Automated video fetch (Data API v3 → RSS fallback)
js/animations.js    Lenis init, GSAP ScrollTrigger reveals, counters,
                    particle canvas, custom cursor, 3D tilt, magnetic CTAs
```

## Get exact stats & the most reliable video feed (2 minutes, optional)

The site works out of the box with **zero configuration** — it resolves
the channel from the `@poroshyt` handle and pulls uploads from the
public RSS feed automatically. For **exact** subscriber/view counts and
the most reliable upload list, add a free API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/),
   create a project, and enable **YouTube Data API v3**.
2. Create an API key under **Credentials**.
3. Open `js/youtube.js` and paste it in:

   ```js
   const POROSH_YT_CONFIG = {
     CHANNEL_HANDLE: 'poroshyt',
     CHANNEL_ID: '',       // optional — paste the UC... ID to skip resolution
     API_KEY: 'YOUR_KEY_HERE',
     ...
   };
   ```

   Restrict the key to the YouTube Data API v3 and to your GitHub Pages
   domain (Application restrictions → HTTP referrers) before shipping.

Without a key, the site falls back to:
- **Videos:** the channel's public RSS feed via `rss2json.com`.
- **Stats:** a best-effort read of the public channel page. If that
  fails for any reason, the counters simply stay hidden rather than
  showing a wrong number — nothing breaks.

## Deploying to GitHub Pages

1. Push this folder to a repo (e.g. `porosh-site`).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**,
   pick `main` and `/ (root)`.
4. Save — your site goes live at `https://<username>.github.io/<repo>/`.

No build tools, no `node_modules`, no bundler — everything loads from
CDNs (Tailwind, GSAP, Lenis) at runtime.

## Notes

- Update the social links in the footer (`index.html`, `#contact`) —
  Instagram, X, and Discord are placeholder `#` links.
- The contact email in the footer (`hello@poroshyt.com`) is a
  placeholder — swap it for a real inbox.
- Reduced-motion users automatically get static content — the
  preloader, glitch effect, particle canvas, and cursor all respect
  `prefers-reduced-motion`.
