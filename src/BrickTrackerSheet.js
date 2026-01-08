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

    get topRow() {
        // Start at row 3 and search downward
        let row = 1
        const maxRows = this._sheet.getLastRow()

        // If sheet is empty (no data rows), return 3
        if (maxRows < 3) {
            console.log('Max rows is less than 3')
            return 3
        }

        // Search for the first row with a valid set number
        while (row <= maxRows) {
            const value = this._sheet.getRange(row, 1).getValue();
            if (value && this.isValidLegoSetNumber(value)) {
                console.log(`Top row is ${row}, value: ${value}`)
                return row
            }
            row++;
        }

        // No valid set numbers found, return 3 (should be first data row)
        return maxRows
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
        // Get the top row (first row with valid data)
        const topRow = this.topRow;

        // Insert a new row at the top data position
        this._sheet.insertRowBefore(topRow);

        // Add the manual entry data to the newly inserted row
        this._sheet.getRange(`A${topRow}:E${topRow}`).setValues([[
            setNumber,
            condition,
            status,
            purchasePrice,
            quantity,
        ]])

        return topRow;
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