"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LeaveTypes {
    static getAttributeTypeMap() {
        return LeaveTypes.attributeTypeMap;
    }
}
exports.LeaveTypes = LeaveTypes;
LeaveTypes.discriminator = undefined;
LeaveTypes.attributeTypeMap = [
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
        "name": "leaveTypes",
        "baseName": "leaveTypes",
        "type": "Array<LeaveType>"
    }
];
//# sourceMappingURL=leaveTypes.js.map