# Advocacy Platform Dashboard

A modern, real-time analytics dashboard for the Advocacy Platform built with Next.js, React, and Tailwind CSS.

## Features

- 📊 **Real-time Analytics** - Live dashboard with auto-refreshing data
- 👥 **Advocate Leaderboard** - Track top performers by engagement and sales
- 📈 **Platform Performance** - Visual comparison of platform effectiveness
- 💰 **Sales Metrics** - Revenue tracking and conversion analysis
- 🎯 **Data Quality Monitoring** - Track and manage data quality issues
- 🎨 **Beautiful UI** - Modern, responsive design with Tailwind CSS
- ⚡ **Fast** - Optimized performance with SWR data fetching

## Tech Stack

- **Framework:** Next.js 14
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data Fetching:** SWR (stale-while-revalidate)
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Language:** TypeScript

## Prerequisites

- Node.js 18+ installed
- FastAPI backend running on `http://127.0.0.1:8000`
- PostgreSQL database populated with advocacy data

## Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables:**
   Edit `.env.local` with your configuration:
   ```env
   # API Configuration
   # The base URL for the FastAPI backend
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

   # Prefect Dashboard URL (optional)
   # Used for ETL Pipeline Control links in the dashboard
   NEXT_PUBLIC_PREFECT_DASHBOARD_URL=http://localhost:4200
   ```
   
   **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` - The base URL for the FastAPI backend (default: `http://127.0.0.1:8000`)
   - `NEXT_PUBLIC_PREFECT_DASHBOARD_URL` - The URL where Prefect dashboard is running (default: `http://localhost:4200`, optional)

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Project Structure

```
frontend/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   │   ├── Card.tsx     # Card component
│   │   ├── StatCard.tsx # KPI card component
│   │   └── Loading.tsx  # Loading states
│   ├── charts/          # Chart components
│   │   └── PlatformChart.tsx
│   └── LeaderboardTable.tsx
├── pages/               # Next.js pages (routes)
│   ├── index.tsx        # Dashboard home page
│   ├── advocates.tsx    # Advocates list page
│   ├── _app.tsx         # App wrapper
│   └── _document.tsx    # HTML document
├── lib/                 # Utilities and API
│   └── api.ts           # API client and types
├── styles/              # Global styles
│   └── globals.css      # Tailwind + custom styles
├── public/              # Static assets
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── next.config.js       # Next.js configuration
```

## API Integration

The dashboard connects to your FastAPI backend. Ensure the following endpoints are available:

### Required Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/analytics/top-advocates` - Top advocates by metric
- `GET /api/v1/analytics/platforms` - Platform performance data
- `GET /api/v1/sales/summary` - Sales summary statistics
- `GET /api/v1/data-quality/summary` - Data quality metrics

### API Configuration

The API client (`lib/api.ts`) includes:

- **Automatic retries** on network errors
- **Type-safe** TypeScript interfaces
- **Error handling** with user-friendly messages
- **Data caching** with SWR for optimal performance

## Features & Pages

### 1. Dashboard (Home Page)

**Route:** `/`

**Features:**
- Executive KPI cards (Revenue, Advocates, Avg Sale, Conversion Rate)
- Platform performance chart (bar chart)
- Top 20 advocates leaderboard
- Data quality summary
- Platform statistics
- Quick action buttons

**Data Refresh:** Every 30 seconds

### 2. Advocates Page

**Route:** `/advocates`

**Features:**
- Complete list of advocates (up to 100)
- Search by name or email
- Filter by engagement or sales
- Sortable table
- Export functionality
- Real-time data updates

**Data Refresh:** Every 30 seconds

## Customization

### Change Refresh Interval

In any page using `useSWR`, modify the `refreshInterval`:

```typescript
const { data } = useSWR(
  'key',
  fetcher,
  { refreshInterval: 60000 } // 60 seconds
);
```

### Customize Colors

Edit `tailwind.config.js` to change the primary color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#your-color',
        // ... other shades
      }
    }
  }
}
```

### Add New Charts

1. Create a new component in `components/charts/`
2. Use Recharts library for consistency
3. Import and use in any page

Example:
```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
```

## Troubleshooting

### "Connection Error" on Dashboard

**Problem:** Dashboard shows connection error

**Solutions:**
1. Ensure FastAPI backend is running:
   ```bash
   cd ..
   uvicorn api:app --reload
   ```
2. Check API URL in `.env.local`
3. Verify CORS is configured in FastAPI backend

### Dependencies Installation Issues

**Problem:** `npm install` fails

**Solutions:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
2. Delete `node_modules` and `package-lock.json`:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Use Node.js 18 or higher

### Port 3000 Already in Use

**Problem:** Port 3000 is occupied

**Solution:** Run on a different port:
```bash
npm run dev -- -p 3001
```

### TypeScript Errors

**Problem:** Type errors during build

**Solution:** Regenerate types or skip type checking temporarily:
```bash
npm run build -- --no-lint
```

## Performance Optimization

### Implemented Optimizations

- ✅ **SWR caching** - Reduces unnecessary API calls
- ✅ **Auto-revalidation** - Fresh data without manual refresh
- ✅ **Lazy loading** - Components load on demand
- ✅ **Optimized images** - Next.js image optimization
- ✅ **Code splitting** - Smaller bundle sizes

### Additional Optimizations

1. **Enable production build:**
   ```bash
   npm run build && npm start
   ```

2. **Add database caching** in your FastAPI backend

3. **Use CDN** for static assets in production

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Deploy to Other Platforms

- **Netlify:** Works with Next.js
- **AWS Amplify:** Full Next.js support
- **DigitalOcean App Platform:** Node.js support
- **Railway:** Easy deployment

## Analytics Queries Used

The dashboard leverages these optimized analytics queries from `analytics_queries_improved.sql`:

- **Query 1.1:** Champion Advocates (Top 50 by combined score)
- **Query 2.1:** Platform Performance Deep Dive
- **Query 5.3:** Program Performance Overview (KPIs)
- **Query 6.1:** Executive Dashboard KPIs
- **Query 6.2:** Platform Comparison (Simple)
- **Query 6.3:** Top 10 Advocates Leaderboard

## Contributing

To add new features:

1. Create a new branch
2. Add your component/page
3. Test thoroughly
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check the troubleshooting section
- Review FastAPI backend logs
- Verify database connection

---

**Built with ❤️ using Next.js, React, and Tailwind CSS**

