function createTrackerSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const columns = [
        ['Set Number', 'TEXT', 100],
        ['Condition', 'DROPDOWN', 100],
        ['Status', 'DROPDOWN', 120],
        ['Purchase Price', 'CURRENCY', 120],
        ['Quantity', 'NUMBER', 80],
        ['Theme', 'TEXT', 150],
        ['Title', 'TEXT', 250],
        ['Pieces', 'NUMBER', 80],
        ['Released', 'DATE', 100],
        ['Retired', 'DATE', 100],
        ['MSRP', 'CURRENCY', 100],
        ['Value', 'CURRENCY', 100],
        ['Last Updated', 'DATE', 150],
    ];

    // Check if sheet already exists
    let sheet = getTrackerSheet()
    if (sheet) {
        try {
            const ui = SpreadsheetApp.getUi();
            const response = ui.alert(
                'Sheet Already Exists',
                `Brick Tracker sheet already created. Do you want to create a new one?`,
                ui.ButtonSet.YES_NO
            )
            if (response === ui.Button.NO) {
                return
            }
        } catch (e) {
            console.warn(e);
        }
    }

    createSheet(spreadsheet, 'Brick Tracker', columns);

    // Show instructions dialog
    try {
        const html = HtmlService.createHtmlOutputFromFile('view/dialog-setup-complete')
            .setWidth(550)
            .setHeight(450);
        SpreadsheetApp.getUi().showModalDialog(html, 'Setup Complete');
    } catch (error) {
        console.warn('Could not show instructions dialog:', error);
    }
}

function createSheet(spreadsheet, sheetName, columns) {

    // make sure we have a unique name
    let i = 2, defaultSheetName = sheetName
    while(spreadsheet.getSheetByName(sheetName)) {
        sheetName = `${defaultSheetName} ${i}`
        i += 1
    }

    // Create new sheet
    sheet = spreadsheet.insertSheet(sheetName);

    // Extract headers and widths from columns array
    const headers = columns.map(col => col[0]);
    const widths = columns.map(col => col[2]);
    const types = columns.map(col => col[1]);

    // Set headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // Format header row
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#445897');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');

    // Add instruction row with merged cells
    const manualRange = sheet.getRange(2, 1, 1, 5);
    manualRange.merge();
    manualRange.setValue('The values below should be entered manually');
    manualRange.setFontStyle('italic');
    manualRange.setFontColor('#444444');
    manualRange.setBackground('#d8ead3');
    manualRange.setHorizontalAlignment('center');
    manualRange.setFontSize(10);
    manualRange.setBorder(null, null, null, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);

    const fetchedRange = sheet.getRange(2, 6, 1, headers.length - 5);
    fetchedRange.merge();
    fetchedRange.setValue('The values below can be automatically managed');
    fetchedRange.setFontStyle('italic');
    fetchedRange.setFontColor('#444444');
    fetchedRange.setBackground('#f5cccd');
    fetchedRange.setHorizontalAlignment('center');
    fetchedRange.setFontSize(10);

    // Set column widths
    columns.forEach((column, i) => {
        sheet.setColumnWidth(i + 1, column[2]);
    });

    // Freeze header and instruction rows
    sheet.setFrozenRows(2);

    // Add filter to header row
    headerRange.createFilter();

    // Create a table area with initial rows (100 rows for data + 1 header + 1 instruction)
    const tableRange = sheet.getRange(1, 1, 102, headers.length);

    // Add borders to the table
    tableRange.setBorder(
        true, true, true, true, true, true,
        '#d3d3d3',
        SpreadsheetApp.BorderStyle.SOLID
    );

    // Add alternating row colors (banding)
    tableRange.applyRowBanding(SpreadsheetApp.BandingTheme.INDIGO);

    // Apply column-specific formatting based on type
    columns.forEach((column, index) => {
        const colNum = index + 1;
        const dataRange = sheet.getRange(3, colNum, 100, 1);

        switch(column[1]) {
            case 'BOOLEAN':
                // Add checkboxes
                dataRange.insertCheckboxes();
                break;

            case 'DROPDOWN':
                // Add data validation based on column name
                let validationList = [];
                if (column[0] === 'Condition') {
                    validationList = ['Sealed', 'Open'];
                } else if (column[0] === 'Status') {
                    validationList = ['In Collection', 'Ordered', 'Wishlist', 'Sold'];
                }

                if (validationList.length > 0) {
                    const rule = SpreadsheetApp.newDataValidation()
                        .requireValueInList(validationList, true)
                        .setAllowInvalid(false)
                        .build();
                    dataRange.setDataValidation(rule);
                }
                break;

            case 'CURRENCY':
                dataRange.setNumberFormat('$#,##0.00');
                break;

            case 'DATE':
                if (column[0] === 'Last Updated') {
                    dataRange.setNumberFormat('MM/dd/yyyy hh:mm:ss');
                } else {
                    dataRange.setNumberFormat('MM/dd/yyyy');
                }
                break;

            case 'NUMBER':
                break;

            case 'TEXT':
                break;
        }
    });

    // Prepopulate first data row with example values
    sheet.getRange('A3:E3').setValues([['10305', 'Sealed', 'Wishlist', '0', '1']]);

    // Set tab color to match header theme
    sheet.setTabColor('#445897');

    // Store the sheet ID in document properties
    const sheetId = sheet.getSheetId();
    PropertiesService.getDocumentProperties().setProperty('BRICK_TRACKER_SHEET_ID', sheetId.toString());
    console.log(`Stored sheet ID: ${sheetId}`);
}

function getTrackerSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetId = PropertiesService.getDocumentProperties().getProperty('BRICK_TRACKER_SHEET_ID');

    if (sheetId) {
        // Try to get sheet by ID
        const sheets = spreadsheet.getSheets();
        for (let sheet of sheets) {
            if (sheet.getSheetId().toString() === sheetId) {
                return sheet;
            }
        }
    }

    // Sheet not found - prompt user to create it
    try {
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
            'Tracker Sheet Not Found',
            'The Brick Tracker sheet has not been set up yet. Would you like to create it now?',
            ui.ButtonSet.YES_NO
        );

        if (response === ui.Button.YES) {
            createTrackerSheet();
            // Retrieve the newly created sheet
            const newSheetId = PropertiesService.getDocumentProperties().getProperty('BRICK_TRACKER_SHEET_ID');
            const sheets = spreadsheet.getSheets();
            for (let sheet of sheets) {
                if (sheet.getSheetId().toString() === newSheetId) {
                    return sheet;
                }
            }
        }
    } catch (e) {
        showError(e)
    }

    return null;
}