# Google Cloud Run Setup Guide

Complete guide to deploying VORA Router to Google Cloud Run with CI/CD.

## 📋 Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- GitHub repository access
- GitHub token for commenting on issues

## 🚀 Quick Deploy (5 minutes)

### 1. Set up Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"

# Authenticate
gcloud auth login

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
# Create Docker repository
gcloud artifacts repositories create vora \
  --repository-format=docker \
  --location=$REGION \
  --description="VORA Router container images"

# Verify
gcloud artifacts repositories list
```

### 3. Deploy VORA Router

```bash
# Clone and navigate to repo
cd /path/to/VORA-Router

# Deploy to Cloud Run
gcloud run deploy vora-router \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars "GITHUB_TOKEN=your_github_token_here"

# Get the service URL
SERVICE_URL=$(gcloud run services describe vora-router \
  --region $REGION \
  --format 'value(status.url)')

echo "✅ VORA Router deployed to: $SERVICE_URL"
```

### 4. Test Deployment

```bash
# Health check
curl $SERVICE_URL

# Test routing endpoint
curl -X POST $SERVICE_URL/route \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "body": "This is a simple test to verify VORA routing"
  }'
```

## ⚙️ Set up CI/CD with GitHub Actions

### 1. Create Service Account

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions-vora \
  --display-name="GitHub Actions for VORA Router"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com

cat ~/gcp-key.json
# Copy this output - you'll need it for GitHub secrets
```

### 2. Configure GitHub Secrets

Go to your GitHub repository:

1. **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_PROJECT_ID` | `your-project-id` | Your Google Cloud project ID |
| `GCP_SA_KEY` | Contents of `gcp-key.json` | Service account credentials |
| `GITHUB_TOKEN` | Your GitHub PAT | For commenting on issues (optional) |

### 3. Verify GitHub Actions Workflow

The workflow is already configured in `.github/workflows/deploy-cloud-run.yml`.

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch

**Steps**:
1. Build Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run
4. Output service URL

### 4. Test CI/CD

```bash
# Make a small change
echo "# Test CI/CD" >> README.md

# Commit and push
git add README.md
git commit -m "test: Verify CI/CD pipeline"
git push origin main

# Watch the deployment
# Go to: https://github.com/your-org/VORA-Router/actions
```

## 🔗 Set up GitHub Webhook

### 1. Get Cloud Run URL

```bash
gcloud run services describe vora-router \
  --region $REGION \
  --format 'value(status.url)'
```

### 2. Configure Webhook in GitHub

1. Go to your **repository** → **Settings** → **Webhooks** → **Add webhook**
2. Configure:
   - **Payload URL**: `https://your-cloud-run-url.run.app/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: (optional) Leave empty for now
   - **SSL verification**: Enable SSL verification
   - **Events**: Select "Let me select individual events" → Check **Issues**
   - **Active**: ✓ Checked

3. Click **Add webhook**

### 3. Test Webhook

1. Create a new issue in your repository
2. Add the `agent-task` label
3. VORA should automatically:
   - Analyze the task complexity
   - Assign an agent tier
   - Add a comment with the assignment
   - Add labels: `tier-X`, `rank-rX`, `vora-analyzed`

## 📊 Monitoring and Logs

### View Logs

```bash
# Stream logs
gcloud run services logs tail vora-router --region $REGION

# View in Cloud Console
open "https://console.cloud.google.com/run/detail/$REGION/vora-router/logs"
```

### View Metrics

```bash
# Open metrics dashboard
open "https://console.cloud.google.com/run/detail/$REGION/vora-router/metrics"
```

**Available Metrics**:
- Request count
- Request latency
- Container CPU utilization
- Container memory utilization
- Billable instance time

### Set up Alerts (Optional)

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels="CHANNEL_ID" \
  --display-name="VORA Router Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=60s
```

## 🔒 Security Best Practices

### 1. Restrict Webhook Access

Update Cloud Run to require authentication for webhook endpoint:

```bash
# Remove public access
gcloud run services remove-iam-policy-binding vora-router \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker"

# Create service account for GitHub
gcloud iam service-accounts create github-webhook \
  --display-name="GitHub Webhook Invoker"

# Grant invoke permission
gcloud run services add-iam-policy-binding vora-router \
  --region=$REGION \
  --member="serviceAccount:github-webhook@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

# Create token for GitHub
gcloud iam service-accounts keys create ~/github-webhook-key.json \
  --iam-account=github-webhook@${PROJECT_ID}.iam.gserviceaccount.com
```

Then update GitHub webhook to include authentication header.

### 2. Use Secret Manager for Tokens

```bash
# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# Create secret
echo -n "your-github-token" | gcloud secrets create github-token \
  --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding github-token \
  --member="serviceAccount:$(gcloud run services describe vora-router \
    --region=$REGION \
    --format='value(spec.template.spec.serviceAccountName)')@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to use secret
gcloud run services update vora-router \
  --region=$REGION \
  --update-secrets=GITHUB_TOKEN=github-token:latest
```

### 3. Enable VPC Connector (for private resources)

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create vora-connector \
  --region=$REGION \
  --network=default \
  --range=10.8.0.0/28

# Update Cloud Run to use VPC
gcloud run services update vora-router \
  --region=$REGION \
  --vpc-connector=vora-connector
```

## 💰 Cost Optimization

### Estimated Costs

**Cloud Run Pricing** (us-central1):
- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: $0.40/million requests

**VORA Router** (0.5 CPU, 512Mi RAM):
- Idle: $0.00 (min-instances=0)
- Active: ~$0.01/hour when processing
- Typical: <$10/month for moderate usage

### Reduce Costs

```bash
# Lower resources for testing
gcloud run services update vora-router \
  --region=$REGION \
  --memory=256Mi \
  --cpu=0.5

# Set max instances
gcloud run services update vora-router \
  --region=$REGION \
  --max-instances=3

# Set request timeout
gcloud run services update vora-router \
  --region=$REGION \
  --timeout=30
```

## 🛠️ Troubleshooting

### Service Won't Deploy

```bash
# Check build logs
gcloud builds list --limit=5

# Check specific build
gcloud builds log [BUILD_ID]
```

### Webhook Not Working

```bash
# Test webhook endpoint
curl -X POST https://your-url.run.app/webhook/github \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json

# Check recent requests
gcloud run services logs read vora-router \
  --region=$REGION \
  --limit=50
```

### High Costs

```bash
# Check request volume
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"' \
  --format=json

# Reduce resources
gcloud run services update vora-router \
  --region=$REGION \
  --memory=256Mi \
  --max-instances=2
```

## 🔄 Update and Rollback

### Update Service

```bash
# Update from source
gcloud run deploy vora-router \
  --source . \
  --region=$REGION

# Or update specific settings
gcloud run services update vora-router \
  --region=$REGION \
  --set-env-vars="NEW_VAR=value"
```

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=vora-router --region=$REGION

# Rollback
gcloud run services update-traffic vora-router \
  --region=$REGION \
  --to-revisions=vora-router-00001-xyz=100
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Quotas](https://cloud.google.com/run/quotas)
- [GitHub Actions for GCP](https://github.com/google-github-actions)

## ✅ Deployment Checklist

- [ ] Google Cloud project created and billing enabled
- [ ] Required APIs enabled (Run, Build, Artifact Registry)
- [ ] Artifact Registry repository created
- [ ] VORA Router deployed to Cloud Run
- [ ] Health check endpoint returns 200
- [ ] Service account created for GitHub Actions
- [ ] GitHub secrets configured (GCP_PROJECT_ID, GCP_SA_KEY)
- [ ] GitHub Actions workflow tested
- [ ] GitHub webhook configured
- [ ] Test issue created and processed by VORA
- [ ] Monitoring and logs reviewed
- [ ] Cost alerts configured (optional)
- [ ] Security hardening applied (optional)

---

**Need help?** Create an issue in the VORA-Router repository or check the main EQDMC-Systems/Infrastructure documentation.
