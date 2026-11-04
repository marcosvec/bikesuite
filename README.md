# BikeSuite

BikeSuite is a public, static portfolio demo of a bike shop management and point-of-sale application.
It runs entirely in the browser with seeded demo data and no account, database, payment processor, or
AI integration.

## Features

- Dashboard with sales analytics and work order status
- Point of Sale interface with cart and checkout
- Inventory management with stock tracking and categories
- Customer database with visit history and spending
- Work order tracking from intake to pickup
- Three themes: Light, Dark, and Abyss
- Local-only demo mode designed for GitHub Pages

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Data:** Local mock data (no database required)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

The app is configured for static export. The GitHub Actions workflow builds the `out/` directory and
publishes it to GitHub Pages. No environment variables are required.

## License

MIT

## Reference catalogs

Inventory > Grab database opens manufacturer, product-type, and category selection.
Imports merge by stable source ID into a browser-local reference catalog; they do not
create inventory, change quantities, or set selling/cost prices. Reimporting updates
existing references without duplicates. Reset demo data also clears imported references.

Current collectors cover the public US Trek Bikes listing and Giant bicycle family
listings. Trek pagination is followed to the last page. Giant entries are model
families, not individual builds. Neither snapshot claims complete historical-year,
component, or specification coverage. Unavailable brands are disabled in the popup.
Missing years/prices are left unknown; collection dates and source links are retained.

On Windows, refresh the snapshots with Python 3 and PowerShell:

```sh
python scripts/refresh-catalogs.py trek giant
```

The collector pauses between requests, stops on HTTP errors, and replaces a snapshot
only after successful collection. Review snapshot changes before committing. GitHub
Pages serves these JSON snapshots; the browser does not scrape external websites.

## Navigation demo

Settings > General contains sidebar auto-collapse (four seconds after navigation)
and demo sign-in. Both default on. Plain Tab toggles the sidebar outside
fields and dialogs; Shift+Tab retains reverse focus navigation. Sign-in accepts any
value, including blank, and never stores passwords. All pages remain unlocked for
the current browser tab session, including refreshes, until Lock is clicked in the
top bar or the inactivity timeout expires (five minutes by default, configurable
from 1 to 120 minutes in Settings > General). Activity resets the timer; refreshes
and background-tab suspension do not reset elapsed inactivity. Disabling Require
sign-in also disables automatic inactivity locking. The inline sign-in screen hides the workspace before preferences load.
Lock also works when automatic sign-in prompts are disabled. This is a demonstration,
not an authentication or data-security boundary.

Check-in is a work-in-progress placeholder.

## Verification

Before committing or publishing:

```sh
npm test
python -m unittest discover -s tests -p test_collectors.py
npm run lint
npm run build
npm audit
```

Tests cover default locking, blank sign-in, session restoration, inactivity,
manual locking, portal cleanup, sidebar timing, keyboard behavior, catalog validation,
bulk/category imports, duplicate handling, failed downloads, and storage failures.
The Pages workflow runs application and collector tests before building.

Current catalog coverage is limited: Trek's public US bicycle listing has 225
model/frameset records; Giant has 67 family references. These snapshots were collected
October 25, 2026. They do not include complete historical model years or component
specifications. Fuji and SE Bikes could not be collected from the checked public
endpoints; Cannondale and J&B Importers do not yet have collectors. Disabled source
buttons are intentional; no missing source is represented by fake data.
