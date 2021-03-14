"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmployeePayTemplates {
    static getAttributeTypeMap() {
        return EmployeePayTemplates.attributeTypeMap;
    }
}
exports.EmployeePayTemplates = EmployeePayTemplates;
EmployeePayTemplates.discriminator = undefined;
EmployeePayTemplates.attributeTypeMap = [
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
        "name": "payTemplate",
        "baseName": "payTemplate",
        "type": "EmployeePayTemplate"
    }
];
//# sourceMappingURL=employeePayTemplates.js.map