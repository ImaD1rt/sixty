# Sixty: a challenge tracker (Day 0 Oct 25 → Day 56 Dec 20)

Plain HTML/CSS/JS PWA. No build step and no backend. Data lives in `localStorage` on your device.

```
index.html             app shell + tab bar
styles.css             dark/light theme, mobile-first layout
app.js                 all logic: habits, macros, workouts, weight chart, calendar, urge screen, settings
manifest.webmanifest   PWA manifest (name, icons, standalone display)
sw.js                  service worker (offline cache)
icons/                 home-screen icons
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The service worker only runs over `localhost` or HTTPS, so to install it on your phone you need to host it (below).

## Host free on GitHub Pages

```bash
git init -b main && git add . && git commit -m "Sixty tracker"
gh repo create sixty --public --source=. --push
gh api -X POST "repos/{owner}/sixty/pages" -f "source[branch]=main" -f "source[path]=/"
```

After about a minute it's live at `https://<your-username>.github.io/sixty/`.

Without the `gh` CLI: create a public repo on github.com, upload these files, then go to **Settings → Pages → Deploy from a branch → main / (root)**.

## Add to your home screen

- **iPhone (Safari):** open the URL, tap **Share → Add to Home Screen**.
- **Android (Chrome):** open the URL, tap **⋮ → Install app** (or Add to Home screen).

Use the app from the home-screen icon. On iPhone, the installed app keeps its own storage, separate from Safari tabs.

## Updating

Change files, bump `VERSION` in `sw.js` (for example `sixty-v2`), then commit and push. The phone picks up the update the next time you open the app (sometimes it takes a second launch).

## Backups

Settings → **Export data** saves a JSON file. **Import from backup** restores it. Clearing site data or deleting the home-screen app erases your data, so export every week or two.
