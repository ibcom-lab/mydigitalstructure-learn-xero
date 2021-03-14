"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Payslips {
    static getAttributeTypeMap() {
        return Payslips.attributeTypeMap;
    }
}
exports.Payslips = Payslips;
Payslips.discriminator = undefined;
Payslips.attributeTypeMap = [
    {
        "name": "payslips",
        "baseName": "Payslips",
        "type": "Array<Payslip>"
    }
];
//# sourceMappingURL=payslips.js.map