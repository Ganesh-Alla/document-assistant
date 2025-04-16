import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Helper function to create server-side Supabase client
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET: Retrieve documents for current user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'current-user-id'; // In production, get this from authentication
  
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return NextResponse.json({ documents: data });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST: Create a new document record in the database
export async function POST(request: Request) {
  const { documentInfo, userId = 'current-user-id' } = await request.json();
  
  if (!documentInfo) {
    return NextResponse.json({ error: 'Document information is required' }, { status: 400 });
  }
  
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...documentInfo,
        user_id: userId
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({ document: data });
  } catch (error) {
    console.error('Error creating document record:', error);
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
  }
}

// DELETE: Remove a document
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');
  const userId = searchParams.get('userId') || 'current-user-id'; // In production, get this from authentication
  
  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }
  
  try {
    const supabase = createServerSupabaseClient();
    
    // First, check if the document belongs to the user
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_path')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    if (!document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }
    
    // Delete document embeddings
    const { error: embeddingsError } = await supabase
      .from('embeddings')
      .delete()
      .eq('document_id', documentId);
      
    if (embeddingsError) throw embeddingsError;
    
    // Delete the file from storage
    if (document.file_path) {
      const { error: storageError } = await supabase
        .storage
        .from('documents')
        .remove([document.file_path]);
        
      if (storageError) throw storageError;
    }
    
    // Delete the document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
      
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
