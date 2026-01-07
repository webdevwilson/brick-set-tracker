class RowWrapper {
    constructor(rowIndex, rowValues) {
        this._rowIdx = rowIndex
        this._d = rowValues
    }
    get setNumber() { return this._v(0) }
    get condition() { return this._v(1) }
    get status() { return this._v(2) }
    get purchasePrice() { return this._v(3) }
    get quantity() { return this._v(4) }
    get theme() { return this._v(5) }
    get title() { return this._v(6) }
    get pieces() { return this._v(7) }
    get dateReleased() { return this._v(8) }
    get dateRetired() { return this._v(9) }
    get msrp() { return this._v(10) }
    get value() { return this._v(11) }
    get lastUpdated() { return this._v(12) }
    get rowIndex() { return this._rowIdx }

    _v(idx) {
        return this._d.length >= idx + 1 ? this._d[idx] : null
    }
    toArray() { return this._d }
}

class BrickTrackerSheet {
    constructor(sheet) {
        this._sheet = sheet
    }

    isValidLegoSetNumber(setNumber) {
        const regex = /^\d{1,7}(-\d{1,2})?$/
        return regex.test(setNumber)
    }

    updateItems(setNumber, updateValues) {
        this.getItems(setNumber)
            .forEach((item) => {
                console.log(`Updating row ${item.rowIndex} with ${JSON.stringify(item)}`)
                this._sheet.getRange(`F${item.rowIndex}:M${item.rowIndex}`).setValues([updateValues])
            })
    }

    getItems(setNumber) {
        const items = this.all()
            .filter((item) => String(item.setNumber) === String(setNumber))
        console.log(`getItems(${setNumber}) returned ${items.length} items`)
        return items
    }

    add(setNumber, condition, status, purchasePrice, quantity) {
        // Find the first empty row (skip header row 1 and instruction row 2)
        let row = 3;
        while (this._sheet.getRange(row, 1).getValue() !== '') {
            row++;
        }

        // Add the manual entry data
        this._sheet.getRange(`A${row}:E${row}`).setValues([[
            setNumber,
            condition,
            status,
            purchasePrice,
            quantity,
        ]])

        return row;
    }

    selected() {
        const selection = this._sheet.getActiveRangeList()
        if (!selection) return []
        const seen = new Set()
        const selected = []
        selection.getRanges().forEach(range => {
            const startRow = range.getRow()
            const numRows = range.getNumRows()
            for (let i = 0; i < numRows; i++) {
                const rowIndex = startRow + i
                if (seen.has(rowIndex)) continue
                seen.add(rowIndex)
                const rowValues = this._sheet.getRange(rowIndex, 1, 1, 13).getValues()[0]
                selected.push(new RowWrapper(rowIndex, rowValues))
            }
        })
        console.log(`selected() returned ${selected.length} items}`)
        return selected
    }

    all() {
        const data = this._sheet.getDataRange().getValues();
        const result = data
            .map((row, idx) => ({ row, rowIndex: idx + 1 }))
            .filter(({ row }) => this.isValidLegoSetNumber(row[0]))
            .map(({ row, rowIndex }) => new RowWrapper(rowIndex, row))
        console.log(`all() returned ${result.length} items`)
        return result
    }
}