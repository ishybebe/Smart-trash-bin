'use strict';

const { randomUUID } = require('crypto');
const { getPool, withTransaction } = require('./mysql');
const { logAdminAction } = require('./auditService');

function reportsUnavailable() {
  const error = new Error('Reports are temporarily unavailable.');
  error.statusCode = 503;
  error.code = 'REPORTS_UNAVAILABLE';
  return error;
}

async function getReports() {
  const pool = getPool();
  if (!pool) throw reportsUnavailable();

  const [summaryRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_detected,
      COALESCE(SUM(CASE WHEN status = 'accepted' THEN points_awarded ELSE 0 END), 0) AS points_generated,
      COALESCE(SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END), 0) AS accepted_recyclables
    FROM trash_deposits
  `);
  const [redeemRows] = await pool.query(`
    SELECT
      COALESCE(SUM(quantity), 0) AS packs_redeemed,
      COALESCE(SUM(points_used), 0) AS points_redeemed,
      COALESCE(SUM(quantity * CASE pack_size
        WHEN '1/8' THEN 0.125
        WHEN '1/4' THEN 0.25
        WHEN '1/2' THEN 0.5
        ELSE 0
      END), 0) AS rice_kg_distributed
    FROM rice_dispenses
    WHERE status = 'confirmed'
  `);
  const [wasteRows] = await pool.query(`
    SELECT
      reported_type AS type,
      COUNT(*) AS quantity,
      COALESCE(SUM(points_awarded), 0) AS points_generated
    FROM trash_deposits
    WHERE status = 'accepted'
    GROUP BY reported_type
    ORDER BY quantity DESC, points_generated DESC, type ASC
  `);

  const summary = summaryRows[0] || {};
  const redeemed = redeemRows[0] || {};
  return {
    summary: {
      total_detected: Number(summary.total_detected || 0),
      accepted_recyclables: Number(summary.accepted_recyclables || 0),
      points_generated: Number(summary.points_generated || 0),
      packs_redeemed: Number(redeemed.packs_redeemed || 0),
      points_redeemed: Number(redeemed.points_redeemed || 0),
      rice_kg_distributed: Number(redeemed.rice_kg_distributed || 0),
    },
    waste_ranking: wasteRows.map((row) => ({
      type: row.type,
      quantity: Number(row.quantity),
      points_generated: Number(row.points_generated),
    })),
  };
}

async function generateReport(adminUserId) {
  const report = await getReports();
  const reportId = randomUUID();
  const pool = getPool();

  if (!pool) throw reportsUnavailable();

  return withTransaction(async (connection) => {
    await connection.query(
      `INSERT INTO report_generations (report_id, admin_user_id, report_data)
       VALUES (?, ?, ?)`,
      [reportId, adminUserId, JSON.stringify(report)],
    );

    await logAdminAction(connection, {
      adminUserId,
      action: 'GENERATE_REPORT',
      entityType: 'report',
      entityId: reportId,
      details: {
        report_id: reportId,
        summary: report.summary,
      },
    });

    const [rows] = await connection.query(
      `SELECT r.report_id, r.admin_user_id, a.username, r.created_at
         FROM report_generations r
         JOIN admin_users a ON a.id = r.admin_user_id
        WHERE r.report_id = ?`,
      [reportId],
    );

    return {
      report_id: rows[0].report_id,
      created_at: rows[0].created_at,
      created_by_admin_id: rows[0].admin_user_id,
      created_by_admin: rows[0].username,
      report,
    };
  });
}

async function getReportAuditLog() {
  const pool = getPool();
  if (!pool) throw reportsUnavailable();

  const [rows] = await pool.query(
    `SELECT r.report_id, r.admin_user_id, a.username as created_by_admin, r.created_at, r.report_data
       FROM report_generations r
       JOIN admin_users a ON a.id = r.admin_user_id
      ORDER BY r.created_at DESC`,
  );

  return rows.map((row) => ({
    report_id: row.report_id,
    created_at: row.created_at,
    created_by_admin_id: row.admin_user_id,
    created_by_admin: row.created_by_admin,
    reports: row.report_data,
  }));
}

module.exports = { getReports, generateReport, getReportAuditLog };
