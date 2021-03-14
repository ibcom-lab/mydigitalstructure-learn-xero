"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmployeeStatutoryLeavesSummaries {
    static getAttributeTypeMap() {
        return EmployeeStatutoryLeavesSummaries.attributeTypeMap;
    }
}
exports.EmployeeStatutoryLeavesSummaries = EmployeeStatutoryLeavesSummaries;
EmployeeStatutoryLeavesSummaries.discriminator = undefined;
EmployeeStatutoryLeavesSummaries.attributeTypeMap = [
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
        "name": "statutoryLeaves",
        "baseName": "statutoryLeaves",
        "type": "Array<EmployeeStatutoryLeaveSummary>"
    }
];
//# sourceMappingURL=employeeStatutoryLeavesSummaries.js.map