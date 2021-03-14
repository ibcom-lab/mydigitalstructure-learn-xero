"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Statements {
    static getAttributeTypeMap() {
        return Statements.attributeTypeMap;
    }
}
exports.Statements = Statements;
Statements.discriminator = undefined;
Statements.attributeTypeMap = [
    {
        "name": "pagination",
        "baseName": "pagination",
        "type": "Pagination"
    },
    {
        "name": "items",
        "baseName": "items",
        "type": "Array<Statement>"
    }
];
//# sourceMappingURL=statements.js.map