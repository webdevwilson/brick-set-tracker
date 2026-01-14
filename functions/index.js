const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');

const firestore = new Firestore({
  databaseId: 'bricksheet-lego-data'
})

// Log initialization
console.log('Firestore initialized with database:', firestore.databaseId || '(default)');

// Initialize OAuth2 client for token verification
const oauth2Client = new OAuth2Client()

/**
 * Validates a Google OAuth bearer token
 * @param {string} token - The bearer token to validate
 * @returns {Promise<Object>} The token payload if valid
 * @throws {Error} If token is invalid
 */
async function validateGoogleToken(token) {
  try {
    // Verify the token using Google's OAuth2 verification
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
    });

    const payload = ticket.getPayload();

    // Additional validation: ensure it's from Google's domain
    const emailDomain = payload.email ? payload.email.split('@')[1] : null;
    const isGoogleDomain = emailDomain === 'gmail.com' ||
                          emailDomain === 'google.com' ||
                          payload.hd === 'google.com';

    console.log('Token validated for:', payload.email || payload.sub);

    return payload;
  } catch (error) {
    console.error('Token validation failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extracts bearer token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} The extracted token or null
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    console.warn('Missing Authorization header')
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * HTTP Cloud Function to store or retrieve LEGO set data from Firestore
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * Headers:
 *   - Authorization: Bearer <token> (required)
 *
 * GET Request - Retrieve data:
 *   Query parameters:
 *     - collection: The Firestore collection name (required)
 *     - id: The document ID to fetch (required)
 *   Example: GET /fetchLegoSet?collection=lego-sets&id=10305
 *
 * PUT Request - Store data:
 *   Request body:
 *     - collection: The Firestore collection name (required)
 *     - id: The document ID to store (required)
 *     - data: The data object to store (required)
 *   Example: PUT /fetchLegoSet with body:
 *     {
 *       "collection": "lego-sets",
 *       "id": "10305",
 *       "data": { "theme": "Creator Expert", "pieces": 4514, ... }
 *     }
 */
functions.http('fetchLegoSet', async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Extract and validate bearer token
    const token = extractBearerToken(req);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      });
      return;
    }

    // Validate the Google OAuth token
    try {
      await validateGoogleToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
      return;
    }

    // Handle based on request method
    if (req.method === 'GET') {
      // GET: Retrieve data from Firestore
      await handleGet(req, res);
    } else if (req.method === 'PUT') {
      // PUT: Store data to Firestore
      await handlePut(req, res);
    } else {
      res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET and PUT methods are supported'
      });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Handles GET requests - retrieves data from Firestore
 */
async function handleGet(req, res) {
  const collection = req.query.collection;
  const id = req.query.id;

  console.log(`GET request params - collection: "${collection}", id: "${id}"`);

  // Validate parameters - check for empty strings too
  if (!collection || collection.trim() === '') {
    res.status(400).json({
      error: 'Missing required parameter: collection',
      received: collection
    });
    return;
  }

  if (!id || id.trim() === '') {
    res.status(400).json({
      error: 'Missing required parameter: id',
      received: id
    });
    return;
  }

  console.log(`GET: Fetching document: ${collection}/${id}`);

  try {
    // Fetch document from Firestore
    const docRef = firestore.collection(collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({
        error: 'Document not found',
        collection,
        id
      });
      return;
    }

    // Return the document data
    const data = doc.data();
    res.status(200).json({
      success: true,
      method: 'GET',
      collection,
      id,
      data
    });
  } catch (error) {
    console.error(`Error fetching document ${collection}/${id}:`, error);
    res.status(500).json({
      error: 'Failed to fetch document',
      message: error.message,
      collection,
      id
    });
  }
}

/**
 * Handles PUT requests - stores data to Firestore
 */
async function handlePut(req, res) {
  const collection = req.body?.collection;
  const id = req.body?.id;
  const data = req.body?.data;

  console.log(`PUT request body - collection: "${collection}", id: "${id}", data:`, data);

  // Validate parameters - check for empty strings too
  if (!collection || collection.trim() === '') {
    res.status(400).json({
      error: 'Missing required parameter: collection',
      received: collection
    });
    return;
  }

  if (!id || id.trim() === '') {
    res.status(400).json({
      error: 'Missing required parameter: id',
      received: id
    });
    return;
  }

  if (!data || typeof data !== 'object') {
    res.status(400).json({
      error: 'Missing required parameter: data',
      message: 'data must be a valid object'
    });
    return;
  }

  console.log(`PUT: Storing document: ${collection}/${id}`);

  try {
    // Store document to Firestore (set with merge to update existing or create new)
    const docRef = firestore.collection(collection).doc(id);

    // Add metadata
    const timestamp = new Date().toISOString();
    const dataWithMetadata = {
      ...data,
      _lastUpdated: timestamp,
    };

    await docRef.set(dataWithMetadata, { merge: true });

    console.log(`Successfully stored: ${collection}/${id}`);

    // Return success response
    res.status(200).json({
      success: true,
      method: 'PUT',
      collection,
      id,
      message: 'Data stored successfully',
      timestamp
    });
  } catch (error) {
    console.error(`Error storing document ${collection}/${id}:`, error);
    res.status(500).json({
      error: 'Failed to store document',
      message: error.message,
      collection,
      id
    });
  }
}
