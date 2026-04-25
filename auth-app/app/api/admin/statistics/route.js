import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import Course from '@/models/Course';
import Resource from '@/models/Resource';
import ResourceInventory from '@/models/ResourceInventory';
import ResourceUsage from '@/models/ResourceUsage';
import User from '@/models/User';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Admin') {
    return null;
  }

  return session;
}

function createZeroActivityMap(activities) {
  return activities.map((activity) => ({
    activityId: activity._id.toString(),
    activityTitle: activity.title,
    tokenCost: activity.tokenCost || 0,
    usagesCount: 0,
    totalTokensUsed: 0,
  }));
}

function mergeActivityUsage(baseActivities, groupedUsage) {
  const byId = new Map(
    baseActivities.map((activity) => [activity.activityId, { ...activity }]),
  );

  groupedUsage.forEach((usage) => {
    if (usage.activityId && byId.has(usage.activityId)) {
      const entry = byId.get(usage.activityId);
      entry.usagesCount = usage.usagesCount;
      entry.totalTokensUsed = usage.totalTokensUsed;
      return;
    }

    const fallbackKey = `fallback:${usage.activityTitle}`;
    byId.set(fallbackKey, {
      activityId: usage.activityId || null,
      activityTitle: usage.activityTitle || 'Activitate fara nume',
      tokenCost: usage.tokenCost || 0,
      usagesCount: usage.usagesCount,
      totalTokensUsed: usage.totalTokensUsed,
    });
  });

  return Array.from(byId.values()).sort((left, right) => right.totalTokensUsed - left.totalTokensUsed);
}

async function getActivityGroupedUsage(match) {
  const grouped = await ResourceUsage.aggregate([
    { $match: { ...match, resourceType: 'TOKEN' } },
    {
      $group: {
        _id: {
          activityId: '$activityId',
          activityTitle: '$activityTitle',
          tokenCostPerUnit: '$tokenCostPerUnit',
        },
        usagesCount: { $sum: '$quantity' },
        totalTokensUsed: { $sum: '$totalTokensUsed' },
      },
    },
  ]);

  return grouped.map((entry) => ({
    activityId: entry._id.activityId ? entry._id.activityId.toString() : null,
    activityTitle: entry._id.activityTitle,
    tokenCost: entry._id.tokenCostPerUnit || 0,
    usagesCount: entry.usagesCount,
    totalTokensUsed: entry.totalTokensUsed,
  }));
}

async function buildStudentStats(activities) {
  const students = await User.find({ role: 'Student' }).select('nume prenume email');
  const courses = await Course.find()
    .populate('students', '_id')
    .select('name students resourceRequirements');

  const extraAllocated = await Resource.find({ studentId: { $ne: null } }).select('studentId type quantity');
  const usageLogs = await ResourceUsage.find()
    .populate('studentId', 'nume prenume email')
    .select('studentId resourceType totalTokensUsed subscriptionCountUsed');

  const extraByStudent = new Map();
  extraAllocated.forEach((resource) => {
    const key = resource.studentId.toString();
    if (!extraByStudent.has(key)) {
      extraByStudent.set(key, { TOKEN: 0, SUBSCRIPTION: 0 });
    }

    extraByStudent.get(key)[resource.type] += resource.quantity;
  });

  const usageByStudent = new Map();
  usageLogs.forEach((usage) => {
    if (!usage.studentId) {
      return;
    }

    const key = usage.studentId._id.toString();
    if (!usageByStudent.has(key)) {
      usageByStudent.set(key, { totalTokensUsed: 0, totalSubscriptionsUsed: 0 });
    }

    usageByStudent.get(key).totalTokensUsed += usage.totalTokensUsed || 0;
    usageByStudent.get(key).totalSubscriptionsUsed += usage.subscriptionCountUsed || 0;
  });

  const result = [];

  for (const student of students) {
    const studentId = student._id.toString();
    let allocatedTokens = 0;
    let allocatedSubscriptions = 0;

    courses.forEach((course) => {
      const isEnrolled = course.students.some((entry) => entry._id.toString() === studentId);
      if (!isEnrolled) {
        return;
      }

      allocatedTokens += course.resourceRequirements?.tokenPerStudent || 0;
      allocatedSubscriptions += course.resourceRequirements?.subscriptionPerStudent || 0;
    });

    allocatedTokens += extraByStudent.get(studentId)?.TOKEN || 0;
    allocatedSubscriptions += extraByStudent.get(studentId)?.SUBSCRIPTION || 0;

    const groupedUsage = await getActivityGroupedUsage({ studentId: student._id });
    const activityBreakdown = mergeActivityUsage(createZeroActivityMap(activities), groupedUsage);
    const totals = usageByStudent.get(studentId) || { totalTokensUsed: 0, totalSubscriptionsUsed: 0 };

    result.push({
      studentId,
      studentName: `${student.nume} ${student.prenume}`,
      email: student.email,
      allocatedTokens,
      totalTokensUsed: totals.totalTokensUsed,
      allocatedSubscriptions,
      totalSubscriptionsUsed: totals.totalSubscriptionsUsed,
      activityBreakdown,
    });
  }

  return result.sort((left, right) => right.totalTokensUsed - left.totalTokensUsed);
}

async function buildCourseStats(activities) {
  const courses = await Course.find()
    .populate('teacher', 'nume prenume email')
    .select('name teacher students resourceRequirements');
  const allocatedResources = await Resource.find().select('courseId type quantity');
  const usageLogs = await ResourceUsage.find().select('courseId totalTokensUsed subscriptionCountUsed');

  const allocationByCourse = new Map();
  allocatedResources.forEach((resource) => {
    if (!resource.courseId) {
      return;
    }

    const key = resource.courseId.toString();
    if (!allocationByCourse.has(key)) {
      allocationByCourse.set(key, { TOKEN: 0, SUBSCRIPTION: 0 });
    }

    allocationByCourse.get(key)[resource.type] += resource.quantity;
  });

  const usageByCourse = new Map();
  usageLogs.forEach((usage) => {
    if (!usage.courseId) {
      return;
    }

    const key = usage.courseId.toString();
    if (!usageByCourse.has(key)) {
      usageByCourse.set(key, { totalTokensUsed: 0, totalSubscriptionsUsed: 0 });
    }

    usageByCourse.get(key).totalTokensUsed += usage.totalTokensUsed || 0;
    usageByCourse.get(key).totalSubscriptionsUsed += usage.subscriptionCountUsed || 0;
  });

  const result = [];

  for (const course of courses) {
    const courseId = course._id.toString();
    const groupedUsage = await getActivityGroupedUsage({ courseId: course._id });
    const activityBreakdown = mergeActivityUsage(createZeroActivityMap(activities), groupedUsage);
    const allocated = allocationByCourse.get(courseId) || { TOKEN: 0, SUBSCRIPTION: 0 };
    const totals = usageByCourse.get(courseId) || { totalTokensUsed: 0, totalSubscriptionsUsed: 0 };

    result.push({
      courseId,
      courseName: course.name,
      teacherName: course.teacher ? `${course.teacher.nume} ${course.teacher.prenume}` : 'N/A',
      studentsCount: course.students?.length || 0,
      requestedTokens: course.resourceRequirements?.tokenTotalRequested || 0,
      allocatedTokens: allocated.TOKEN,
      totalTokensUsed: totals.totalTokensUsed,
      requestedSubscriptions: course.resourceRequirements?.subscriptionTotalRequested || 0,
      allocatedSubscriptions: allocated.SUBSCRIPTION,
      totalSubscriptionsUsed: totals.totalSubscriptionsUsed,
      activityBreakdown,
    });
  }

  return result.sort((left, right) => right.totalTokensUsed - left.totalTokensUsed);
}

async function buildUniversityStats(activities) {
  const inventory = await ResourceInventory.findOne();
  const allocatedResources = await Resource.find();
  const usageLogs = await ResourceUsage.find();
  const groupedUsage = await getActivityGroupedUsage({});
  const activityBreakdown = mergeActivityUsage(createZeroActivityMap(activities), groupedUsage);

  const allocatedTokens = allocatedResources
    .filter((resource) => resource.type === 'TOKEN')
    .reduce((sum, resource) => sum + (resource.quantity || 0), 0);

  const allocatedSubscriptions = allocatedResources
    .filter((resource) => resource.type === 'SUBSCRIPTION')
    .reduce((sum, resource) => sum + (resource.quantity || 0), 0);

  const totalTokensUsed = usageLogs.reduce((sum, usage) => sum + (usage.totalTokensUsed || 0), 0);
  const totalSubscriptionsUsed = usageLogs.reduce((sum, usage) => sum + (usage.subscriptionCountUsed || 0), 0);

  return {
    totalTokensAvailable: inventory?.totalTokens || 0,
    totalSubscriptionsAvailable: inventory?.totalSubscriptions || 0,
    allocatedTokens,
    totalTokensUsed,
    allocatedSubscriptions,
    totalSubscriptionsUsed,
    activityBreakdown,
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
    }

    await connectDB();

    const activities = await Activity.find().sort({ createdAt: 1 }).select('title tokenCost');
    const [studentStats, courseStats, universityStats] = await Promise.all([
      buildStudentStats(activities),
      buildCourseStats(activities),
      buildUniversityStats(activities),
    ]);

    return NextResponse.json({
      studentStats,
      courseStats,
      universityStats,
    });
  } catch (error) {
    console.error('Eroare statistici admin:', error);
    return NextResponse.json(
      { message: error?.message || 'Eroare interna la calculul statisticilor.' },
      { status: 500 }
    );
  }
}
