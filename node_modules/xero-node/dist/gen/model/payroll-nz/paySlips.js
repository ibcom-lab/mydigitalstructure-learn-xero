"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PaySlips {
    static getAttributeTypeMap() {
        return PaySlips.attributeTypeMap;
    }
}
exports.PaySlips = PaySlips;
PaySlips.discriminator = undefined;
PaySlips.attributeTypeMap = [
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
        "name": "paySlips",
        "baseName": "paySlips",
        "type": "Array<PaySlip>"
    }
];
//# sourceMappingURL=paySlips.js.map