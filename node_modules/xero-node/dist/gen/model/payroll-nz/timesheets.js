"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Timesheets {
    static getAttributeTypeMap() {
        return Timesheets.attributeTypeMap;
    }
}
exports.Timesheets = Timesheets;
Timesheets.discriminator = undefined;
Timesheets.attributeTypeMap = [
    {
        "name": "pagination",
        "baseName": "pagination",
        "type": "Pagination"
    },
    {
        "name": "problem",
        "baseName": "problem",
        "type": "Problem"
    },
    {
        "name": "timesheets",
        "baseName": "timesheets",
        "type": "Array<Timesheet>"
    }
];
//# sourceMappingURL=timesheets.js.map