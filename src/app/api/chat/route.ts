// app/api/chats/route.ts
import { createClient } from "@/lib/supabase/server";
import { retrieveRelevantChunks } from "@/utils/documentRetrieval";
import { createAzure } from "@ai-sdk/azure";
import { smoothStream, streamText, createDataStreamResponse } from "ai";
import { NextResponse, type NextRequest } from "next/server";

// Configuration values from your Azure OpenAI resource
const config = {
  apiKey: process.env.AZURE_OPENAI_API_CHAT_KEY || "",
  resourceName: process.env.AZURE_RESOURCE_NAME || "aryat-m3dnuvzf-eastus2",
  deployment: process.env.AZURE_OPENAI_API_CHAT_DEPLOYMENT_NAME || "gpt-4o",
  apiVersion: process.env.AZURE_OPENAI_API_CHAT_VERSION || "2025-01-01-preview",
};

// Create the Azure OpenAI provider
const azure = createAzure({
  apiKey: config.apiKey,
  resourceName: config.resourceName,
  apiVersion: config.apiVersion,
});

// Define message type
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, selectedDocuments = [] } = await req.json();
        // Get the last user message as the prompt
        const latestMessage = messages[messages.length - 1].content;

        if (!latestMessage) {
          return NextResponse.json(
            { error: "No user message found" },
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          )
        }

    // Check if documents are selected
    if (selectedDocuments.length === 0) {
      return NextResponse.json(
        { error: 'No documents selected. Please select at least one document to chat about.' },
        { 
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

 // Retrieve relevant document chunks
  const relevantChunks = await retrieveRelevantChunks(
    latestMessage,
    userId,
    5,
    selectedDocuments
  );



  // If no relevant chunks found
  if (relevantChunks.length === 0) {
    const supabase = await createClient();
    
    // Get document names for the response
    const { data: documentNames } = await supabase
      .from('documents')
      .select('name')
      .in('id', selectedDocuments);
    
    const docList = documentNames?.map(doc => `- ${doc.name}`).join("\n") || "";
    
    // Create system message for no relevant information
    const systemMessage = `You are a helpful assistant that answers questions based on the user's documents.
    I couldn't find relevant information in these documents to answer your question:
    
    ${docList}
    
    Please try rephrasing your question or selecting different documents.`;
    
    // Stream the response using createDataStreamResponse
    return createDataStreamResponse({
      execute: dataStream => {
        const result = streamText({
          model: azure(config.deployment),
          system: systemMessage,
          messages: [
            ...messages.map((message: ChatMessage) => ({ 
              role: message.role, 
              content: message.content
            }))
          ],
          experimental_transform: smoothStream(),
          maxTokens: 1000,
          temperature: 0.7,
          onError: ({ error }) => {
            console.error("Streaming error:", error);
          }
        });
        
        result.mergeIntoDataStream(dataStream);
      },
      onError: error => {
        return error instanceof Error ? error.message : String(error);
      }
    });
  }

  // Build context from relevant chunks
  const context = relevantChunks.map((chunk: { content: string }) => chunk.content).join("\n\n");


    // Prepare system message with context
    const systemMessage = `
You are an intelligent and trustworthy assistant designed to help users by answering questions based strictly on the provided document context. 
Use only the information within the given context to generate responses. 
If the answer isn't available in the context, respond with "I don't know based on the provided information" and do not guess or fabricate details.

Context:
${context}
`;

    // Stream the response using createDataStreamResponse
    return createDataStreamResponse({
      execute: dataStream => {
        // Create a mapping of chunk indexes to their content for later reference
        const chunkSources = relevantChunks.map((chunk: { content: string, metadata?: unknown, document_id?: string }, index: number) => ({
          id: `chunk-${index + 1}`,
          content: chunk.content,
          metadata: chunk.metadata || {},
          documentId: chunk.document_id || '',
          chunkIndex: index + 1
        }));
        
        // Stream the text response
        const result = streamText({
          model: azure(config.deployment),
          system: systemMessage,
          messages: [
            ...messages.map((message: ChatMessage) => ({ 
              role: message.role, 
              content: message.content
            }))
          ],
          experimental_transform: smoothStream(),
          maxTokens: 1000,
          temperature: 0.7,
          onFinish: () => {
            // When the response is complete, add the sources as message annotations
            // Based on the example message structure
            dataStream.writeMessageAnnotation({
              sources: chunkSources
            });
          },
          onError: ({ error }) => {
            console.error("Streaming error:", error);
          }
        });
        
        result.mergeIntoDataStream(dataStream);
      },
      onError: error => {
        return error instanceof Error ? error.message : String(error);
      }
    });
  } catch (error: unknown) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: "Failed to process your request", details: errorMessage },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}