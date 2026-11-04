# BikeSuite

BikeSuite is a public, static portfolio demo of a bike shop management and point-of-sale application.
It runs entirely in the browser with seeded demo data. There is no account server, database, payment
processor, or AI integration. Shop edits stay in this browser's localStorage.

The live demo is [https://bikesuite.marcosvec.com](https://bikesuite.marcosvec.com).

## Features

- Dashboard with sales totals and work order status from the demo data
- Point of Sale with a cart and checkout stored locally
- Inventory with stock, categories, and reference-catalog import
- Customer records with visit history and spending
- Check-in desk that opens a work order for a dropped-off bike
- Work order tracking from intake through pickup
- Three themes: Light, Dark, and Abyss
- Browser-local sign-in with a configurable inactivity lock

## Tech stack

- **Framework:** Next.js 16 (App Router, static export)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Icons:** Lucide React
- **Data:** Seed data plus browser storage (no database)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the local dev server |
| `npm run build` | Write the static site to `out/` |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check |

`next start` is not part of this demo. `output: 'export'` does not run a Node server.

## Deployment

The GitHub Actions workflow builds `out/` and publishes that folder to GitHub Pages. The site is
served from the subdomain root, so `basePath` stays empty. No environment variables or backend
secrets are required. Leave `NEXT_PUBLIC_BASE_PATH` unset for this demo; it only exists for a
non-root host.

`CNAME` is `bikesuite.marcosvec.com`. `public/CNAME` is copied into the export. If that file is
missing from `out/`, the workflow copies the repo-root `CNAME` in before uploading the artifact,
so a deploy does not drop the custom domain.

## Reference catalogs

Inventory > Grab database opens manufacturer, product-type, and category selection.
Imports merge by stable source ID into a browser-local reference catalog; they do not
create inventory, change quantities, or set selling/cost prices. Reimporting updates
existing references without duplicates. Reset demo data also clears imported references.
A saved catalog that fails validation is left in place and reported; the importer does not
overwrite it with an empty list.

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
only after successful collection. Review snapshot changes before committing. The script
shells out to `powershell.exe`, so the live download does not run on Linux. GitHub
Pages serves the committed JSON snapshots; the browser does not scrape external websites.

## Navigation demo

Settings > General contains sidebar auto-collapse (four seconds after navigation)
and demo sign-in. Both default on. Plain Tab toggles the sidebar outside
fields and dialogs; Shift+Tab retains reverse focus navigation. Sign-in accepts any
value, including blank, and never reads or stores the password. All pages remain unlocked for
the current browser tab session, including refreshes, until Lock is clicked in the
top bar or the inactivity timeout expires (five minutes by default, configurable
from 1 to 120 minutes in Settings > General). Activity resets the timer; refreshes
and background-tab suspension do not reset elapsed inactivity. Disabling Require
sign-in also disables automatic inactivity locking. The inline sign-in screen hides the workspace before preferences load.
Lock also works when automatic sign-in prompts are disabled.

After the first successful sign-in in a browser, the demo asks whether to turn password
prompts off. Turn off asks for one more confirmation. This is a demonstration,
not an authentication or data-security boundary.

The sidebar treats a trailing slash as the same route, which matches the static export.

## Check-in

Check-in is the drop-off desk. Choose an existing customer or Walk-in, enter the bike and the
reported problem, and set a priority. Check in creates a work order in `bikesuite_work_orders`,
the same browser store the Work Orders page uses. The bike description is saved in `intake_notes`
because a work order has no separate bike field; notes are appended after an em dash.

Orders start at Intake unless Settings > Work Orders > Assume Immediate Work is on, in which
case they start In Progress. The page lists bikes still in the shop and calls out orders that
are Ready for pickup. Completed and picked-up orders stay on Work Orders only. Check-in does
not take payment, add parts, or create a customer record.

## Verification

Before committing or publishing:

```sh
npm test
python3 -m unittest discover -s tests -p test_collectors.py
npm run lint
npx tsc --noEmit
npm run build
```

On Windows, `python` can run the collector tests when `python3` is not on PATH.
The Pages workflow runs the application tests, collector tests, and type-check before building.

Tests cover default locking, blank sign-in, session restoration, inactivity,
manual locking, portal cleanup (including while turning prompts off), sidebar timing,
keyboard behavior, catalog validation, bulk/category imports, duplicate handling,
failed downloads, storage failures, corrupt saved catalogs, check-in creation,
immediate-work status, and hiding finished orders.

Current catalog coverage is limited: Trek's public US bicycle listing has 225
model/frameset records; Giant has 67 family references. These snapshots were collected
October 25, 2026. They do not include complete historical model years or component
specifications. Fuji and SE Bikes could not be collected from the checked public
endpoints; Cannondale and J&B Importers do not yet have collectors. Disabled source
buttons are intentional; no missing source is represented by fake data.

## What this demo does not do

- No real authentication, payment capture, inventory sync, or server database. Reset demo data clears this browser only.
- The lock screen accepts any password, including a blank one. It does not protect the data.
- Catalog refresh requires Windows PowerShell. Linux and the Pages workflow only run the collector unit tests.
- Fuji, SE Bikes, Cannondale, and J&B Importers stay disabled. Giant records are model families, and that snapshot is not pagination-complete.
- Viewports narrower than 768px or shorter than 540px are blocked by the screen-size guard.
- `npm audit` reports moderate advisories in the ESLint toolchain (`minimatch`). They are not part of the static demo bundle and are not force-upgraded here.

## License

MIT
