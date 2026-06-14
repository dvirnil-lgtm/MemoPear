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

## Email Notifications (SendGrid)

Subscription cancellation requests are emailed to `info@memopear.com` using
Firebase's **Trigger Email from Firestore** extension, sent through
SendGrid's SMTP relay.

### Step 1: Install the extension

```bash
firebase ext:install firebase/firestore-send-email --project YOUR_PROJECT_ID
```

Or install it from the Firebase Console → **Extensions** → "Trigger Email
from Firestore". Configure it with:

- **SMTP connection URI**: `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`
- **Email documents collection**: `mail`
- **Default FROM address**: a verified SendGrid sender, e.g. `MemoPear <no-reply@memopear.com>`

### Step 2: Allow writes to the `mail` collection

Add a rule alongside the existing `cancellationRequests` rule so signed-in
users can trigger the cancellation email:

```
match /mail/{id} {
  allow create: if request.auth != null;
}
```

`logCancellationRequest` in `firebase.ts` writes to both
`cancellationRequests` (audit trail) and `mail` (sends the notification).

## Team Seats & Invitations (Firestore)

Multi-seat plans use Firestore to share seats across devices and accounts:

- `subscriptions/{ownerUid}` — one doc per paying owner, holding `seats`,
  `cycle`, an `inviteToken`, and the `members` array (emails that have claimed
  a seat). The owner always occupies one seat.
- `seatClaims/{uid}` — a pointer written when a teammate claims a seat, used to
  grant that user Pro access on sign-in.

**How invites work:** the owner shares one link of the form
`https://<your-domain>/?join=1&sub=<ownerUid>&token=<inviteToken>`. When someone
opens it and signs in, `claimSeat()` adds them to `members` inside a transaction,
enforcing the cap (`members.length + 1 < seats`). Once every seat is filled the
link stops working and shows **"all seats are taken."** Owners can reset the
token (invalidating old links) or remove a member to free a seat from the **Team**
panel, which lists every email connected to the subscription.

Add these rules alongside the existing `mail` / `cancellationRequests` rules:

```
match /subscriptions/{ownerUid} {
  // Invitees read the doc (with the token) to claim a seat; they're
  // already signed in by then.
  allow read: if request.auth != null;
  // Only the owner can create their own subscription doc.
  allow create: if request.auth != null && request.auth.uid == ownerUid;
  // Teammates must update `members` to claim a seat, so update can't be
  // owner-restricted — the seat cap is enforced in the claim transaction.
  allow update: if request.auth != null;
}
match /seatClaims/{uid} {
  // The owner deletes a teammate's claim doc when freeing a seat, so this
  // can't be restricted to `uid == request.auth.uid`.
  allow read, write: if request.auth != null;
}
```

> **Note:** these rules require Firebase Auth (Google/LinkedIn sign-in). The
> seat cap is enforced client-side in a transaction; for stronger guarantees
> (e.g. preventing a signed-in user from editing another team's members) move
> `claimSeat`/`removeSeatMember` into a Cloud Function. Owners who sign up with
> local email/password are keyed by `local:<email>` and need either Firebase
> Auth or relaxed rules for the panel to sync.

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
