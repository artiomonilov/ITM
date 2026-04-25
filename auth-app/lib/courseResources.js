import Resource from '@/models/Resource';
import CourseActivityLog from '@/models/CourseActivityLog';

export async function getStudentCourseResourceSnapshot(course, studentId) {
  const baseTokens = course.resourceRequirements?.tokenPerStudent || 0;
  const baseSubscriptions = course.resourceRequirements?.subscriptionPerStudent || 0;

  const [extraAllocations, activityLogs] = await Promise.all([
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

  const extraTokens = extraAllocations
    .filter((item) => item.type === 'TOKEN')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
  const extraSubscriptions = extraAllocations
    .filter((item) => item.type === 'SUBSCRIPTION')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const consumedTokens = activityLogs.reduce((sum, item) => sum + (item.tokenConsumed || 0), 0);
  const consumedSubscriptions = activityLogs.reduce((sum, item) => sum + (item.subscriptionConsumed || 0), 0);
  const manualTokenActions = activityLogs.filter((item) => item.mode === 'MANUAL_TOKEN').length;
  const subscriptionValidationActions = activityLogs.filter((item) => item.mode === 'SUBSCRIPTION_VALIDATION').length;

  return {
    baseTokens,
    extraTokens,
    consumedTokens,
    remainingTokens: Math.max(0, baseTokens + extraTokens - consumedTokens),
    baseSubscriptions,
    extraSubscriptions,
    consumedSubscriptions,
    remainingSubscriptions: Math.max(0, baseSubscriptions + extraSubscriptions - consumedSubscriptions),
    manualTokenActions,
    manualTokenScore: Math.min(5, manualTokenActions * 0.5),
    subscriptionValidationActions,
    subscriptionValidationScore: subscriptionValidationActions > 0 ? 5 : 0,
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
