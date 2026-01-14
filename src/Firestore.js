class Firestore {
    constructor(firestoreUrl, accessToken) {
        this.firestoreUrl = firestoreUrl
        this.accessToken = accessToken
    }

    /**
     * Fetches a document from Firestore by document ID
     * @param {string} collection - The name of the collection
     * @param {string} docId - The document ID to fetch
     * @returns {Object|null} The fetched document data or null if not found
     */
    get(collection, docId) {
        try {

            console.log(`Fetching from Firestore: ${collection}/${docId}`);

            // Make HTTP request to Firestore endpoint
            const url = `${this.firestoreUrl}?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(docId)}`;
            const response = UrlFetchApp.fetch(url, {
                method: 'get',
                muteHttpExceptions: true,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
            });

            const statusCode = response.getResponseCode();

            if (statusCode === 200) {
                const responseData = JSON.parse(response.getContentText());

                // Check if response is from Cloud Function (has success and data fields)
                if (responseData.success && responseData.data) {
                    console.log(`Successfully fetched: ${collection}/${docId}`);
                    return responseData.data;
                }

                // Legacy format: Extract fields from Firestore document format
                if (responseData.fields) {
                    const data = this._convertFirestoreFields(responseData.fields);
                    console.log(`Successfully fetched: ${collection}/${docId}`);
                    return data;
                }

                return responseData;
            } else if (statusCode === 404) {
                console.log(`Document not found: ${collection}/${docId}`);
                return null;
            } else {
                const errorBody = response.getContentText();
                console.error(`Firestore fetch failed (${statusCode}): ${errorBody}`);
                throw new Error(`Firestore request failed with status ${statusCode}: ${errorBody}`);
            }

        } catch (error) {
            console.error(`Error fetching document from Firestore: ${error.message}`);
            throw error;
        }
    }

    /**
     * Stores a document to Firestore
     * @param {string} collection - The name of the collection
     * @param {string} docId - The document ID to store
     * @param {Object} data - The data object to store
     * @returns {Object} Response with success status and timestamp
     */
    store(collection, docId, data) {
        try {

            console.log(`Storing to Firestore: ${collection}/${docId}`);

            // Make HTTP request to Firestore endpoint (PUT)
            const response = UrlFetchApp.fetch(this.firestoreUrl, {
                method: 'put',
                muteHttpExceptions: true,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                payload: JSON.stringify({
                    collection: collection,
                    id: docId,
                    data: data
                })
            });

            const statusCode = response.getResponseCode();
            const responseData = JSON.parse(response.getContentText());

            if (statusCode === 200 && responseData.success) {
                console.log(`Successfully stored: ${collection}/${docId}`);
                return responseData;
            } else {
                const errorMessage = responseData.error || responseData.message || 'Unknown error';
                console.error(`Firestore store failed (${statusCode}): ${errorMessage}`);
                throw new Error(`Firestore store failed with status ${statusCode}: ${errorMessage}`);
            }

        } catch (error) {
            console.error(`Error storing document to Firestore: ${error.message}`);
            throw error;
        }
    }

    /**
     * Converts Firestore field format to simple JavaScript object
     * @param {Object} fields - Firestore fields object
     * @returns {Object} Plain JavaScript object
     */
    _convertFirestoreFields(fields) {
        const result = {};

        for (const [key, value] of Object.entries(fields)) {
            // Firestore returns values in format: { stringValue: "...", integerValue: "...", etc. }
            if (value.stringValue !== undefined) {
                result[key] = value.stringValue;
            } else if (value.integerValue !== undefined) {
                result[key] = parseInt(value.integerValue);
            } else if (value.doubleValue !== undefined) {
                result[key] = parseFloat(value.doubleValue);
            } else if (value.booleanValue !== undefined) {
                result[key] = value.booleanValue;
            } else if (value.nullValue !== undefined) {
                result[key] = null;
            } else if (value.timestampValue !== undefined) {
                result[key] = new Date(value.timestampValue);
            } else if (value.arrayValue !== undefined && value.arrayValue.values) {
                result[key] = value.arrayValue.values.map(v => this._convertFirestoreValue(v));
            } else if (value.mapValue !== undefined && value.mapValue.fields) {
                result[key] = this._convertFirestoreFields(value.mapValue.fields);
            }
        }

        return result;
    }

    /**
     * Converts a single Firestore value to JavaScript type
     * @param {Object} value - Firestore value object
     * @returns {*} Converted value
     */
    _convertFirestoreValue(value) {
        if (value.stringValue !== undefined) return value.stringValue;
        if (value.integerValue !== undefined) return parseInt(value.integerValue);
        if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
        if (value.booleanValue !== undefined) return value.booleanValue;
        if (value.nullValue !== undefined) return null;
        if (value.timestampValue !== undefined) return new Date(value.timestampValue);
        if (value.arrayValue !== undefined && value.arrayValue.values) {
            return value.arrayValue.values.map(v => this._convertFirestoreValue(v));
        }
        if (value.mapValue !== undefined && value.mapValue.fields) {
            return this._convertFirestoreFields(value.mapValue.fields);
        }
        return null;
    }
}