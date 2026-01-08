/**
 * Scrapes key-value pairs from dt/dd elements in the featurebox section of a Brickset page
 * @param {string} url - The Brickset URL to scrape (defaults to 71374-1)
 * @returns {Object} An object containing the scraped key-value pairs
 */
function scrapeBricksetFeaturebox(id) {
  // Only append -1 if the set number doesn't already contain a hyphen
  const setId = id.includes('-') ? id : `${id}-1`;
  const url = `https://brickset.com/sets/${setId}`;
  console.log(`Fetching ${url}`)
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(response)
    
    const html = response.getContentText();
    const result = {};
    
    // Find the featurebox section - look for section with class containing "featurebox"
    // or the details section which contains the dl with dt/dd pairs
    const featureboxMatch = html.match(/<section[^>]*class="[^"]*featurebox[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
    
    // If no featurebox section found, try to find the dl directly in the details area
    let sectionHtml = featureboxMatch ? featureboxMatch[1] : html;
    
    // Also try matching the details div/section which contains the definition list
    if (!featureboxMatch) {
      const detailsMatch = html.match(/<section[^>]*class="[^"]*details[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
                          html.match(/<div[^>]*class="[^"]*featurebox[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (detailsMatch) {
        sectionHtml = detailsMatch[1];
      }
    }
    
    // Extract all dt/dd pairs using regex
    // Pattern: find dt followed by dd (accounting for whitespace and newlines)
    const dtPattern = /<dt[^>]*>([\s\S]*?)<\/dt>/gi;
    const ddPattern = /<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    
    const dtMatches = sectionHtml.match(dtPattern) || [];
    const ddMatches = sectionHtml.match(ddPattern) || [];
    
    // Process each dt/dd pair
    const minLength = Math.min(dtMatches.length, ddMatches.length);
    
    for (let i = 0; i < minLength; i++) {
      // Clean up the dt (key)
      let key = dtMatches[i]
        .replace(/<dt[^>]*>/i, '')
        .replace(/<\/dt>/i, '')
        .replace(/<[^>]+>/g, '') // Remove any nested HTML tags
        .trim();
      
      // Clean up the dd (value)
      let value = ddMatches[i]
        .replace(/<dd[^>]*>/i, '')
        .replace(/<\/dd>/i, '')
        .replace(/<br\s*\/?>/gi, ' | ') // Replace br tags with separator
        .replace(/<[^>]+>/g, '') // Remove any nested HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Decode HTML entities
      key = decodeHtmlEntities(key);
      value = decodeHtmlEntities(value);
      
      if (key) {
        result[key] = value;
      }
    }
    return parseFields(result);
    
  } catch (error) {
    Logger.log('Error scraping page: ' + error.message);
    return { error: error.message };
  }
}

/**
 * Get the values we care about
 */
function parseFields(data) {
  const values = {}
  if(data['RRP'])
    values.retail = data['RRP'].split('/')[1].substring(1)
  
  if (data['Current value']) {
    const valueString = data['Current value']
    const newMatch = valueString.match(/New:\s*~?\$?([\d,]+(?:\.\d+)?)/i);
    if (newMatch) {
      values.new = parseFloat(newMatch[1].replace(/,/g, ''));
    }
    const usedMatch = valueString.match(/Used:\s*~?\$?([\d,]+(?:\.\d+)?)/i);
    if (usedMatch) {
      values.used = parseFloat(usedMatch[1].replace(/,/g, ''));
    }  
  }
  values.pieces = data['Pieces']
  values.theme = data['Theme']
  values.title = data['Name']
  values.year = data['Year released']
  const dateRange = parseDateRange(data['Launch/exit'])
  if(dateRange.end)
    values.retired = dateRange.end
  return values;
}

/**
 * Decodes common HTML entities
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&apos;': "'",
    '✭': '★'
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  
  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
}

/**
 * Parses a date range string like "01 Aug 20 - 31 Dec 24" into two formatted date strings
 * @param {string} dateRangeString - The date range string to parse
 * @returns {Object} Object with startDate and endDate as formatted strings (or null if not found/TBA)
 */
function parseDateRange(dateRangeString) {
  const result = {
    startDate: null,
    endDate: null
  };
  
  if (!dateRangeString) return result;
  
  const months = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  
  // Split on " - " to get start and end dates
  const parts = dateRangeString.split(/\s*-\s*/);
  
  // Pattern: DD Mon YY or DD Mon YYYY
  const datePattern = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/;
  
  // Pattern to detect TBA/TBD placeholders
  const tbaPattern = /t\.?b\.?[ad]|to\s*be\s*(announced|determined)/i;
  
  function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return month + '/' + day + '/' + year;
  }
  
  function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Check if it's a TBA/TBD placeholder
    if (tbaPattern.test(dateStr)) {
      return null;
    }
    
    const match = dateStr.match(datePattern);
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = months[match[2].toLowerCase()];
    let year = parseInt(match[3], 10);
    
    // Convert 2-digit year to 4-digit (assumes 20xx for years 00-99)
    if (year < 100) {
      year += 2000;
    }
    
    if (month === undefined) return null;
    
    const date = new Date(year, month, day);
    return formatDate(date);
  }
  
  if (parts[0]) {
    result.start = parseDate(parts[0]);
  }
  
  if (parts[1]) {
    result.end = parseDate(parts[1]);
  }
  
  return result;
}

// Test it
function testParseDateRange() {
  const testCases = [
    "01 Aug 20 - 31 Dec 24",
    "07 Aug 25 - {t.b.a}",
    "15 Jan 2019 - TBA",
    "1 Mar 21 - {tbd}",
    ""
  ];
  
  testCases.forEach(test => {
    const result = parseDateRange(test);
    Logger.log('"' + test + '" => Start: ' + result.startDate + ', End: ' + result.endDate);
  });
}

/**
 * Test function to run the scraper and log results
 */
function testScraper() {
  const data = scrapeBricksetFeaturebox('10260');
  
  Logger.log('=== Scraped Data ===');
  for (const [key, value] of Object.entries(data)) {
    Logger.log(key + ': ' + value);
  }
  
  return data;
}

/**
 * Returns scraped data as a 2D array for use in a spreadsheet
 * @param {string} url - The Brickset URL to scrape
 * @returns {Array} 2D array with [key, value] pairs
 */
function scrapeBricksetToArray(url) {
  const data = scrapeBricksetFeaturebox(url);
  const result = [];
  
  for (const [key, value] of Object.entries(data)) {
    result.push([key, value]);
  }
  
  return result;
}