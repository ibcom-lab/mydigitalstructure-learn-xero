"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ReimbursementObject {
    static getAttributeTypeMap() {
        return ReimbursementObject.attributeTypeMap;
    }
}
exports.ReimbursementObject = ReimbursementObject;
ReimbursementObject.discriminator = undefined;
ReimbursementObject.attributeTypeMap = [
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
        "name": "reimbursement",
        "baseName": "reimbursement",
        "type": "Reimbursement"
    }
];
//# sourceMappingURL=reimbursementObject.js.map