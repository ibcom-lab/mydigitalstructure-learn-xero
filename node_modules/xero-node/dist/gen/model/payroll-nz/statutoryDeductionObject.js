"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StatutoryDeductionObject {
    static getAttributeTypeMap() {
        return StatutoryDeductionObject.attributeTypeMap;
    }
}
exports.StatutoryDeductionObject = StatutoryDeductionObject;
StatutoryDeductionObject.discriminator = undefined;
StatutoryDeductionObject.attributeTypeMap = [
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
        "name": "statutoryDeduction",
        "baseName": "statutoryDeduction",
        "type": "StatutoryDeduction"
    }
];
//# sourceMappingURL=statutoryDeductionObject.js.map