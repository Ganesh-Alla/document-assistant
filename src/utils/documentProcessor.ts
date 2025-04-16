// utils/documentProcessor.ts

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function processDocument(content: string, documentId: string) {
  // Split text into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await textSplitter.createDocuments([content]);
  
  // Create embeddings using Azure OpenAI
  const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2023-05-15",
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  });
  
  // Use server client when running on server, browser client when running in browser
  const isServer = typeof window === 'undefined';
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  // Store embeddings in Supabase
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const embedding = await embeddings.embedQuery(doc.pageContent);
    
    const { error: embeddingError } = await supabase.from("embeddings").insert({
      document_id: documentId,
      content: doc.pageContent,
      embedding,
      chunk_index: i,
    });
    
    if (embeddingError) {
      console.error("Error inserting embedding:", embeddingError);
      throw embeddingError;
    }
  }
}

// Function to extract text from different file types
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  let text = '';

  try {
    // Plain text files
    if (fileType === 'text/plain') {
      text = await file.text();
      return text;
    }
    
    // PDFs
    if (fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Using pdf-parse for PDF extraction
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    }
    
    // Word documents
    if (fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Using mammoth for Word document extraction
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Function to determine if a file type is supported
export function isSupportedFileType(fileType: string): boolean {
  const supportedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  return supportedTypes.includes(fileType);
}