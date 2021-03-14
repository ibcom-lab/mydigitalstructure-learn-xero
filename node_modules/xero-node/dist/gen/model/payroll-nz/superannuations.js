"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Superannuations {
    static getAttributeTypeMap() {
        return Superannuations.attributeTypeMap;
    }
}
exports.Superannuations = Superannuations;
Superannuations.discriminator = undefined;
Superannuations.attributeTypeMap = [
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
        "name": "benefits",
        "baseName": "benefits",
        "type": "Array<Benefit>"
    }
];
//# sourceMappingURL=superannuations.js.map