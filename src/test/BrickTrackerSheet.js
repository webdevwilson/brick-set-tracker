function test_BrickTrackerSheet_all() {
    const trackerSheet = new BrickTrackerSheet(getTrackerSheet())
    const all = trackerSheet.all()
    console.log(all.length)
}

function test_BrickTrackerSheet_selected() {
    const trackerSheet = new BrickTrackerSheet(getTrackerSheet())
    const selected = trackerSheet.selected()
    console.log(selected.length)
}

function test_BrickTrackerSheet_getItems() {
    const trackerSheet = new BrickTrackerSheet(getTrackerSheet())
    const selected = trackerSheet.getItems('')
    console.log(selected.length)
}
