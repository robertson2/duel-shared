# Deployment Guide

This guide will help you deploy the Advocacy Platform to Railway (backend) and Vercel (frontend).

## Architecture Overview

- **Backend (FastAPI)**: Deployed on Railway
- **Frontend (Next.js)**: Deployed on Vercel
- **Database**: PostgreSQL (can be provisioned on Railway or use external service)

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository**: Your code should be in a GitHub repository
4. **PostgreSQL Database**: Either provision on Railway or use an external service (Supabase, Neon, etc.)

## Part 1: Deploy Backend to Railway

### Step 1: Create a New Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### Step 2: Configure the Service

1. Railway will auto-detect your Python project
2. Add a **PostgreSQL** service:
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway will automatically create a database and provide connection variables

### Step 3: Set Environment Variables

In your Railway service, go to the "Variables" tab and add:

**Required Variables:**
```
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

**Optional Variables (with defaults):**
```
API_HOST=0.0.0.0
API_PORT=$PORT
CORS_ORIGINS=https://your-frontend-domain.vercel.app
LOG_LEVEL=INFO
DATA_DIR=/app/data
DATA_ARCHIVE_DIR=/app/data/archive
```

**Prefect (Optional):**
```
PREFECT_API_URL=http://localhost:4200/api
PREFECT_DASHBOARD_URL=http://localhost:4200
PREFECT_ONLY_HISTORY=false
```

**Email Notifications (Optional):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_USE_TLS=true
NOTIFICATION_EMAIL=your_notification_email@example.com
NOTIFICATION_FROM_EMAIL=noreply@advocacy-platform.com
```

### Step 4: Initialize the Database

1. Get your database connection string from Railway
2. Connect to your database and run the schema:
   ```bash
   psql $DATABASE_URL -f schema/schema.sql
   ```
   
   Or use Railway's PostgreSQL service terminal:
   - Click on your PostgreSQL service
   - Go to "Connect" tab
   - Use the provided connection details

### Step 5: Deploy

1. Railway will automatically detect the `Procfile` or `railway.json`
2. The build will start automatically
3. Once deployed, Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)

### Step 6: Test the Backend

Visit `https://your-app.up.railway.app/docs` to see the API documentation.

## Part 2: Deploy Frontend to Vercel

### Step 1: Create a New Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `.next` (or leave default)
   - **Install Command**: `npm install` (or leave default)

### Step 2: Set Environment Variables

In your Vercel project settings, go to "Environment Variables" and add:

**Required:**
```
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

**Important Notes:**
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser
- Replace `https://your-railway-app.up.railway.app` with your actual Railway backend URL
- Make sure to add this for all environments (Production, Preview, Development)

### Step 3: Configure CORS on Backend

Update your Railway backend's `CORS_ORIGINS` environment variable to include your Vercel domain:

```
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

You can add multiple origins separated by commas.

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. Once complete, you'll get a URL like `https://your-app.vercel.app`

## Part 3: Post-Deployment Setup

### 1. Update CORS Origins

After getting your Vercel URL, update the Railway backend's `CORS_ORIGINS` to include:
- Your production Vercel URL
- Any preview URLs (optional, for testing)

### 2. Test the Integration

1. Visit your Vercel frontend URL
2. Check the browser console for any API connection errors
3. Test a few API calls to ensure the frontend can communicate with the backend

### 3. Set Up Custom Domains (Optional)

**Railway:**
- Go to your Railway service → Settings → Domains
- Add your custom domain

**Vercel:**
- Go to your Vercel project → Settings → Domains
- Add your custom domain
- Update `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` accordingly

## Troubleshooting

### Backend Issues

**Database Connection Errors:**
- Verify all database environment variables are set correctly
- Check that the PostgreSQL service is running
- Ensure the schema has been initialized

**Port Issues:**
- Railway automatically sets the `$PORT` environment variable
- Make sure your `Procfile` uses `$PORT` instead of a hardcoded port

**Build Failures:**
- Check Railway logs for specific error messages
- Ensure `requirements.txt` is in the root directory
- Verify Python version compatibility

### Frontend Issues

**API Connection Errors:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check that the backend URL is accessible (visit it in a browser)
- Ensure CORS is configured correctly on the backend

**Build Failures:**
- Check Vercel build logs
- Ensure `package.json` is in the `frontend` directory
- Verify Node.js version compatibility

**CORS Errors:**
- Make sure your Vercel URL is in the backend's `CORS_ORIGINS`
- Check browser console for specific CORS error messages
- Verify the backend is returning proper CORS headers

### Common Environment Variable Issues

**Frontend can't connect to backend:**
- Ensure `NEXT_PUBLIC_API_URL` uses `https://` (not `http://`)
- Verify the backend URL is correct and accessible
- Check that the backend service is running

**Backend can't connect to database:**
- Verify all database variables are set
- Check that Railway's PostgreSQL service is running
- Ensure the database schema has been initialized

## Continuous Deployment

Both Railway and Vercel support automatic deployments:

- **Railway**: Automatically deploys on push to your main branch
- **Vercel**: Automatically deploys on push to your main branch and creates preview deployments for pull requests

## Monitoring

### Railway
- View logs in the Railway dashboard
- Set up alerts for service failures
- Monitor resource usage

### Vercel
- View build and runtime logs in the Vercel dashboard
- Monitor analytics and performance
- Set up error tracking (optional)

## Cost Considerations

**Railway:**
- Free tier: $5 credit/month
- Paid plans start at $20/month
- PostgreSQL add-on: Additional cost

**Vercel:**
- Free tier: Generous limits for personal projects
- Pro plan: $20/month for teams
- Custom domains included

## Security Best Practices

1. **Never commit `.env` files** - Use platform environment variables
2. **Use strong database passwords** - Railway generates secure passwords automatically
3. **Enable HTTPS** - Both platforms provide SSL certificates automatically
4. **Restrict CORS origins** - Only allow your frontend domain(s)
5. **Rotate credentials regularly** - Especially for production environments
6. **Use secrets management** - Both platforms provide secure environment variable storage

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domains
3. Set up CI/CD pipelines (if not using auto-deploy)
4. Implement authentication/authorization
5. Set up database backups
6. Configure rate limiting
7. Add error tracking (Sentry, etc.)

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Project Issues**: Check your repository's issue tracker

