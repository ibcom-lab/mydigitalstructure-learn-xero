"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EarningsRates {
    static getAttributeTypeMap() {
        return EarningsRates.attributeTypeMap;
    }
}
exports.EarningsRates = EarningsRates;
EarningsRates.discriminator = undefined;
EarningsRates.attributeTypeMap = [
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
        "name": "earningsRates",
        "baseName": "earningsRates",
        "type": "Array<EarningsRate>"
    }
];
//# sourceMappingURL=earningsRates.js.map