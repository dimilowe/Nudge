import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string | undefined) => void;
  label?: string;
  aspectRatio?: string;
}

export function ImageUpload({ value, onChange, label = "Upload Image", aspectRatio = "aspect-square" }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {value ? (
        <Card className="relative overflow-hidden group">
          <div className={`${aspectRatio} w-full relative`}>
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                onClick={handleClick}
                variant="secondary"
                size="sm"
                data-testid="button-change-image"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change
              </Button>
              <Button
                onClick={handleRemove}
                variant="destructive"
                size="sm"
                data-testid="button-remove-image"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`${aspectRatio} w-full border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragging
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
              : 'border-muted-foreground/25 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/5'
          }`}
          data-testid="drop-zone-upload"
        >
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Drop your image here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse (max 5MB)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF, or WebP
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
