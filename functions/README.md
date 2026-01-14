# Brick Sheet Cloud Functions API

Google Cloud Functions API endpoint for storing and retrieving LEGO set data from Firestore.

- **GET**: Retrieve data from Firestore
- **PUT**: Store data to Firestore

## Setup

### Prerequisites

1. Google Cloud SDK installed (`gcloud` command)
2. Firebase/Firestore project set up
3. Node.js 20+ installed

### Installation

```bash
cd functions
npm install
```

## Deployment

### Configure Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
 
gcloud services enable firestore.googleapis.com

# Grant Firestore permissions to Cloud Functions service account
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"
```

**Important:** If you get `PERMISSION_DENIED` errors, see [SETUP.md](./SETUP.md) for detailed permission configuration.

### Deploy the Function

```bash
# From the functions directory
npm run deploy

# Or manually:
gcloud functions deploy fetchLegoSet \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1
```

After deployment, you'll receive a URL like:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/fetchLegoSet
```

## API Usage

### Endpoint

```
GET/PUT https://REGION-PROJECT_ID.cloudfunctions.net/fetchLegoSet
```

Supports both GET (query parameters) and PUT (request body) methods.

### Authentication

**Required:** Bearer token (Google OAuth token from Apps Script)

The API validates that requests come from authenticated Google users by verifying the OAuth token.

### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | Bearer token (use `ScriptApp.getOAuthToken()` in Apps Script) |
| Content-Type | string | No | `application/json` (required for PUT requests) |

### Parameters

**GET Request (query parameters):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| collection | string | Yes | Firestore collection name |
| id | string | Yes | Document ID to retrieve |

**PUT Request (request body):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| collection | string | Yes | Firestore collection name |
| id | string | Yes | Document ID to store |
| data | object | Yes | Data object to store in Firestore |

### Examples

**GET request (query parameters):**
```bash
TOKEN="your-google-oauth-token"
curl -H "Authorization: Bearer $TOKEN" \
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/fetchLegoSet?collection=lego-sets&id=10305"
```

**PUT request (store data):**
```bash
TOKEN="your-google-oauth-token"
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "lego-sets",
    "id": "10305",
    "data": {
      "theme": "Creator Expert",
      "title": "Lion Knights Castle",
      "pieces": 4514,
      "retail": "399.99",
      "year": "2023"
    }
  }' \
  "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/fetchLegoSet"
```

**Response (GET Success):**
```json
{
  "success": true,
  "method": "GET",
  "collection": "lego-sets",
  "id": "10305",
  "data": {
    "theme": "Creator Expert",
    "title": "Lion Knights Castle",
    "pieces": 4514,
    "retail": "399.99",
    "year": "2023",
    "_lastUpdated": "2026-01-14T12:00:00.000Z",
    "_createdAt": "2026-01-14T12:00:00.000Z"
  }
}
```

**Response (PUT Success):**
```json
{
  "success": true,
  "method": "PUT",
  "collection": "lego-sets",
  "id": "10305",
  "message": "Data stored successfully",
  "timestamp": "2026-01-14T12:00:00.000Z"
}
```

**Response (Not Found):**
```json
{
  "error": "Document not found",
  "collection": "lego-sets",
  "id": "99999"
}
```

**Response (Missing Parameters):**
```json
{
  "error": "Missing required parameter: collection"
}
```

**Response (Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header. Expected: Bearer <token>"
}
```

**Response (Invalid Token):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

## Local Testing

To test the function locally using the Functions Framework:

```bash
npm start
```

Then access it at:
```
http://localhost:8080?collection=lego-sets&id=10305
```

## Security Considerations

The function implements Google OAuth bearer token authentication to ensure only authorized requests are processed.

### Current Security Features

1. **OAuth Token Validation:** All requests must include a valid Google OAuth bearer token in the `Authorization` header
2. **Token Verification:** Tokens are verified using Google's OAuth2 library to ensure they're valid and not expired
3. **Google Domain Check:** Additional validation to ensure tokens are from Google accounts

### Additional Security Options

1. **CORS Restrictions:** Currently set to `Access-Control-Allow-Origin: *`. For production, restrict to specific domains:
   ```javascript
   const allowedOrigins = ['https://script.google.com', 'https://yourdomain.com'];
   const origin = req.headers.origin;
   if (allowedOrigins.includes(origin)) {
     res.set('Access-Control-Allow-Origin', origin);
   }
   ```

2. **Specific Email Whitelist:** Restrict to specific Google accounts:
   ```javascript
   const allowedEmails = ['user1@gmail.com', 'user2@gmail.com'];
   if (!allowedEmails.includes(payload.email)) {
     res.status(403).json({ error: 'Forbidden' });
     return;
   }
   ```

3. **Rate Limiting:** Add rate limiting to prevent abuse:
   ```bash
   gcloud functions deploy fetchLegoSet \
     --runtime nodejs20 \
     --trigger-http \
     --region us-central1 \
     --max-instances 10
   ```

## Environment Variables

To set environment variables for the Cloud Function:

```bash
gcloud functions deploy fetchLegoSet \
  --runtime nodejs20 \
  --trigger-http \
  --region us-central1 \
  --set-env-vars API_KEY=your-secret-key
```

## Monitoring

View function logs:
```bash
gcloud functions logs read fetchLegoSet --region us-central1
```

View function details:
```bash
gcloud functions describe fetchLegoSet --region us-central1
```

## Cost Optimization

- Free tier: 2M invocations/month
- To reduce costs, consider adding caching or rate limiting
- Set timeout to minimum required (default: 60s)

```bash
gcloud functions deploy fetchLegoSet \
  --timeout 10s \
  --max-instances 10
```

## Integration with Apps Script

To call this API from your Google Apps Script with bearer token authentication:

```javascript
/**
 * Fetches data from Cloud Function with OAuth authentication (GET method)
 * @param {string} collection - The Firestore collection name
 * @param {string} id - The document ID to fetch
 * @returns {Object} The document data
 */
function fetchFromCloudFunctionGET(collection, id) {
  // Get OAuth token from Apps Script runtime
  const token = ScriptApp.getOAuthToken();

  const url = `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/fetchLegoSet?collection=${collection}&id=${id}`;

  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const data = JSON.parse(response.getContentText());

  if (statusCode === 200 && data.success) {
    return data.data;
  } else {
    throw new Error(data.error || data.message || 'Request failed');
  }
}

/**
 * Stores data to Cloud Function with OAuth authentication (PUT method)
 * @param {string} collection - The Firestore collection name
 * @param {string} id - The document ID to store
 * @param {Object} data - The data object to store
 * @returns {Object} Response with success status and timestamp
 */
function storeToCloudFunction(collection, id, data) {
  // Get OAuth token from Apps Script runtime
  const token = ScriptApp.getOAuthToken();

  const url = `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/fetchLegoSet`;

  const options = {
    method: 'put',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      collection: collection,
      id: id,
      data: data
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseData = JSON.parse(response.getContentText());

  if (statusCode === 200 && responseData.success) {
    return responseData;
  } else {
    throw new Error(responseData.error || responseData.message || 'Request failed');
  }
}

// Example usage:
function testCloudFunction() {
  try {
    // Store data using PUT method
    const dataToStore = {
      theme: 'Creator Expert',
      title: 'Lion Knights Castle',
      pieces: 4514,
      retail: '399.99',
      year: '2023'
    };

    const storeResult = storeToCloudFunction('lego-sets', '10305', dataToStore);
    console.log('Store result:', storeResult);

    // Retrieve data using GET method
    const fetchedData = fetchFromCloudFunctionGET('lego-sets', '10305');
    console.log('Fetched data:', fetchedData);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Required OAuth Scopes

Add this to your `appsscript.json` to ensure proper OAuth scopes:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```
