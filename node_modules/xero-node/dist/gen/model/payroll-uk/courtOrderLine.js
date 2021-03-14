"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CourtOrderLine {
    static getAttributeTypeMap() {
        return CourtOrderLine.attributeTypeMap;
    }
}
exports.CourtOrderLine = CourtOrderLine;
CourtOrderLine.discriminator = undefined;
CourtOrderLine.attributeTypeMap = [
    {
        "name": "courtOrderTypeID",
        "baseName": "courtOrderTypeID",
        "type": "string"
    },
    {
        "name": "amount",
        "baseName": "amount",
        "type": "number"
    }
];
//# sourceMappingURL=courtOrderLine.js.map