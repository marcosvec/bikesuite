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
