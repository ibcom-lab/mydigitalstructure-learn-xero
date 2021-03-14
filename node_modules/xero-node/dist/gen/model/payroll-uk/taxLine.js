"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TaxLine {
    static getAttributeTypeMap() {
        return TaxLine.attributeTypeMap;
    }
}
exports.TaxLine = TaxLine;
TaxLine.discriminator = undefined;
TaxLine.attributeTypeMap = [
    {
        "name": "taxLineID",
        "baseName": "taxLineID",
        "type": "string"
    },
    {
        "name": "description",
        "baseName": "description",
        "type": "string"
    },
    {
        "name": "isEmployerTax",
        "baseName": "isEmployerTax",
        "type": "boolean"
    },
    {
        "name": "amount",
        "baseName": "amount",
        "type": "number"
    },
    {
        "name": "globalTaxTypeID",
        "baseName": "globalTaxTypeID",
        "type": "string"
    },
    {
        "name": "manualAdjustment",
        "baseName": "manualAdjustment",
        "type": "boolean"
    }
];
//# sourceMappingURL=taxLine.js.map