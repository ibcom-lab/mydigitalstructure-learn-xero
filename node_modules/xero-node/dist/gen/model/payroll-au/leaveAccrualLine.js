"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LeaveAccrualLine {
    static getAttributeTypeMap() {
        return LeaveAccrualLine.attributeTypeMap;
    }
}
exports.LeaveAccrualLine = LeaveAccrualLine;
LeaveAccrualLine.discriminator = undefined;
LeaveAccrualLine.attributeTypeMap = [
    {
        "name": "leaveTypeID",
        "baseName": "LeaveTypeID",
        "type": "string"
    },
    {
        "name": "numberOfUnits",
        "baseName": "NumberOfUnits",
        "type": "number"
    },
    {
        "name": "autoCalculate",
        "baseName": "AutoCalculate",
        "type": "boolean"
    }
];
//# sourceMappingURL=leaveAccrualLine.js.map