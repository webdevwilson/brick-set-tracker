function createTrackerSheets(trackOwned, trackWantToBuy) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const columns = [
        ['Set Number', 'TEXT', 100],
        ['Condition', 'DROPDOWN', 100],
        ['Status', 'DROPDOWN', 120],
        ['Theme', 'TEXT', 150],
        ['Name', 'TEXT', 250],
        ['Pieces', 'NUMBER', 80],
        ['Date Released', 'DATE', 150],
        ['Date Retired', 'DATE', 150],
        ['Retail Price', 'CURRENCY', 100],
        ['Purchase Price', 'CURRENCY', 100],
        ['Current Value', 'CURRENCY', 100],
        ['Last Updated', 'DATE', 120],
    ];

    if (trackOwned) {
        createSheet(spreadsheet, 'Brick Set - Owned', columns);
    }

    if (trackWantToBuy) {
        createSheet(spreadsheet, 'Brick Set - Want to Buy', columns);
    }
}

function createSheet(spreadsheet, sheetName, columns) {
    // Check if sheet already exists
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
        // Sheet exists, ask user if they want to overwrite
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
            'Sheet Already Exists',
            `A sheet named "${sheetName}" already exists. Do you want to keep it?`,
            ui.ButtonSet.YES_NO
        );

        if (response === ui.Button.YES) {
            return; // Keep existing sheet
        } else {
            spreadsheet.deleteSheet(sheet);
        }
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
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');

    // Set column widths
    columns.forEach((column, i) => {
        sheet.setColumnWidth(i + 1, column[2]);
    });

    // Freeze header row
    sheet.setFrozenRows(1);

    // Add filter to header row
    headerRange.createFilter();

    // Create a table area with initial rows (100 rows for data + 1 header)
    const tableRange = sheet.getRange(1, 1, 101, headers.length);

    // Add borders to the table
    tableRange.setBorder(
        true, true, true, true, true, true,
        '#d3d3d3',
        SpreadsheetApp.BorderStyle.SOLID
    );

    // Add alternating row colors (banding)
    const banding = tableRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    banding.setHeaderRowColor('#4CAF50');
    banding.setFirstRowColor('#ffffff');
    banding.setSecondRowColor('#f3f3f3');

    // Apply column-specific formatting based on type
    columns.forEach((column, index) => {
        const colNum = index + 1;
        const dataRange = sheet.getRange(2, colNum, 100, 1);

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

    // Prepopulate first row with example set number
    sheet.getRange(2, 2).setValue('10305'); // Column 2 is Set Number
}

function testCreateInventorySheet() {
    createTrackerSheets(true, false);
}
