import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Fingerprint, FolderUp } from 'lucide-react';

export const BiometricUpload = ({ onUpload }: { onUpload: (files: File[]) => void }) => {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop, 
      accept: {
        'image/jpeg': ['.jpeg', '.jpg'],
        'image/png': ['.png'],
        'image/bmp': ['.bmp']
      }
  });

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          // Filter to only reasonable image files to prevent picking up hidden files
          const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.name.endsWith('.bmp'));
          onUpload(validFiles);
      }
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div 
        {...getRootProps()} 
        className={`w-full max-w-2xl p-16 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-300 ease-out flex flex-col items-center justify-center
          ${isDragActive ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
      >
        <input {...getInputProps()} />
        <div className="p-4 bg-white rounded-full shadow-sm mb-5 border border-slate-100">
          <Fingerprint className={`h-12 w-12 ${isDragActive ? 'text-indigo-600' : 'text-slate-400 animate-pulse'}`} />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-800 mb-2">
          {isDragActive ? "Drop biometric array here..." : "Drag & drop biometric assets"}
        </h3>
        <p className="text-sm font-medium text-slate-500">Exclusively bound to Fingerprint NFIQ Modality. Supports .jpg, .png, and .bmp</p>
      </div>

      <div className="flex items-center w-full max-w-sm my-2 object-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="px-4 text-xs font-bold text-slate-400 tracking-widest uppercase">OR BATCH UPLOAD</span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      <input 
         type="file" 
         ref={folderInputRef}
         onChange={handleFolderChange}
         className="hidden" 
         // @ts-ignore
         webkitdirectory="" 
         directory="" 
      />
      
      <button 
         onClick={() => folderInputRef.current?.click()}
         className="flex items-center px-8 py-3.5 bg-white border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 shadow-sm text-slate-800 font-extrabold rounded-2xl transition-all active:scale-95"
      >
         <FolderUp className="w-5 h-5 mr-3 text-slate-400" />
         Ingest Entire Directory...
      </button>
    </div>
  );
};
