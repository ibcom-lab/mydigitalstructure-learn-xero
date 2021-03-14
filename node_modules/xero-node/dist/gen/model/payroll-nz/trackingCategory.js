"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TrackingCategory {
    static getAttributeTypeMap() {
        return TrackingCategory.attributeTypeMap;
    }
}
exports.TrackingCategory = TrackingCategory;
TrackingCategory.discriminator = undefined;
TrackingCategory.attributeTypeMap = [
    {
        "name": "employeeGroupsTrackingCategoryID",
        "baseName": "employeeGroupsTrackingCategoryID",
        "type": "string"
    },
    {
        "name": "timesheetTrackingCategoryID",
        "baseName": "timesheetTrackingCategoryID",
        "type": "string"
    }
];
//# sourceMappingURL=trackingCategory.js.map