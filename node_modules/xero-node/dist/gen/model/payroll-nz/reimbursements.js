"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Reimbursements {
    static getAttributeTypeMap() {
        return Reimbursements.attributeTypeMap;
    }
}
exports.Reimbursements = Reimbursements;
Reimbursements.discriminator = undefined;
Reimbursements.attributeTypeMap = [
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
        "name": "reimbursements",
        "baseName": "reimbursements",
        "type": "Array<Reimbursement>"
    }
];
//# sourceMappingURL=reimbursements.js.map