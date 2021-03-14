"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmployeeTaxObject {
    static getAttributeTypeMap() {
        return EmployeeTaxObject.attributeTypeMap;
    }
}
exports.EmployeeTaxObject = EmployeeTaxObject;
EmployeeTaxObject.discriminator = undefined;
EmployeeTaxObject.attributeTypeMap = [
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
        "name": "employeeTax",
        "baseName": "employeeTax",
        "type": "EmployeeTax"
    }
];
//# sourceMappingURL=employeeTaxObject.js.map