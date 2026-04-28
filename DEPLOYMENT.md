# SevaSync Deployment Guide

This guide provides step-by-step instructions for deploying the SevaSync backend to Google Cloud Run and the frontend to Vercel.

## Section 1: Backend (Google Cloud Run)

**Prerequisites:**
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and initialized.
- Logged into the correct Google account.
- Project set in `gcloud` configuration (`gcloud config set project REPLACE_WITH_YOUR_PROJECT_ID`).

**Step 1: Enable Required APIs**
Run the following commands to enable necessary Google Cloud services:
```bash
gcloud services enable run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com
```

**Step 2: Create Artifact Registry Repository**
Create a repository to store the Docker images:
```bash
gcloud artifacts repositories create sevasync-repo \
    --repository-format=docker \
    --location=asia-south1 \
    --description="SevaSync Docker repository"
```

**Step 3: Build and Push Docker Image (First Deploy without Cloud Build)**
From the `backend` directory, build and submit the image to Cloud Build:
```bash
cd backend

gcloud builds submit --tag asia-south1-docker.pkg.dev/REPLACE_WITH_YOUR_PROJECT_ID/sevasync-repo/sevasync-backend:latest
```

**Step 4: Deploy to Cloud Run**
Deploy the image to Cloud Run. Make sure to replace the placeholder values for your environment variables!

```bash
gcloud run deploy sevasync-backend \
    --image asia-south1-docker.pkg.dev/REPLACE_WITH_YOUR_PROJECT_ID/sevasync-repo/sevasync-backend:latest \
    --region asia-south1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --set-env-vars="GEMINI_API_KEY=REPLACE_WITH_YOUR_VALUE,FIREBASE_SERVICE_ACCOUNT_JSON=REPLACE_WITH_YOUR_VALUE"
```
*(Note: If your `FIREBASE_SERVICE_ACCOUNT_JSON` contains spaces or quotes, you may need to escape it carefully or use Secret Manager for production).*

**Step 5: Get the Deployed Cloud Run URL**
After a successful deployment, the terminal will output a **Service URL** (e.g., `https://sevasync-backend-xxxxx-em.a.run.app`). Copy this URL; you will need it for the Vercel deployment.

---

## Section 2: Frontend (Vercel)

**Prerequisites:**
- Vercel CLI installed (`npm i -g vercel`) OR a GitHub repository linked to Vercel.

**Step 1: Set Environment Variables**
In your Vercel Dashboard (or via the Vercel CLI during setup), you must add the following environment variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY` = `REPLACE_WITH_YOUR_VALUE`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `REPLACE_WITH_YOUR_VALUE`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `REPLACE_WITH_YOUR_VALUE`
- `NEXT_PUBLIC_FIREBASE_APP_ID` = `REPLACE_WITH_YOUR_VALUE`
- `NEXT_PUBLIC_BACKEND_URL` = `[Paste the Cloud Run Service URL from Section 1]`

**Step 2: Deploy**
From the `frontend` directory, run the Vercel deployment command:
```bash
cd frontend
vercel --prod
```
Alternatively, push your code to GitHub and Vercel will deploy automatically based on your `vercel.json` configuration.

---

## Section 3: Post-deployment Verification Checklist

- [ ] **Backend Health Check:** Visit the Cloud Run URL in your browser. You should see `{"status":"ok","app":"SevaSync"}`.
- [ ] **Frontend Load:** Visit the Vercel URL. The landing page should render beautifully.
- [ ] **Authentication:** Test the login flow with the demo admin accounts created by the seed script.
- [ ] **Dashboard:** Ensure the dashboard loads and fetches the seeded demo data without CORS or 401 errors.
