"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PayRuns {
    static getAttributeTypeMap() {
        return PayRuns.attributeTypeMap;
    }
}
exports.PayRuns = PayRuns;
PayRuns.discriminator = undefined;
PayRuns.attributeTypeMap = [
    {
        "name": "payRuns",
        "baseName": "PayRuns",
        "type": "Array<PayRun>"
    }
];
//# sourceMappingURL=payRuns.js.map