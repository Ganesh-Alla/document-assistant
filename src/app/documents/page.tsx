'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DocumentUploader from '@/components/DocumentUploader'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  user_id: string;
  size: number;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const { user, userId, loading: authLoading, signOut } = useAuth()

  const fetchDocuments = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (userId) {
      fetchDocuments()
    }
  }, [userId, authLoading, user, router, fetchDocuments])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('text')) return '📃'
    return '📎'
  }

  const confirmDelete = (document: Document) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!documentToDelete) return
    
    try {
      toast.promise(
        async () => {

          // Step 1: Delete the document record from the database
          const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentToDelete.id)
                    
          if (dbError) {
            console.error('Error deleting document record:', dbError)
            throw dbError
          }

          // Step 2: Delete the file from storage
          if (documentToDelete.file_path) {
            const { error: storageError } = await supabase
              .storage
              .from('documents')
              .remove([documentToDelete.file_path])
            
            if (storageError) {
              console.error('Error deleting file from storage:', storageError)
              throw storageError
            }
          }

          // Step 3: Delete the embeddings from the database
          const { error: embeddingError } = await supabase
            .from('embeddings')
            .delete()
            .eq('document_id', documentToDelete.id)
            
          if (embeddingError) {
            console.error('Error deleting embeddings:', embeddingError)
            throw embeddingError
          }
          
          // Step 4: Refresh the documents list and reset state
          fetchDocuments()
          setDeleteDialogOpen(false)
          setDocumentToDelete(null)
        },
        {
          loading: 'Deleting document...',
          success: 'Document deleted successfully',
          error: 'Failed to delete document',
        }
      )
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleDownload = (document: Document) => {
    // In a real app, implement download functionality
    toast.info(`Downloading ${document.name}...`)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out')
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-slate-500 mt-1">Manage your documents and use them in chats</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/chat">Go to Chat</Link>
          </Button>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>All your uploaded documents</CardDescription>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div key="skeleton-1" className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  <div key="skeleton-2" className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  <div key="skeleton-3" className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-slate-500 mb-4">You haven&apos;t uploaded any documents yet</p>
                  <p className="text-sm text-slate-400">
                    Upload your first document using the form on the right
                  </p>
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of your uploaded documents</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <span className="mr-2">{getFileTypeIcon(doc.file_type)}</span>
                            <span className="truncate max-w-[200px]">{doc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {doc.file_type.split('/')[1]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatBytes(doc.size)}</TableCell>
                        <TableCell>{format(new Date(doc.created_at), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDownload(doc)}
                            >
                              Download
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => confirmDelete(doc)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Add new documents to your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploader onUploadComplete={fetchDocuments} />
            </CardContent>
            <CardFooter className="flex justify-between text-xs text-slate-500">
              <p>Supported: PDF, DOC, DOCX, TXT</p>
              <p>Max size: 50MB</p>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
