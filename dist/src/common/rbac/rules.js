"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPT_ROLES = exports.ADMIN_ROLES = void 0;
exports.canManageInDept = canManageInDept;
exports.canCreateInDept = canCreateInDept;
exports.canUpdateTask = canUpdateTask;
exports.canDeleteTask = canDeleteTask;
const client_1 = require("@prisma/client");
exports.ADMIN_ROLES = new Set([client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN]);
exports.DEPT_ROLES = new Set([client_1.EventRole.DEPT_HEAD, client_1.EventRole.DEPT_MEMBER, client_1.EventRole.OBSERVER]);
function canManageInDept(role) {
    return role === client_1.EventRole.DEPT_HEAD || exports.ADMIN_ROLES.has(role);
}
function canCreateInDept(role) {
    return role === client_1.EventRole.DEPT_HEAD || role === client_1.EventRole.DEPT_MEMBER || exports.ADMIN_ROLES.has(role);
}
function canUpdateTask(role, task, actorId, sameDept) {
    if (exports.ADMIN_ROLES.has(role))
        return true;
    if (role === client_1.EventRole.DEPT_HEAD && sameDept)
        return true;
    if (role === client_1.EventRole.DEPT_MEMBER && sameDept) {
        return task.creatorId === actorId || task.assigneeId === actorId;
    }
    return false;
}
function canDeleteTask(role, task, actorId, sameDept) {
    if (exports.ADMIN_ROLES.has(role))
        return true;
    if (role === client_1.EventRole.DEPT_HEAD && sameDept)
        return true;
    if (role === client_1.EventRole.DEPT_MEMBER && sameDept)
        return task.creatorId === actorId;
    return false;
}
//# sourceMappingURL=rules.js.map