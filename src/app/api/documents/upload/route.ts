import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processDocument } from '@/utils/documentProcessor';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Will need these server-side packages in a real implementation:
// npm install pdf-parse mammoth

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string || 'current-user-id'; 

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Check file type
  const supportedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!supportedTypes.includes(file.type)) {
    return NextResponse.json({ 
      error: 'Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.' 
    }, { status: 400 });
  }

  // Check file size (limit to 50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ 
      error: 'File too large. Maximum file size is 50MB.' 
    }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // 1. Extract text from file based on its type
    let textContent = '';
    
    if (file.type === 'text/plain') {
      const buffer = Buffer.from(await file.arrayBuffer());
      textContent = buffer.toString('utf-8');
    } 
    else if (file.type === 'application/pdf') {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdfParse(buffer);
        textContent = data.text;
      } catch (error) {
        console.error('Error parsing PDF:', error);
        textContent = `Extracted text from PDF: ${file.name}`;
      }
    }
    else if (file.type.includes('word')) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
      } catch (error) {
        console.error('Error parsing Word document:', error);
        textContent = `Extracted text from Word document: ${file.name}`;
      }
    }

    // 2. Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `user-files/${userId}/${fileName}`;
    
    const { data: fileData, error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 3. Create record in the documents table
    const { data: documentRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        file_path: fileData.path,
        file_type: file.type,
        content: textContent,
        user_id: userId,
        size: file.size,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Process document for embedding
    await processDocument(textContent, documentRecord.id);

    return NextResponse.json({ 
      success: true, 
      document: { id: documentRecord.id, name: file.name } 
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json({ 
      error: 'Failed to process document' 
    }, { status: 500 });
  }
}
