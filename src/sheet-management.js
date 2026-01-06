function createTrackerSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const columns = [
        ['Set Number', 'TEXT', 100],
        ['Condition', 'DROPDOWN', 100],
        ['Status', 'DROPDOWN', 120],
        ['Purchase Price', 'CURRENCY', 120],
        ['Theme', 'TEXT', 150],
        ['Name', 'TEXT', 250],
        ['Pieces', 'NUMBER', 80],
        ['Released', 'DATE', 100],
        ['Retired', 'DATE', 100],
        ['MSRP', 'CURRENCY', 100],
        ['Value', 'CURRENCY', 100],
        ['Last Updated', 'DATE', 120],
    ];

    createSheet(spreadsheet, 'Brick Tracker - Sets', columns);

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
    // Check if sheet already exists
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
        // Try to ask user if they want to overwrite (only works when called from UI context)
        try {
            const ui = SpreadsheetApp.getUi();
            const response = ui.alert(
                'Sheet Already Exists',
                `A sheet named "${sheetName}" already exists. Do you want to replace it?`,
                ui.ButtonSet.YES_NO
            );

            if (response === ui.Button.YES) {
                spreadsheet.deleteSheet(sheet);
            } else {
                return; // Keep existing sheet
            }
        } catch (e) {
            console.warn(e);
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
    headerRange.setBackground('#445897');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');

    // Add instruction row with merged cells
    // First section: "Enter manually" for columns 1-4
    const manualRange = sheet.getRange(2, 1, 1, 4);
    manualRange.merge();
    manualRange.setValue('Enter manually');
    manualRange.setFontStyle('italic');
    manualRange.setFontColor('#444444');
    manualRange.setBackground('#ccccce');
    manualRange.setHorizontalAlignment('center');
    manualRange.setFontSize(9);
    manualRange.setBorder(null, null, null, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);

    // Second section: "Will be fetched" for columns 5-end
    const fetchedRange = sheet.getRange(2, 5, 1, headers.length - 4);
    fetchedRange.merge();
    fetchedRange.setValue('Will be fetched');
    fetchedRange.setFontStyle('italic');
    fetchedRange.setFontColor('#444444');
    fetchedRange.setBackground('#ccccce');
    fetchedRange.setHorizontalAlignment('center');
    fetchedRange.setFontSize(9);

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
    sheet.getRange('A3:D3').setValues([['10305', 'Sealed', 'Wishlist', '0']]); // Row 3, Column 1 is Set Number
}

function testCreateInventorySheet() {
    createTrackerSheets(true, false);
}
