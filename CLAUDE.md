# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script project for tracking LEGO brick sets in Google Sheets. It scrapes data from Brickset.com and provides a custom menu interface for managing set collections.

## Development Commands

**Deploy to Google Apps Script:**
```bash
npm run deploy
```

This runs `clasp push` from the `src/` directory to deploy all files to the Google Apps Script project.

**Run Tests:**
Tests are written as standalone functions in `src/tests/`. Execute them directly in the Apps Script editor at https://script.google.com or call them from the script editor's execution interface.

## Architecture

### Core Components

**brickset.js**: Web scraping module
- `scrapeBricksetFeaturebox(id)`: Main scraper that fetches LEGO set data from Brickset URLs
- Returns parsed data: retail price, current value (new/used), pieces, theme, title, year, retirement date
- Uses regex-based HTML parsing to extract dt/dd pairs from the featurebox section
- `parseDateRange()`: Converts Brickset's date format (e.g., "01 Aug 20 - 31 Dec 24") to MM/DD/YYYY

**menu.js**: Google Sheets UI integration
- `onOpen()`: Creates custom "Brick Tracker" menu when spreadsheet opens
- `setup()`: Shows modal dialog for initial configuration
- `fetchSelected()`: Main action that populates data for selected rows
- `populateRow()`: Updates a single row with scraped data, preserving existing values if fetch fails

**sheet-management.js**: Sheet creation and formatting
- `createTrackerSheets(trackOwned, trackWantToBuy)`: Entry point for setup wizard
- `createSheet()`: Creates formatted sheets with proper column types, validation, and styling
- Column structure:
  - Manual entry: Set Number, Condition (dropdown), Status (dropdown), Purchase Price
  - Auto-fetched: Theme, Name, Pieces, Date Released, Date Retired, Retail Price, Value, Last Updated
- Uses data validation for dropdowns (Condition: Sealed/Open, Status: In Collection/Ordered/Wishlist/Sold)
- Applies formatting: frozen headers, filters, banding, borders

**view/**: HTML dialog templates
- `dialog-setup-options.html`: Initial setup dialog for choosing which sheets to create
- `dialog-setup-complete.html`: Post-setup instructions

### Data Flow

1. User enters LEGO set number (e.g., "10305") in column A
2. User selects row(s) and clicks "Brick Tracker > Fetch Data"
3. `fetchSelected()` calls `populateRow()` for each selected row
4. `populateRow()` calls `scrapeBricksetFeaturebox()` with the set number
5. Scraper constructs URL `https://brickset.com/sets/{id}-1` and parses HTML
6. Scraped data populates columns E-K, with column K (Value) using "New" or "Used" based on Condition column (B)
7. Last Updated timestamp added to column L

### Google Apps Script Configuration

**Project ID**: 1Huyet-vdhQLAOXLhxgde9I_3RAW7SQgUpksqx8E4qsl6vanEy2411FXm

**Advanced Services**: Google Sheets API v4 is enabled

**Time Zone**: America/Chicago

**Runtime**: V8

## Important Notes

- All source files are in `src/` directory
- The scraper uses `UrlFetchApp` to make HTTP requests
- HTML parsing is done with regex (not a proper DOM parser) due to Apps Script limitations
- The condition value in column B determines whether "New" or "Used" pricing is fetched
- Existing cell values are preserved if scraping fails or returns null