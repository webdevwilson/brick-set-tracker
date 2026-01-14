# Firestore Setup and Troubleshooting

## Common Errors

### Error: "Value for argument 'documentPath' is not a valid resource path"

This error occurs when:
1. The collection or document ID is empty/undefined
2. The custom Firestore database doesn't exist

**Solutions:**

1. **Verify the database exists:**
   ```bash
   # List all Firestore databases in your project
   gcloud firestore databases list --project=primal-fulcrum-483417-s4
   ```

2. **If the custom database doesn't exist, create it:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Firestore Database
   - Click "Create database"
   - Name it `bricksheet-lego-data`
   - Choose location and mode (production/test)

3. **Or use the default database:**

   Edit `functions/index.js` and change:
   ```javascript
   // Remove the databaseId to use default database
   const firestore = new Firestore();
   ```

4. **Check your request parameters:**
   - Ensure `collection` and `id` are not empty
   - View Cloud Function logs to see what values are being received:
   ```bash
   gcloud functions logs read fetchLegoSet --region=us-central1 --limit=50
   ```

### Error: 7 PERMISSION_DENIED: Missing or insufficient permissions

This error occurs when the Cloud Function's service account doesn't have permission to read from Firestore.

## Solution

### Option 1: Grant IAM Permissions (Recommended)

Grant the Cloud Functions service account permission to access Firestore:

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# The default Cloud Functions service account
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant Firestore User role (read/write access)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.user"

# Or grant Cloud Datastore User role (alternative)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudDatastore.user"
```

### Option 2: Update Firestore Security Rules

If you want to keep IAM permissions restricted, update your Firestore security rules to allow reads:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Firestore Database > Rules
4. Update the rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow reads from authenticated requests
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if false;  // Adjust as needed
    }
  }
}
```

### Option 3: Use a Custom Service Account

Create a dedicated service account with specific permissions:

```bash
# Create service account
gcloud iam service-accounts create firestore-reader \
  --display-name="Firestore Reader for Cloud Functions"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:firestore-reader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Deploy function with this service account
gcloud functions deploy fetchLegoSet \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --service-account="firestore-reader@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Verify Permissions

After granting permissions, redeploy the function:

```bash
cd functions
npm run deploy
```

## Test the Function

```bash
# Get your function URL
FUNCTION_URL=$(gcloud functions describe fetchLegoSet --region=us-central1 --format='value(httpsTrigger.url)')

# Test with a valid token
TOKEN=$(gcloud auth print-identity-token)

curl -H "Authorization: Bearer $TOKEN" \
  "${FUNCTION_URL}?collection=lego-sets&id=10305"
```

## Troubleshooting

### Check current IAM permissions
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:${PROJECT_ID}@appspot.gserviceaccount.com"
```

### View function logs
```bash
gcloud functions logs read fetchLegoSet --region=us-central1 --limit=50
```

### Check Firestore rules
```bash
gcloud firestore databases list
```

## Important Notes

- If using a custom Firestore database (like `bricksheet-lego-data`), ensure it exists and the service account has access
- Changes to IAM permissions can take a few minutes to propagate
- The default database is `(default)`, custom databases need to be created separately
- Security rules apply to client SDKs, but IAM permissions apply to server-side access
