"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Settings {
    static getAttributeTypeMap() {
        return Settings.attributeTypeMap;
    }
}
exports.Settings = Settings;
Settings.discriminator = undefined;
Settings.attributeTypeMap = [
    {
        "name": "accounts",
        "baseName": "Accounts",
        "type": "Array<Account>"
    },
    {
        "name": "trackingCategories",
        "baseName": "TrackingCategories",
        "type": "SettingsTrackingCategories"
    },
    {
        "name": "daysInPayrollYear",
        "baseName": "DaysInPayrollYear",
        "type": "number"
    }
];
//# sourceMappingURL=settings.js.map