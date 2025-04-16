// app/chat/page.tsx
'use client'

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  user_id: string;
  size: number;
  created_at: string;
}

export default function ChatPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();
  
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    body: {
      userId: userId, // Get this from auth
      selectedDocuments: selectedDocuments,
    },
    onResponse: (response) => {
      console.log("Chat response started", response);
    },
    onFinish: (message) => {
      console.log("Chat response finished", message);
    },
  });

  const supabase = createClient();
  
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        
      if (error) {
        throw error;
      }
      
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };
  
  const isChatLoading = status === 'streaming' || status === 'submitted';
  
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Smart Document Assistant</h1>
        <Link href="/documents" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Manage Documents
        </Link>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Document Sidebar */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Your Documents</h2>
            <p className="text-sm text-gray-500 mt-1">Select documents to chat about</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <p className="text-gray-500">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-gray-500 mb-4">No documents found</p>
                <Link href="/documents" className="text-blue-500 hover:underline">
                  Upload your first document
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <label className="flex items-start p-2 rounded hover:bg-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 mr-2"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                      />
                      <div>
                        <span className="block font-medium truncate">{doc.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-3 border-t">
            <p className="text-xs text-gray-500 text-center">
              {selectedDocuments.length === 0 
                ? "No documents selected" 
                : `${selectedDocuments.length} document${selectedDocuments.length > 1 ? "s" : ""} selected`}
            </p>
          </div>
        </div>
        
        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <h2 className="text-2xl font-bold mb-2">Start chatting with your documents</h2>
                <p className="text-gray-500 max-w-md mb-8">
                  Select documents from the sidebar and ask questions about their content.
                  The AI will analyze them and provide relevant answers.
                </p>
                {selectedDocuments.length === 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-blue-800">Select at least one document to get started</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-3xl p-3 rounded-lg ${
                        message.role === "user" 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 max-w-3xl p-3 rounded-lg">
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-75" />
                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex">
              <input
                className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={input}
                onChange={handleInputChange}
                placeholder={selectedDocuments.length === 0 
                  ? "Select documents from the sidebar first..." 
                  : "Ask about your documents..."}
                disabled={selectedDocuments.length === 0 || isChatLoading}
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-r ${
                  selectedDocuments.length === 0 || isChatLoading
                    ? "bg-gray-300 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
                disabled={selectedDocuments.length === 0 || isChatLoading}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}