import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

export async function logAuditEvent({
  actorId = null,
  actorEmail = '',
  actorRole = '',
  action,
  targetType = '',
  targetId = '',
  targetLabel = '',
  details = '',
  status = 'SUCCESS',
  metadata = {},
} = {}) {
  if (!action) {
    return;
  }

  try {
    await connectDB();
    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId,
      targetLabel,
      details,
      status,
      metadata,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
