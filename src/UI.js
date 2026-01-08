const Button = Object.freeze({
    OK: 'OK',
    CANCEL: 'CANCEL',
    YES: 'YES',
    NO: 'NO',
    CLOSE: 'CLOSE',
});

let _ui = null;
let _uiChecked = false;

class UI {
    static get() {
        if (!_uiChecked) {
            try {
                _ui = SpreadsheetApp.getUi();
            } catch (e) {
                _ui = null;
            }
            _uiChecked = true;
        }
        return _ui;
    }

    static get available() {
        return this.get() !== null;
    }

    static get ButtonSet() {
        return {
            OK: () => this.get()?.ButtonSet.OK ?? null,
            OK_CANCEL: () => this.get()?.ButtonSet.OK_CANCEL ?? null,
            YES_NO: () => this.get()?.ButtonSet.YES_NO ?? null,
            YES_NO_CANCEL: () => this.get()?.ButtonSet.YES_NO_CANCEL ?? null,
        };
    }

    static get Button() {
        return Button;
    }

    static fromGoogleButton(btn) {
        const ui = this.get();
        if (!ui) return null;

        if (btn === ui.Button.OK) return Button.OK;
        if (btn === ui.Button.CANCEL) return Button.CANCEL;
        if (btn === ui.Button.YES) return Button.YES;
        if (btn === ui.Button.NO) return Button.NO;
        if (btn === ui.Button.CLOSE) return Button.CLOSE;
        return null;
    }

    static alert(title, message, buttonSet, defaultValue) {
        buttonSet = buttonSet || this.ButtonSet.OK;
        defaultValue = defaultValue || null;
        try {
            const bs = buttonSet();
            if (!bs) return defaultValue;
            const btn = SpreadsheetApp.getUi().alert(title, message, bs);
            return this.fromGoogleButton(btn);
        } catch (e) {
            console.warn('Unable to show alert: ' + e);
            return defaultValue;
        }
    }

    static confirm(title, message, defaultValue) {
        defaultValue = defaultValue || false;
        const result = this.alert(title, message, this.ButtonSet.YES_NO, defaultValue ? Button.YES : Button.NO);
        return result === Button.YES;
    }

    static modal(html, title) {
        try {
            SpreadsheetApp.getUi().showModalDialog(html, title);
            return true;
        } catch (e) {
            console.warn('Unable to show modal: ' + e);
            return false;
        }
    }

    static sidebar(html) {
        try {
            SpreadsheetApp.getUi().showSidebar(html);
            return true;
        } catch (e) {
            console.warn('Unable to show sidebar: ' + e);
            return false;
        }
    }

    static toast(message, title, timeout) {
        SpreadsheetApp.getActiveSpreadsheet().toast(message, title || '', timeout || 5);
    }

    static error(e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(e);
        this.toast('Error: ' + message);
    }
}
