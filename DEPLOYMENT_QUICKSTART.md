# Quick Deployment Checklist

## Railway (Backend) - 5 Minutes

1. ✅ Sign up at [railway.app](https://railway.app)
2. ✅ Create new project from GitHub repo
3. ✅ Add PostgreSQL service
4. ✅ Set environment variables (see DEPLOYMENT.md)
5. ✅ Initialize database: `psql $DATABASE_URL -f schema/schema.sql`
6. ✅ Deploy - Railway auto-detects `Procfile`

**Get your backend URL:** `https://your-app.up.railway.app`

## Vercel (Frontend) - 3 Minutes

1. ✅ Sign up at [vercel.com](https://vercel.com)
2. ✅ Import GitHub repo
3. ✅ Set Root Directory: `frontend`
4. ✅ Add environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app`
5. ✅ Deploy

**Get your frontend URL:** `https://your-app.vercel.app`

## Final Step

Update Railway backend `CORS_ORIGINS` to include your Vercel URL:
```
CORS_ORIGINS=https://your-app.vercel.app
```

## That's it! 🎉

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

