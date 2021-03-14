"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PaymentLine {
    static getAttributeTypeMap() {
        return PaymentLine.attributeTypeMap;
    }
}
exports.PaymentLine = PaymentLine;
PaymentLine.discriminator = undefined;
PaymentLine.attributeTypeMap = [
    {
        "name": "paymentLineID",
        "baseName": "paymentLineID",
        "type": "string"
    },
    {
        "name": "amount",
        "baseName": "amount",
        "type": "number"
    },
    {
        "name": "accountNumber",
        "baseName": "accountNumber",
        "type": "string"
    },
    {
        "name": "sortCode",
        "baseName": "sortCode",
        "type": "string"
    },
    {
        "name": "accountName",
        "baseName": "accountName",
        "type": "string"
    }
];
//# sourceMappingURL=paymentLine.js.map