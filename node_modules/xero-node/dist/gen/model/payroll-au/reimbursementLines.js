"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
* The reimbursement type lines
*/
class ReimbursementLines {
    static getAttributeTypeMap() {
        return ReimbursementLines.attributeTypeMap;
    }
}
exports.ReimbursementLines = ReimbursementLines;
ReimbursementLines.discriminator = undefined;
ReimbursementLines.attributeTypeMap = [
    {
        "name": "reimbursementLines",
        "baseName": "ReimbursementLines",
        "type": "Array<ReimbursementLine>"
    }
];
//# sourceMappingURL=reimbursementLines.js.map