import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI } from '../utils/api';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Upload, File, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const UploadPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isAuthenticated) {
      toast.error('Please login to upload resumes');
      return;
    }

    // Validate file types
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'];
      return validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.zip');
    });

    if (validFiles.length !== acceptedFiles.length) {
      toast.error('Some files were skipped. Only PDF, DOCX, and ZIP files are allowed.');
    }

    if (validFiles.length === 0) return;

    // Initialize progress tracking
    const progress: UploadProgress[] = validFiles.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(progress);
    setIsUploading(true);

    try {
      await resumeAPI.upload(validFiles, (progressPercent) => {
        setUploadProgress(prev => prev.map(item => ({
          ...item,
          progress: progressPercent
        })));
      });

      // Mark all as completed
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'completed' as const,
        progress: 100
      })));

      toast.success(`Successfully uploaded ${validFiles.length} file(s)`);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Upload failed';
      toast.error(message);
      
      // Mark all as error
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'error' as const,
        error: message
      })));
    } finally {
      setIsUploading(false);
    }
  }, [isAuthenticated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const clearProgress = () => {
    setUploadProgress([]);
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Spinner size="sm" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Badge variant="info">{status}</Badge>;
      case 'completed':
        return <Badge variant="success">completed</Badge>;
      case 'error':
        return <Badge variant="error">error</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please login to upload resumes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be authenticated to access the upload functionality.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Upload Resumes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload PDF, DOCX files or ZIP archives containing multiple resumes
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary-600 dark:text-primary-400 font-medium">
                  Drop the files here...
                </p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports PDF, DOCX, and ZIP files (max 10MB each)
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Upload Tips:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• PDF and DOCX files will be parsed automatically</li>
                    <li>• ZIP files can contain multiple resumes</li>
                    <li>• PII (emails, phones) will be extracted and redacted for non-recruiters</li>
                    <li>• Files are processed with mock embeddings for semantic search</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Upload Progress</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearProgress}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.filename}
                        </p>
                        {item.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(item.status)}
                      {(item.status === 'uploading' || item.status === 'processing') && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};
