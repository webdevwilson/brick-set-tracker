function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Brick Tracker')
    .addItem('Setup', 'setup')
    .addItem('Fetch Data', 'fetchSelected')
    .addSeparator()
    .addItem('Help', 'help')
    .addToUi();
}

function setup() {
  createTrackerSheet()
}

function help() {

}

function fetchSelected() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const selection = sheet.getActiveRange();
  for (let i = 0; i < selection.getNumRows(); i++) {
    const row = selection.getRow() + i;
    const setNumber = sheet.getRange(row, 1).getValue();
    console.log(`Fetching data for ${setNumber}`)
    if (setNumber) {
      populateRow(sheet, row, setNumber);
    }
  }
}

function populateRow(sheet, row, setNumber) {
  let data = scrapeBricksetFeaturebox(setNumber);
  if (data.error) return;
  const condition = sheet.getRange(row, 2).getValue()
  const r = sheet.getRange(`E${row}:L${row}`)
  const curr = r.getValues()[0]
  const update = [
    data.theme || curr[0],
    data.title || curr[1],
    data.pieces || curr[2],
    data.year || curr[3],
    data.retired || curr[4],
    data.retail || curr[5],
    (condition === 'Used' ? data.used : data.new) || curr[6],
    new Date(),
  ]
  console.log(`data: ${JSON.stringify(data)}`)
  console.log(`curr: ${curr}`)
  console.log(`upda: ${update}`)
  r.setValues([update]);
}