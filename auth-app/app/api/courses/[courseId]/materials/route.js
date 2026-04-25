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
    if (!session) {
      return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
    }

    const { courseId } = await params;
    const formData = await req.formData();
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const file = formData.get('file');

    if (!title || !file || typeof file === 'string') {
      return NextResponse.json({ message: 'Titlul și fișierul sunt obligatorii.' }, { status: 400 });
    }

    await connectDB();
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost găsit.' }, { status: 404 });
    }

    if (!course.materials) {
      course.materials = [];
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Profesor') {
      return NextResponse.json({ message: 'Nu ai permisiunea de a încărca materiale.' }, { status: 403 });
    }

    if (session.user.role === 'Profesor' && course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Nu poți încărca materiale pentru acest curs.' }, { status: 403 });
    }

    // Upload la Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `courses/${courseId}/materials`,
          public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    course.materials.push({
      title,
      description,
      fileUrl: cloudinaryResult.secure_url,
      uploadedAt: new Date(),
      uploadedBy: session.user.id,
    });

    await course.save();

    return NextResponse.json({ message: 'Material încărcat cu succes.' }, { status: 201 });
  } catch (error) {
    console.error('Eroare încărcare material:', error);
    return NextResponse.json({ message: 'Eroare internă la încărcare.' }, { status: 500 });
  }
}
