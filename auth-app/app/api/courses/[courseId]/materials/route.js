import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Material from '@/models/Material';
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
    const comment = formData.get('comment') || '';
    const file = formData.get('file');

    if (!title || !file || typeof file === 'string') {
      return NextResponse.json({ message: 'Titlul și fișierul sunt obligatorii.' }, { status: 400 });
    }

    await connectDB();
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ message: 'Cursul nu a fost găsit.' }, { status: 404 });
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

    // Extrage filename fără extensie
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const sanitizedName = fileNameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Detectează tipul de fișier
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isDocument = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.rtf'].includes(fileExt);
    const resourceType = isDocument ? 'raw' : 'auto';

    const cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `courses/${courseId}/materials`,
          public_id: `${Date.now()}-${sanitizedName}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // Creeaza Material document
    const material = await Material.create({
      course: courseId,
      teacher: session.user.id,
      title,
      description,
      comment,
      fileUrl: cloudinaryResult.secure_url,
      fileName: file.name,
      uploadedAt: new Date(),
    });

    return NextResponse.json({ message: 'Material încărcat cu succes.', material }, { status: 201 });
  } catch (error) {
    console.error('Eroare încărcare material:', error);
    return NextResponse.json({ message: 'Eroare internă la încărcare.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Neautorizat.' }, { status: 401 });
    }

    const { courseId } = await params;
    const { materialId } = await req.json();

    if (!materialId) {
      return NextResponse.json({ message: 'Material ID este obligatoriu.' }, { status: 400 });
    }

    await connectDB();
    const material = await Material.findById(materialId);
    if (!material) {
      return NextResponse.json({ message: 'Materialul nu a fost găsit.' }, { status: 404 });
    }

    if (material.course.toString() !== courseId) {
      return NextResponse.json({ message: 'Materialul nu aparține acestui curs.' }, { status: 400 });
    }

    if (session.user.role === 'Profesor' && material.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Nu poți șterge materialul altui profesor.' }, { status: 403 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Profesor') {
      return NextResponse.json({ message: 'Nu ai permisiunea de a șterge materiale.' }, { status: 403 });
    }

    // Șterge din Cloudinary dacă URL-ul conține cloudinary
    if (material.fileUrl && material.fileUrl.includes('cloudinary')) {
      try {
        const urlParts = material.fileUrl.split('/');
        const publicId = `courses/${courseId}/materials/${urlParts[urlParts.length - 1].split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error('Eroare ștergere din Cloudinary:', error);
      }
    }

    await Material.findByIdAndDelete(materialId);

    return NextResponse.json({ message: 'Material șters cu succes.' }, { status: 200 });
  } catch (error) {
    console.error('Eroare ștergere material:', error);
    return NextResponse.json({ message: 'Eroare internă la ștergere.' }, { status: 500 });
  }
}
