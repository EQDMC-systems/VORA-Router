# VORA Router Deployment Checklist

Quick reference checklist for deploying VORA Router to production.

## ⚡ Quick Deploy (< 10 minutes)

### Prerequisites
- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] GitHub repository access
- [ ] GitHub Personal Access Token (for issue comments)

### Google Cloud Setup

```bash
# 1. Set environment variables
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export GITHUB_TOKEN="ghp_your_token_here"

# 2. Configure gcloud
gcloud config set project $PROJECT_ID

# 3. Enable APIs (takes ~2 minutes)
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

- [ ] Project ID set
- [ ] APIs enabled

### Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create vora \
  --repository-format=docker \
  --location=$REGION \
  --description="VORA Router images"
```

- [ ] Artifact Registry repository created

### Deploy to Cloud Run

```bash
# Navigate to VORA-Router directory
cd /path/to/VORA-Router

# Deploy (takes ~3-5 minutes)
gcloud run deploy vora-router \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "GITHUB_TOKEN=$GITHUB_TOKEN"

# Get service URL
SERVICE_URL=$(gcloud run services describe vora-router \
  --region $REGION \
  --format 'value(status.url)')

echo "Deployed to: $SERVICE_URL"
```

- [ ] Cloud Run service deployed
- [ ] Service URL obtained

### Test Deployment

```bash
# Health check
curl $SERVICE_URL

# Test routing
curl -X POST $SERVICE_URL/route \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test OAuth implementation",
    "body": "Add OAuth2 with PKCE authentication"
  }'
```

- [ ] Health check returns 200
- [ ] Routing endpoint works
- [ ] Response shows correct agent assignment

## 🔗 GitHub Integration

### Configure Webhook

1. Go to repository → **Settings** → **Webhooks** → **Add webhook**
2. Enter:
   - **Payload URL**: `[SERVICE_URL]/webhook/github`
   - **Content type**: `application/json`
   - **Events**: Issues only
   - **Active**: ✓
3. Click **Add webhook**

- [ ] Webhook created
- [ ] Webhook shows green checkmark (successful ping)

### Test End-to-End

1. Create new issue in repository
2. Add label: `agent-task`
3. Wait 5-10 seconds
4. Verify:
   - VORA adds comment with agent assignment
   - Labels added: `tier-X`, `rank-rX`, `vora-analyzed`

- [ ] Issue created with `agent-task` label
- [ ] VORA comment appears
- [ ] Labels applied correctly

## 🤖 CI/CD Setup (Optional, +10 minutes)

### Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-vora \
  --display-name="GitHub Actions VORA"

# Grant permissions
for role in run.admin storage.admin artifactregistry.admin iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/$role"
done

# Create key
gcloud iam service-accounts keys create ~/vora-gcp-key.json \
  --iam-account=github-actions-vora@${PROJECT_ID}.iam.gserviceaccount.com

# Display key (copy for GitHub secrets)
cat ~/vora-gcp-key.json
```

- [ ] Service account created
- [ ] Permissions granted
- [ ] Key created and saved

### Configure GitHub Secrets

Go to repository → **Settings** → **Secrets and variables** → **Actions**

Add secrets:
- [ ] `GCP_PROJECT_ID` = your project ID
- [ ] `GCP_SA_KEY` = contents of `vora-gcp-key.json`
- [ ] `GITHUB_TOKEN` = your GitHub PAT (optional, for comments)

### Test CI/CD

```bash
# Make a change
echo "# CI/CD test" >> README.md
git add README.md
git commit -m "test: CI/CD pipeline"
git push origin main
```

- [ ] Push triggers GitHub Actions
- [ ] Build succeeds
- [ ] Deploy succeeds
- [ ] Service updates

## 📊 Post-Deployment

### Monitor Service

```bash
# View logs
gcloud run services logs tail vora-router --region $REGION

# Open in console
open "https://console.cloud.google.com/run/detail/$REGION/vora-router"
```

- [ ] Logs show successful requests
- [ ] No error messages
- [ ] Metrics dashboard accessible

### Performance Check

Expected metrics:
- **Cold start**: < 3 seconds
- **Warm request**: < 500ms
- **Memory usage**: ~100-200 MiB
- **CPU usage**: < 10% during routing

- [ ] Performance meets expectations
- [ ] No errors in last 24h
- [ ] Cost estimate acceptable

## 🔒 Security Hardening (Optional)

### Restrict Access

```bash
# Remove public access
gcloud run services remove-iam-policy-binding vora-router \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker"

# Add GitHub webhook service account
# (See CLOUD_RUN_SETUP.md for full instructions)
```

- [ ] Public access removed (if required)
- [ ] Webhook authentication configured
- [ ] Secrets in Secret Manager (optional)

## 💰 Cost Verification

### Check Costs

```bash
# View billing
open "https://console.cloud.google.com/billing"

# Estimate monthly cost
echo "Estimated monthly cost: < $10 for moderate usage"
```

Expected costs:
- **Idle**: $0 (min-instances=0)
- **Light usage** (< 100 req/day): < $5/month
- **Moderate usage** (1000 req/day): < $10/month

- [ ] Billing dashboard checked
- [ ] Cost estimate acceptable
- [ ] Budget alerts configured (optional)

## ✅ Production Ready Checklist

Core deployment:
- [ ] Service deployed and healthy
- [ ] Health endpoint returns 200
- [ ] Routing endpoint tested
- [ ] GitHub webhook configured
- [ ] End-to-end test successful

Optional enhancements:
- [ ] CI/CD pipeline working
- [ ] Monitoring dashboard reviewed
- [ ] Security hardening applied
- [ ] Cost alerts configured
- [ ] Documentation updated

## 🚀 Next Steps

After deployment:

1. **Create test issues** to verify routing accuracy
2. **Monitor for 24-48 hours** to ensure stability
3. **Review cost metrics** after first week
4. **Scale configuration** based on usage patterns
5. **Set up alerts** for errors/high costs

## 📞 Support

If you encounter issues:

1. Check logs: `gcloud run services logs tail vora-router --region $REGION`
2. Review troubleshooting: See `docs/CLOUD_RUN_SETUP.md`
3. Create issue: github.com/EQDMC-Systems/VORA-Router/issues

---

**Time to deploy**: < 10 minutes
**Time to production-ready**: < 30 minutes
**Monthly cost**: < $10 (typical usage)
