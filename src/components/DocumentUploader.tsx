'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileIcon, UploadIcon, XIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
}

export default function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const { userId } = useAuth()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB max
  })

  const uploadFiles = async () => {
    if (files.length === 0) return
    if (!userId) {
      toast.error('You must be logged in to upload documents')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          // Create form data for server upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          
          // Send to server-side API for processing
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload document');
          }

          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100))
        } catch (error) {
          console.error('Error uploading file:', error)
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      toast.success('Documents uploaded successfully')
      
      // Clear files after upload
      setFiles([])
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      toast.error('An error occurred during upload')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (fileType: string) => {
    // Return different icons based on file type
    if (fileType.includes('pdf')) {
      return <FileIcon className="h-4 w-4 text-red-500" />
    } 
    
    if (fileType.includes('word')) {
      return <FileIcon className="h-4 w-4 text-blue-500" />
    } 
    
    if (fileType.includes('text')) {
      return <FileIcon className="h-4 w-4 text-gray-500" />
    }
    
    return <FileIcon className="h-4 w-4" />
  }

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/20 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <UploadIcon className="h-8 w-8 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm font-medium">Drop files to upload</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drag & drop files here</p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </>
          )}
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={file.name} 
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="flex items-center">
                  {getFileIcon(file.type)}
                  <span className="ml-2 truncate max-w-[200px]">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  aria-label="Remove file"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2 w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
          
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Processing...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}
