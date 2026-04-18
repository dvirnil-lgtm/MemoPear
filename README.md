# MemoPear

Smart field intelligence and lead capture platform. Capture, enrich, and manage conference leads with Gemini AI integration.

## Local Development

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set your VITE_GEMINI_API_KEY
npm run dev
```

## Deploy to Google Cloud Run

### Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. A Google Cloud project with billing enabled
3. Your GoDaddy domain

### Step 1: Set up Google Cloud

```bash
# Authenticate
gcloud auth login

# Set your project (replace with your project ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

### Step 2: Build and Deploy

**Option A: Deploy directly with gcloud (simplest)**

```bash
# Build and deploy in one command
gcloud run deploy memopear \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="" \
  --build-arg="VITE_GEMINI_API_KEY=your_api_key_here"
```

**Option B: Using Cloud Build (CI/CD)**

```bash
# Submit build with your API key
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GEMINI_API_KEY="your_api_key_here"
```

### Step 3: Map your custom domain (GoDaddy)

```bash
# Map your domain to the Cloud Run service
gcloud run domain-mappings create \
  --service memopear \
  --domain your-domain.com \
  --region us-central1

# Get the DNS records Cloud Run needs
gcloud run domain-mappings describe \
  --domain your-domain.com \
  --region us-central1
```

This will output DNS records you need to add. Then in GoDaddy:

1. Go to **GoDaddy DNS Management** for your domain
2. Add the DNS records from the command above:
   - For apex domain (`yourdomain.com`): Add **A records** pointing to the IPs shown
   - For www subdomain: Add a **CNAME record** pointing to `ghs.googlehosted.com`
3. Wait for DNS propagation (5 min to 48 hours)
4. Google Cloud will automatically provision an SSL certificate

### Step 4: Verify

```bash
# Check service status
gcloud run services describe memopear --region us-central1

# Check domain mapping status
gcloud run domain-mappings list --region us-central1
```

Visit your domain - it should show the MemoPear site with a valid SSL certificate.

## Android App

### Prerequisites

1. Install [Android Studio](https://developer.android.com/studio)
2. During install, make sure "Android SDK" is checked
3. A [Google Play Developer account](https://play.google.com/console) ($25 one-time fee)

### Build the Android App

```bash
# Build the web app and sync to Android
npm run android:build

# Open in Android Studio
npx cap open android
```

Android Studio will open. Then:

1. Wait for Gradle sync to finish (progress bar at bottom)
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Create a new keystore (or use existing) - SAVE THIS FILE, you need it for every update
5. Fill in the key details and click **Next**
6. Select **release** and click **Create**
7. The `.aab` file will be in `android/app/release/`

### Publish to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - App name: **MemoPear**
   - Default language: **English**
   - App or Game: **App**
   - Free or Paid: your choice
4. Go to **Production > Create new release**
5. Upload the `.aab` file from the build step
6. Fill in release notes
7. Complete all the required sections in the left sidebar (store listing, content rating, pricing)
8. Submit for review (takes 1-7 days)

### Store Listing Info

You'll need these for the Play Store listing:
- **Short description**: Smart AI-powered lead capture for conferences and trade shows
- **Full description**: MemoPear transforms trade show encounters into high-velocity pipeline data. Scan business cards with AI, capture QR codes, record meeting notes with voice transcription, and generate personalized follow-up emails - all powered by Google Gemini AI.
- **Category**: Business
- **Screenshots**: At least 2 phone screenshots (take them from the running app)
- **App icon**: 512x512 PNG (use the MemoPear logo)

## Project Structure

```
/
├── index.html              # HTML entry point
├── index.tsx               # React entry (ReactDOM.render)
├── index.css               # Tailwind + custom styles
├── App.tsx                 # Main application component
├── types.ts                # TypeScript type definitions
├── components/
│   ├── QRScanner.tsx       # QR code scanner
│   ├── CommMethodToggle.tsx # Communication method toggle buttons
│   └── LegalPages.tsx      # Privacy, Terms, Contact pages
├── services/
│   └── geminiService.ts    # Gemini AI integration
├── package.json
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── Dockerfile              # Multi-stage Docker build
├── nginx.conf              # Nginx config for serving the SPA
├── cloudbuild.yaml         # Google Cloud Build config
└── .env.example            # Environment variable template
```
