import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Activity from '@/models/Activity';
import CourseActivityLog from '@/models/CourseActivityLog';
import StudentResourceRequest from '@/models/StudentResourceRequest';
import { ensureDefaultActivities } from '@/lib/activityCatalog';
import { getStudentCourseResourceSnapshot } from '@/lib/courseResources';

async function getCourseContext(courseId, user) {
  const course = await Course.findById(courseId)
    .populate('teacher', 'nume prenume email')
    .populate('students', 'nume prenume email')
    .lean();

  if (!course) {
    return { error: NextResponse.json({ message: 'Cursul nu a fost gasit.' }, { status: 404 }) };
  }

  const isTeacher = user.role === 'Profesor' && course.teacher?._id.toString() === user.id;
  const isAdmin = user.role === 'Admin';
  const isStudent = user.role === 'Student';
  const enrolled = course.students.some((student) => student._id.toString() === user.id);

  if (isStudent && !enrolled) {
    return { error: NextResponse.json({ message: 'Nu esti inscris la acest curs.' }, { status: 403 }) };
  }

  return { course, isTeacher, isAdmin, isStudent, enrolled };
}

function formatRequests(items) {
  return items.map((item) => ({
    _id: item._id.toString(),
    type: item.type,
    quantity: item.quantity,
    reason: item.reason,
    status: item.status,
    adminRequestId: item.adminRequestId ? item.adminRequestId.toString() : null,
    forwardedAt: item.forwardedAt,
    rejectedAt: item.rejectedAt,
    createdAt: item.createdAt,
    student: item.studentId ? {
      _id: item.studentId._id.toString(),
      nume: item.studentId.nume,
      prenume: item.studentId.prenume,
      email: item.studentId.email,
    } : null,
  }));
}

function buildFallbackAiResponse(activity, prompt, course) {
  return [
    `Activitate: ${activity.title}`,
    `Curs: ${course.name}`,
    '',
    'Raspuns demonstrativ:',
    `Am primit cerinta: "${prompt}".`,
    `Pe baza activitatii "${activity.title}", poti continua prin a structura cerinta in pasi mici, a defini clar obiectivul si a valida rezultatul final in contextul cursului.`,
  ].join('\n');
}

async function generateOpenAiResponse(activity, prompt, course) {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackAiResponse(activity, prompt, course);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: `Curs: ${course.name}\nActivitate: ${activity.title}\nPrompt student: ${prompt}\nRaspunde concis si util in limba romana.`,
      }),
    });

    if (!response.ok) {
      return buildFallbackAiResponse(activity, prompt, course);
    }

    const data = await response.json();
    return data.output_text || buildFallbackAiResponse(activity, prompt, course);
  } catch (error) {
    console.error('OpenAI fallback triggered:', error.message);
    return buildFallbackAiResponse(activity, prompt, course);
  }
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
  }

  await connectDB();
  const { courseId } = await params;
  const context = await getCourseContext(courseId, session.user);
  if (context.error) {
    return context.error;
  }

  await ensureDefaultActivities();

  const activities = await Activity.find().sort({ createdAt: 1 }).lean();
  const payload = {
    activities: activities.map((activity) => ({
      _id: activity._id.toString(),
      title: activity.title,
      description: activity.description,
      taskPrompt: activity.taskPrompt,
      tokenCost: activity.tokenCost || 0,
      subscriptionCost: activity.subscriptionCost || 0,
      executionType: activity.executionType || 'AI',
    })),
  };

  if (context.isStudent) {
    const [summary, requests] = await Promise.all([
      getStudentCourseResourceSnapshot(context.course, session.user.id),
      StudentResourceRequest.find({
        courseId,
        studentId: session.user.id,
      }).sort({ createdAt: -1 }).populate('studentId', 'nume prenume email').lean(),
    ]);

    payload.studentSummary = summary;
    payload.studentRequests = formatRequests(requests);
  }

  if (context.isTeacher || context.isAdmin) {
    const requests = await StudentResourceRequest.find({ courseId })
      .sort({ createdAt: -1 })
      .populate('studentId', 'nume prenume email')
      .lean();

    payload.professorRequests = formatRequests(requests);
  }

  return NextResponse.json(payload);
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
  }

  await connectDB();
  const { courseId } = await params;
  const context = await getCourseContext(courseId, session.user);
  if (context.error) {
    return context.error;
  }

  if (!context.isStudent) {
    return NextResponse.json({ message: 'Doar studentii pot folosi acest panou.' }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action;
  const summary = await getStudentCourseResourceSnapshot(context.course, session.user.id);

  if (action === 'executeActivity') {
    const activity = await Activity.findById(body.activityId).lean();
    if (!activity) {
      return NextResponse.json({ message: 'Activitatea nu a fost gasita.' }, { status: 404 });
    }

    const tokenCost = activity.tokenCost || 0;
    const subscriptionCost = activity.subscriptionCost || 0;
    if (summary.remainingTokens < tokenCost) {
      return NextResponse.json({ message: 'Nu mai ai suficiente tokenuri pentru aceasta activitate.' }, { status: 400 });
    }
    if (summary.remainingSubscriptions < subscriptionCost) {
      return NextResponse.json({ message: 'Nu mai ai suficiente abonamente pentru aceasta activitate.' }, { status: 400 });
    }

    const prompt = body.prompt?.trim() || activity.taskPrompt;
    const responseText = activity.executionType === 'VPS_PLACEHOLDER'
      ? `Placeholder VPS pentru "${activity.title}". Aici va fi integrat fluxul de acces la VPS/abonament. Cerinta primita: ${prompt || 'fara cerinta suplimentara'}.`
      : await generateOpenAiResponse(activity, prompt, context.course);

    await CourseActivityLog.create({
      courseId,
      studentId: session.user.id,
      activityId: activity._id,
      activityTitle: activity.title,
      mode: activity.executionType === 'VPS_PLACEHOLDER' ? 'VPS_PLACEHOLDER' : 'AI',
      prompt,
      response: responseText,
      tokenConsumed: tokenCost,
      subscriptionConsumed: subscriptionCost,
    });
  } else {
    return NextResponse.json({ message: 'Actiune necunoscuta.' }, { status: 400 });
  }

  const [updatedSummary, studentRequests] = await Promise.all([
    getStudentCourseResourceSnapshot(context.course, session.user.id),
    StudentResourceRequest.find({
      courseId,
      studentId: session.user.id,
    }).sort({ createdAt: -1 }).populate('studentId', 'nume prenume email').lean(),
  ]);

  return NextResponse.json({
    message: 'Actiunea a fost procesata cu succes.',
    studentSummary: updatedSummary,
    studentRequests: formatRequests(studentRequests),
    latestLog: updatedSummary.logs[0] || null,
  });
}
