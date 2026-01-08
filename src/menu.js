
function onOpen() {
  const trackingSheet = getTrackerSheet()
  SpreadsheetApp.getUi()
      .createMenu('Brick Tracker')
      .addItem(`${trackingSheet == null ? 'Create' : 'Recreate'} Tracking Sheet`, 'setup')
      .addItem('Add Set to Sheet', 'addSet')
      .addItem('Fetch Data for Selected', 'fetchSelected')
      .addSeparator()
      .addItem('Help', 'help')
      .addToUi();
}

function setup() {
  createTrackerSheet()
}

function addSet() {
  const html = HtmlService.createHtmlOutputFromFile('view/dialog-add-set')
      .setWidth(400)
      .setHeight(325);
  UI.modal(html, 'Add Set');
}

function help() {
  const html = HtmlService.createHtmlOutputFromFile('view/dialog-help')
      .setWidth(550)
      .setHeight(550);
  UI.modal(html, 'Brick Tracker Help');
}

function fetchSelected() {
  const trackerSheet = new BrickTrackerSheet(getTrackerSheet())
  let selectedItems = trackerSheet.selected()
  if(selectedItems.length === 0) {
    selectedItems = trackerSheet.all()
  }
  fetchAndUpdate(selectedItems)
}

function addSetToSheet(setNumber, condition, status, purchasePrice, quantity) {
  const sheet = getTrackerSheet()
  if (!sheet) {
    throw new Error('Tracker sheet not found. Please run Setup first.');
  }

  const trackerSheet = new BrickTrackerSheet(sheet)
  const row = trackerSheet.add(
      setNumber,
      condition,
      status,
      purchasePrice,
      quantity,
  )

  // Show toast notification
  UI.toast(
    `Set ${setNumber} added at row ${row}. Fetching details...`,
    'Set Added',
    3
  )

  // Fetch and populate the rest of the data
  fetchAndUpdate(trackerSheet.getItems(setNumber))

  return row;
}

function fetchAndUpdate(items) {
  const trackerSheet = new BrickTrackerSheet(getTrackerSheet())
  let errors = []
  items.forEach((item) => {
    console.log(`Fetching data for ${item.setNumber}`)
    let data = null
    try {
      data = scrapeBricksetFeaturebox(item.setNumber)
      if (data.error) {
        errors.push(item.setNumber)
        return
      }
    } catch (e) {
      errors.push(item.setNumber)
      console.error(e)
      return
    }
    console.log(JSON.stringify(data))
    const update = [
      data.theme || item.theme,
      data.title || item.title,
      data.pieces || item.pieces,
      data.year || item.dateReleased,
      data.retired || item.dateRetired,
      data.retail || item.msrp,
      (item.condition === 'Open' ? data.used : data.new) || item.value,
      new Date(),
    ]
    trackerSheet.updateItems(item.setNumber, update)
  })
  if(errors.length !== 0) {
    UI.toast(
      `Error fetching ${errors.length} set(s): ${errors.join(', ')}`,
      'Fetch Errors',
    )
  }
}