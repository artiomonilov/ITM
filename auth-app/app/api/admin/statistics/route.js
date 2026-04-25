import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import Course from '@/models/Course';
import CourseActivityLog from '@/models/CourseActivityLog';
import Resource from '@/models/Resource';
import ResourceInventory from '@/models/ResourceInventory';
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
    subscriptionCost: activity.subscriptionCost || 0,
    usagesCount: 0,
    totalTokensUsed: 0,
    totalSubscriptionsUsed: 0,
  }));
}

function buildActivityKey({ activityId, activityTitle }) {
  return activityId ? `id:${activityId}` : `title:${activityTitle || 'Activitate fara nume'}`;
}

function accumulateActivityUsage(targetMap, log, activitiesById) {
  const activityId = log.activityId ? log.activityId.toString() : null;
  const activityTitle = log.activityTitle || 'Activitate fara nume';
  const activityDefinition = activityId ? activitiesById.get(activityId) : null;
  const key = buildActivityKey({ activityId, activityTitle });

  if (!targetMap.has(key)) {
    targetMap.set(key, {
      activityId,
      activityTitle: activityDefinition?.title || activityTitle,
      tokenCost: activityDefinition?.tokenCost ?? 0,
      subscriptionCost: activityDefinition?.subscriptionCost ?? 0,
      usagesCount: 0,
      totalTokensUsed: 0,
      totalSubscriptionsUsed: 0,
    });
  }

  const entry = targetMap.get(key);
  entry.usagesCount += 1;
  entry.totalTokensUsed += log.tokenConsumed || 0;
  entry.totalSubscriptionsUsed += log.subscriptionConsumed || 0;

  if (!activityDefinition) {
    if (entry.tokenCost === 0 && (log.tokenConsumed || 0) > 0) {
      entry.tokenCost = log.tokenConsumed || 0;
    }
    if (entry.subscriptionCost === 0 && (log.subscriptionConsumed || 0) > 0) {
      entry.subscriptionCost = log.subscriptionConsumed || 0;
    }
  }
}

function mergeActivityUsage(baseActivities, groupedMap) {
  const merged = new Map(
    baseActivities.map((activity) => [buildActivityKey(activity), { ...activity }]),
  );

  groupedMap.forEach((usage, key) => {
    if (merged.has(key)) {
      const entry = merged.get(key);
      entry.usagesCount = usage.usagesCount;
      entry.totalTokensUsed = usage.totalTokensUsed;
      entry.totalSubscriptionsUsed = usage.totalSubscriptionsUsed;
      if (!entry.tokenCost && usage.tokenCost) {
        entry.tokenCost = usage.tokenCost;
      }
      if (!entry.subscriptionCost && usage.subscriptionCost) {
        entry.subscriptionCost = usage.subscriptionCost;
      }
      return;
    }

    merged.set(key, usage);
  });

  return Array.from(merged.values()).sort((left, right) => {
    if (right.totalTokensUsed !== left.totalTokensUsed) {
      return right.totalTokensUsed - left.totalTokensUsed;
    }
    if (right.totalSubscriptionsUsed !== left.totalSubscriptionsUsed) {
      return right.totalSubscriptionsUsed - left.totalSubscriptionsUsed;
    }
    return left.activityTitle.localeCompare(right.activityTitle, 'ro');
  });
}

function buildAllocationMap(resources, selector) {
  const allocationMap = new Map();

  resources.forEach((resource) => {
    const selectedValue = selector(resource);
    if (!selectedValue) {
      return;
    }

    const key = selectedValue.toString();
    if (!allocationMap.has(key)) {
      allocationMap.set(key, { TOKEN: 0, SUBSCRIPTION: 0 });
    }

    allocationMap.get(key)[resource.type] += resource.quantity || 0;
  });

  return allocationMap;
}

function buildUsageMaps(logs, activitiesById) {
  const usageByStudent = new Map();
  const usageByCourse = new Map();
  const studentActivityMaps = new Map();
  const courseActivityMaps = new Map();
  const universityActivityMap = new Map();

  logs.forEach((log) => {
    const tokenConsumed = log.tokenConsumed || 0;
    const subscriptionConsumed = log.subscriptionConsumed || 0;

    if (log.studentId) {
      const studentKey = log.studentId.toString();
      if (!usageByStudent.has(studentKey)) {
        usageByStudent.set(studentKey, { totalTokensUsed: 0, totalSubscriptionsUsed: 0 });
      }

      usageByStudent.get(studentKey).totalTokensUsed += tokenConsumed;
      usageByStudent.get(studentKey).totalSubscriptionsUsed += subscriptionConsumed;

      if (!studentActivityMaps.has(studentKey)) {
        studentActivityMaps.set(studentKey, new Map());
      }
      accumulateActivityUsage(studentActivityMaps.get(studentKey), log, activitiesById);
    }

    if (log.courseId) {
      const courseKey = log.courseId.toString();
      if (!usageByCourse.has(courseKey)) {
        usageByCourse.set(courseKey, { totalTokensUsed: 0, totalSubscriptionsUsed: 0 });
      }

      usageByCourse.get(courseKey).totalTokensUsed += tokenConsumed;
      usageByCourse.get(courseKey).totalSubscriptionsUsed += subscriptionConsumed;

      if (!courseActivityMaps.has(courseKey)) {
        courseActivityMaps.set(courseKey, new Map());
      }
      accumulateActivityUsage(courseActivityMaps.get(courseKey), log, activitiesById);
    }

    accumulateActivityUsage(universityActivityMap, log, activitiesById);
  });

  return {
    usageByStudent,
    usageByCourse,
    studentActivityMaps,
    courseActivityMaps,
    universityActivityMap,
  };
}

function buildUniversityStats({ inventory, resources, usageMaps, baseActivities }) {
  const allocatedTokens = resources
    .filter((resource) => resource.type === 'TOKEN')
    .reduce((sum, resource) => sum + (resource.quantity || 0), 0);

  const allocatedSubscriptions = resources
    .filter((resource) => resource.type === 'SUBSCRIPTION')
    .reduce((sum, resource) => sum + (resource.quantity || 0), 0);

  const totalTokensUsed = Array.from(usageMaps.usageByCourse.values())
    .reduce((sum, usage) => sum + (usage.totalTokensUsed || 0), 0);
  const totalSubscriptionsUsed = Array.from(usageMaps.usageByCourse.values())
    .reduce((sum, usage) => sum + (usage.totalSubscriptionsUsed || 0), 0);

  const totalTokensInventory = inventory?.totalTokens || 0;
  const totalSubscriptionsInventory = inventory?.totalSubscriptions || 0;

  return {
    totalTokensInventory,
    availableTokens: Math.max(0, totalTokensInventory - allocatedTokens),
    allocatedTokens,
    totalTokensUsed,
    remainingAllocatedTokens: Math.max(0, allocatedTokens - totalTokensUsed),
    totalSubscriptionsInventory,
    availableSubscriptions: Math.max(0, totalSubscriptionsInventory - allocatedSubscriptions),
    allocatedSubscriptions,
    totalSubscriptionsUsed,
    remainingAllocatedSubscriptions: Math.max(0, allocatedSubscriptions - totalSubscriptionsUsed),
    activityBreakdown: mergeActivityUsage(baseActivities, usageMaps.universityActivityMap),
  };
}

function buildCourseStats({ courses, allocationByCourse, usageMaps, baseActivities }) {
  return courses.map((course) => {
    const courseId = course._id.toString();
    const allocated = allocationByCourse.get(courseId) || { TOKEN: 0, SUBSCRIPTION: 0 };
    const usage = usageMaps.usageByCourse.get(courseId) || { totalTokensUsed: 0, totalSubscriptionsUsed: 0 };

    return {
      courseId,
      courseName: course.name,
      teacherName: course.teacher ? `${course.teacher.nume} ${course.teacher.prenume}` : 'N/A',
      studentsCount: course.students?.length || 0,
      allocatedTokens: allocated.TOKEN,
      totalTokensUsed: usage.totalTokensUsed,
      remainingTokens: Math.max(0, allocated.TOKEN - usage.totalTokensUsed),
      allocatedSubscriptions: allocated.SUBSCRIPTION,
      totalSubscriptionsUsed: usage.totalSubscriptionsUsed,
      remainingSubscriptions: Math.max(0, allocated.SUBSCRIPTION - usage.totalSubscriptionsUsed),
      activityBreakdown: mergeActivityUsage(baseActivities, usageMaps.courseActivityMaps.get(courseId) || new Map()),
    };
  }).sort((left, right) => {
    if (right.totalTokensUsed !== left.totalTokensUsed) {
      return right.totalTokensUsed - left.totalTokensUsed;
    }
    return right.totalSubscriptionsUsed - left.totalSubscriptionsUsed;
  });
}

function buildStudentStats({ students, allocationByStudent, usageMaps, baseActivities }) {
  return students.map((student) => {
    const studentId = student._id.toString();
    const allocated = allocationByStudent.get(studentId) || { TOKEN: 0, SUBSCRIPTION: 0 };
    const usage = usageMaps.usageByStudent.get(studentId) || { totalTokensUsed: 0, totalSubscriptionsUsed: 0 };

    return {
      studentId,
      studentName: `${student.nume} ${student.prenume}`,
      email: student.email,
      allocatedTokens: allocated.TOKEN,
      totalTokensUsed: usage.totalTokensUsed,
      remainingTokens: Math.max(0, allocated.TOKEN - usage.totalTokensUsed),
      allocatedSubscriptions: allocated.SUBSCRIPTION,
      totalSubscriptionsUsed: usage.totalSubscriptionsUsed,
      remainingSubscriptions: Math.max(0, allocated.SUBSCRIPTION - usage.totalSubscriptionsUsed),
      activityBreakdown: mergeActivityUsage(baseActivities, usageMaps.studentActivityMaps.get(studentId) || new Map()),
    };
  }).sort((left, right) => {
    if (right.totalTokensUsed !== left.totalTokensUsed) {
      return right.totalTokensUsed - left.totalTokensUsed;
    }
    return right.totalSubscriptionsUsed - left.totalSubscriptionsUsed;
  });
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
    }

    await connectDB();

    const studentDestinationFilter = {
      $or: [
        { destination: 'STUDENT' },
        { destination: { $exists: false } },
        { destination: null },
      ],
    };

    const [activities, courses, students, resources, logs, inventory] = await Promise.all([
      Activity.find().sort({ createdAt: 1 }).select('title tokenCost subscriptionCost').lean(),
      Course.find(studentDestinationFilter)
        .populate('teacher', 'nume prenume email')
        .populate('students', '_id')
        .select('name teacher students destination')
        .lean(),
      User.find({ role: 'Student' }).select('nume prenume email').lean(),
      Resource.find().select('studentId courseId type quantity allocationScope').lean(),
      CourseActivityLog.find().select('studentId courseId activityId activityTitle tokenConsumed subscriptionConsumed').lean(),
      ResourceInventory.findOne().lean(),
    ]);

    const activitiesById = new Map(activities.map((activity) => [activity._id.toString(), activity]));
    const baseActivities = createZeroActivityMap(activities);
    const validCourseIds = new Set(courses.map((course) => course._id.toString()));
    const filteredResources = resources.filter((resource) => {
      if (!resource.courseId) {
        return true;
      }
      return validCourseIds.has(resource.courseId.toString());
    });
    const filteredLogs = logs.filter((log) => {
      if (!log.courseId) {
        return true;
      }
      return validCourseIds.has(log.courseId.toString());
    });

    const allocationByStudent = buildAllocationMap(filteredResources, (resource) => resource.studentId);
    const allocationByCourse = buildAllocationMap(filteredResources, (resource) => resource.courseId);
    const usageMaps = buildUsageMaps(filteredLogs, activitiesById);

    return NextResponse.json({
      universityStats: buildUniversityStats({
        inventory,
        resources: filteredResources,
        usageMaps,
        baseActivities,
      }),
      courseStats: buildCourseStats({
        courses,
        allocationByCourse,
        usageMaps,
        baseActivities,
      }),
      studentStats: buildStudentStats({
        students,
        allocationByStudent,
        usageMaps,
        baseActivities,
      }),
    });
  } catch (error) {
    console.error('Eroare statistici admin:', error);
    return NextResponse.json(
      { message: error?.message || 'Eroare interna la calculul statisticilor.' },
      { status: 500 },
    );
  }
}
