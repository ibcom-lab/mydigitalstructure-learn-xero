"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SuperFunds {
    static getAttributeTypeMap() {
        return SuperFunds.attributeTypeMap;
    }
}
exports.SuperFunds = SuperFunds;
SuperFunds.discriminator = undefined;
SuperFunds.attributeTypeMap = [
    {
        "name": "superFunds",
        "baseName": "SuperFunds",
        "type": "Array<SuperFund>"
    }
];
//# sourceMappingURL=superFunds.js.map