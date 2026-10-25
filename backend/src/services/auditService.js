'use strict';

/**
 * Write an admin action to the audit log. Pass the transaction connection when
 * the action must commit atomically with its data change.
 */
async function logAdminAction(connection, {
  adminUserId = null,
  action,
  entityType = null,
  entityId = null,
  details = null,
}) {
  await connection.query(
    `INSERT INTO admin_audit_log
       (admin_user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [
      adminUserId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
    ],
  );
}

module.exports = { logAdminAction };
