import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900">
            Smart Document Assistant
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Organize, analyze, and chat with your documents using AI-powered insights
          </p>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Document Management</CardTitle>
              <CardDescription>
                Upload, organize, and search through your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href="/documents">Go to Documents</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">AI Chat</CardTitle>
              <CardDescription>
                Chat with your documents using advanced AI capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <circle cx="9" cy="10" r="1" />
                    <circle cx="12" cy="10" r="1" />
                    <circle cx="15" cy="10" r="1" />
                  </svg>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href="/chat">Go to Chat</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-slate-500">
          <p> {new Date().getFullYear()} Smart Document Assistant. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}