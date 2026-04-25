import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Student') {
      return NextResponse.json({ message: 'Doar studenții pot încărca teme.' }, { status: 403 });
    }

    const { courseId } = await params;
    const formData = await req.formData();
    const file = formData.get('file');
    const comment = formData.get('comment') || '';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'Fișierul este obligatoriu.' }, { status: 400 });
    }

    await connectDB();
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost găsit.' }, { status: 404 });
    }

    if (!course.assignments) {
      course.assignments = [];
    }

    if (!course.students.some(studentId => studentId.toString() === session.user.id)) {
      return NextResponse.json({ message: 'Trebuie să fii înscris la curs pentru a încărca tema.' }, { status: 403 });
    }

    // Upload la Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `courses/${courseId}/assignments`,
          public_id: `${session.user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    course.assignments.push({
      student: session.user.id,
      fileUrl: cloudinaryResult.secure_url,
      fileName: file.name,
      submittedAt: new Date(),
      comment,
    });

    await course.save();

    return NextResponse.json({ message: 'Tema încărcată cu succes.' }, { status: 201 });
  } catch (error) {
    console.error('Eroare încărcare temă:', error);
    return NextResponse.json({ message: 'Eroare internă la încărcare.' }, { status: 500 });
  }
}
