import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const FileUpload = ({ onUpload }: { onUpload: (data: any[]) => void }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const binaryStr = e.target?.result;
      if (file.name.endsWith('.xlsx')) {
        const wb = XLSX.read(binaryStr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        onUpload(data);
      } else {
        // Assume CSV
        Papa.parse(file as any, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => onUpload(results.data),
        });
      }
    };
    reader.readAsBinaryString(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  }});

  return (
    <div className="flex justify-center items-center h-80">
      <div 
        {...getRootProps()} 
        className={`w-full max-w-2xl p-16 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 ease-out flex flex-col items-center justify-center
          ${isDragActive ? 'border-indigo-500 bg-indigo-50 scale-105' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
      >
        <input {...getInputProps()} />
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <UploadCloud className="h-10 w-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          {isDragActive ? "Drop the file here..." : "Drag & drop your dataset"}
        </h3>
        <p className="text-sm text-slate-500">Supports .csv and .xlsx files</p>
      </div>
    </div>
  );
};
