// utils/documentRetrieval.ts
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function retrieveRelevantChunks(
  query: string, 
  userId: string, 
  limit = 5,
  documentIds?: string[]
) {
  console.log("Starting document retrieval:", { query, userId, limit, documentIds });
  
  try {
    // Create embeddings using Azure OpenAI
    const embeddings = new AzureOpenAIEmbeddings({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION  || "2023-05-15",
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME || process.env.AZURE_RESOURCE_NAME,
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    });
    
    console.log("Generating query embedding...");
    const queryEmbedding = await embeddings.embedQuery(query);
    console.log("Query embedding generated successfully");
    
    // Use server client when running on server, browser client when running in browser
    const isServer = typeof window === 'undefined';
    const supabase = isServer ? await createServerClient() : createBrowserClient();
    
    // Get user's documents or filter by specified document IDs
    let documentsQuery = supabase
      .from("documents")
      .select("id")
      .eq("user_id", userId);
    
    // If specific document IDs are provided, filter to only those documents
    if (documentIds && documentIds.length > 0) {
      documentsQuery = documentsQuery.in("id", documentIds);
    }
    
    console.log("Fetching document IDs...");
    const { data: documentIdsData, error: docError } = await documentsQuery;
    
    if (docError) {
      console.error("Error fetching document IDs:", docError);
      return [];
    }
    
    console.log("Document IDs retrieved:", documentIdsData);
    
    if (!documentIdsData?.length) {
      console.log("No documents found for the user");
      return [];
    }
    
    // Perform similarity search
    console.log("Performing similarity search with RPC...");
    const { data: chunks, error: matchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        user_id: userId
      }
    );
    
    if (matchError) {
      console.error("Error in match_documents RPC:", matchError);
      return [];
    }
    
    console.log("Retrieved chunks:", chunks?.length || 0);
    return chunks || [];
  } catch (error) {
    console.error("Error in retrieveRelevantChunks:", error);
    return [];
  }
}