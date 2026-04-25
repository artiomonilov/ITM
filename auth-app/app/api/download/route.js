import { NextResponse } from 'next/server';

function normalizeDuplicateExtensions(value) {
  return value
    .replace(/\.pdf\.pdf/gi, '.pdf')
    .replace(/\.docx\.docx/gi, '.docx')
    .replace(/\.xlsx\.xlsx/gi, '.xlsx')
    .replace(/\.pptx\.pptx/gi, '.pptx');
}

function addCloudinaryAttachment(url) {
  if (!url.includes('cloudinary.com') || url.includes('fl_attachment')) {
    return url;
  }

  return url.replace('/upload/', '/upload/fl_attachment/');
}

function swapCloudinaryResourceType(url) {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }

  if (url.includes('/raw/upload/')) {
    return url.replace('/raw/upload/', '/image/upload/');
  }

  return url;
}

function buildCandidateUrls(originalUrl) {
  const normalizedUrl = normalizeDuplicateExtensions(originalUrl);
  const swappedOriginalUrl = swapCloudinaryResourceType(originalUrl);
  const swappedNormalizedUrl = swapCloudinaryResourceType(normalizedUrl);
  const candidates = [
    originalUrl,
    addCloudinaryAttachment(originalUrl),
    swappedOriginalUrl,
    addCloudinaryAttachment(swappedOriginalUrl),
    normalizedUrl,
    addCloudinaryAttachment(normalizedUrl),
    swappedNormalizedUrl,
    addCloudinaryAttachment(swappedNormalizedUrl),
  ];

  return [...new Set(candidates.filter(Boolean))];
}

async function fetchFirstAvailable(urls) {
  let lastError = new Error('Fisierul nu a putut fi descarcat.');

  for (const url of urls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status} pentru ${url}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
    }
  }

  throw lastError;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');
  const fileName = searchParams.get('name');

  if (!fileUrl) {
    return NextResponse.json({ message: 'URL lipsa.' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(fileUrl);
    const candidateUrls = buildCandidateUrls(decodedUrl);
    const response = await fetchFirstAvailable(candidateUrls);
    const buffer = await response.arrayBuffer();

    const fallbackName = response.headers
      .get('content-disposition')
      ?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];

    const safeFileName = normalizeDuplicateExtensions(fileName || fallbackName || 'download')
      .replace(/[^a-zA-Z0-9._\- ]/g, '');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Download error:', error.message);
    return NextResponse.json(
      { message: `Eroare: ${error.message}` },
      { status: 500 }
    );
  }
}
