import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Assignment from '@/models/Assignment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

function getCloudinaryAssetInfo(fileUrl) {
  if (!fileUrl || !fileUrl.includes('cloudinary.com')) {
    return null;
  }

  const uploadIndex = fileUrl.indexOf('/upload/');
  if (uploadIndex === -1) {
    return null;
  }

  const publicIdWithVersion = fileUrl.slice(uploadIndex + '/upload/'.length);
  const publicId = publicIdWithVersion.replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');
  const resourceType = fileUrl.includes('/raw/upload/') ? 'raw' : 'image';

  return { publicId, resourceType };
}

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Student') {
      return NextResponse.json({ message: 'Doar studentii pot incarca teme.' }, { status: 403 });
    }

    const { courseId } = await params;
    const formData = await req.formData();
    const file = formData.get('file');
    const comment = formData.get('comment') || '';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'Fisierul este obligatoriu.' }, { status: 400 });
    }

    await connectDB();
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost gasit.' }, { status: 404 });
    }

    if (!course.students.some((studentId) => studentId.toString() === session.user.id)) {
      return NextResponse.json({ message: 'Trebuie sa fii inscris la curs pentru a incarca tema.' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const sanitizedName = fileNameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');

    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isDocument = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.rtf'].includes(fileExt);
    const resourceType = isDocument ? 'raw' : 'auto';

    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `courses/${courseId}/assignments`,
          public_id: `${session.user.id}-${Date.now()}-${sanitizedName}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const assignment = await Assignment.create({
      course: courseId,
      student: session.user.id,
      fileUrl: cloudinaryResult.secure_url,
      fileName: file.name,
      submittedAt: new Date(),
      comment,
    });

    return NextResponse.json({ message: 'Tema incarcata cu succes.', assignment }, { status: 201 });
  } catch (error) {
    console.error('Eroare incarcare tema:', error);
    return NextResponse.json({ message: 'Eroare interna la incarcare.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Profesor') {
      return NextResponse.json({ message: 'Nu ai permisiunea de a sterge teme.' }, { status: 403 });
    }

    const { courseId } = await params;
    const { assignmentId } = await req.json();

    if (!assignmentId) {
      return NextResponse.json({ message: 'Assignment ID este obligatoriu.' }, { status: 400 });
    }

    await connectDB();

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost gasit.' }, { status: 404 });
    }

    if (session.user.role === 'Profesor' && course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Nu poti sterge teme pentru acest curs.' }, { status: 403 });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ message: 'Tema nu a fost gasita.' }, { status: 404 });
    }

    if (assignment.course.toString() !== courseId) {
      return NextResponse.json({ message: 'Tema nu apartine acestui curs.' }, { status: 400 });
    }

    const cloudinaryAsset = getCloudinaryAssetInfo(assignment.fileUrl);
    if (cloudinaryAsset) {
      try {
        await cloudinary.uploader.destroy(cloudinaryAsset.publicId, {
          resource_type: cloudinaryAsset.resourceType,
        });
      } catch (error) {
        console.error('Eroare stergere assignment din Cloudinary:', error);
      }
    }

    await Assignment.findByIdAndDelete(assignmentId);

    return NextResponse.json({ message: 'Tema a fost stearsa cu succes.' }, { status: 200 });
  } catch (error) {
    console.error('Eroare stergere tema:', error);
    return NextResponse.json({ message: 'Eroare interna la stergere.' }, { status: 500 });
  }
}
