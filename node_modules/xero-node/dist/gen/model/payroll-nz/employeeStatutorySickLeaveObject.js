"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmployeeStatutorySickLeaveObject {
    static getAttributeTypeMap() {
        return EmployeeStatutorySickLeaveObject.attributeTypeMap;
    }
}
exports.EmployeeStatutorySickLeaveObject = EmployeeStatutorySickLeaveObject;
EmployeeStatutorySickLeaveObject.discriminator = undefined;
EmployeeStatutorySickLeaveObject.attributeTypeMap = [
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
        "name": "statutorySickLeave",
        "baseName": "statutorySickLeave",
        "type": "EmployeeStatutorySickLeave"
    }
];
//# sourceMappingURL=employeeStatutorySickLeaveObject.js.map