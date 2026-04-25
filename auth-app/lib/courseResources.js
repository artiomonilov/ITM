import Resource from '@/models/Resource';
import CourseActivityLog from '@/models/CourseActivityLog';

export async function getStudentCourseResourceSnapshot(course, studentId) {
  const [allocations, activityLogs] = await Promise.all([
    Resource.find({
      courseId: course._id,
      studentId,
      type: { $in: ['TOKEN', 'SUBSCRIPTION'] },
    }).lean(),
    CourseActivityLog.find({
      courseId: course._id,
      studentId,
    }).sort({ createdAt: -1 }).lean(),
  ]);

  const courseTokens = allocations
    .filter((item) => item.type === 'TOKEN' && item.allocationScope === 'COURSE')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
  const extraTokens = allocations
    .filter((item) => item.type === 'TOKEN' && item.allocationScope === 'EXTRA')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
  const courseSubscriptions = allocations
    .filter((item) => item.type === 'SUBSCRIPTION' && item.allocationScope === 'COURSE')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
  const extraSubscriptions = allocations
    .filter((item) => item.type === 'SUBSCRIPTION' && item.allocationScope === 'EXTRA')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const consumedTokens = activityLogs.reduce((sum, item) => sum + (item.tokenConsumed || 0), 0);
  const consumedSubscriptions = activityLogs.reduce((sum, item) => sum + (item.subscriptionConsumed || 0), 0);

  return {
    baseTokens: courseTokens,
    extraTokens,
    consumedTokens,
    remainingTokens: Math.max(0, courseTokens + extraTokens - consumedTokens),
    baseSubscriptions: courseSubscriptions,
    extraSubscriptions,
    consumedSubscriptions,
    remainingSubscriptions: Math.max(0, courseSubscriptions + extraSubscriptions - consumedSubscriptions),
    logs: activityLogs.map((item) => ({
      _id: item._id.toString(),
      activityTitle: item.activityTitle,
      mode: item.mode,
      prompt: item.prompt,
      response: item.response,
      tokenConsumed: item.tokenConsumed || 0,
      subscriptionConsumed: item.subscriptionConsumed || 0,
      createdAt: item.createdAt,
    })),
  };
}
