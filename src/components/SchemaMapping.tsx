import type { FieldType } from '../lib/SchemaInferencer';
import { ArrowRight, Settings2 } from 'lucide-react';

export const SchemaMapping = ({ 
  headers, 
  schemaMap, 
  setSchemaMap,
  onConfirm 
}: { 
  headers: string[], 
  schemaMap: Record<string, FieldType>,
  setSchemaMap: (map: Record<string, FieldType>) => void,
  onConfirm: () => void
}) => {
  
  const handleTypeChange = (col: string, type: FieldType) => {
    setSchemaMap({ ...schemaMap, [col]: type });
  };

  const options: FieldType[] = ['NAME', 'EMAIL', 'DATE', 'ID', 'STRING', 'NUMBER', 'PHONE', 'FINGERPRINT', 'IGNORE'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
           <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
             <Settings2 className="w-5 h-5" />
           </div>
           <h3 className="text-xl font-bold text-slate-800 tracking-tight">Map Columns to Data Types</h3>
        </div>
        <button 
          onClick={onConfirm}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          Proceed to Clean Data <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
      <div className="p-6">
        <p className="text-base text-slate-600 mb-8 max-w-3xl">
           We've automatically analyzed your dataset and assigned data cleaning rules to each column. Please review and adjust them below if our guess was incorrect. Columns marked as <span className="font-semibold px-2 py-1 bg-slate-100 rounded text-slate-800 border border-slate-200 text-xs">IGNORE</span> will be stripped from the final dataset.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
           {headers.map(col => (
             <div key={col} className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
               <label className="block text-sm font-bold text-slate-800 mb-2 truncate" title={col}>{col}</label>
               <select 
                 value={schemaMap[col] || 'STRING'}
                 onChange={(e) => handleTypeChange(col, e.target.value as FieldType)}
                 className="w-full border border-slate-300 rounded-lg text-sm bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
               >
                 {options.map(opt => (
                   <option key={opt} value={opt}>{opt}</option>
                 ))}
               </select>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
