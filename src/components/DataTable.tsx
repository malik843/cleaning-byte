import { useState } from 'react';
import type { ProcessedRow } from '../lib/Cleaner';
import { AlertCircle, CheckCircle, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTable = ({ data, activeColumns }: { data: ProcessedRow[], activeColumns: string[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;

  const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="bg-white shadow-sm rounded-xl border border-slate-200 flex flex-col w-full overflow-hidden">
      {/* Table Container with custom scrollbar classes */}
      <div className="overflow-auto max-h-[650px] custom-scrollbar w-full relative">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 whitespace-nowrap sticky top-0 z-20">
            <tr>
              <th className="px-6 py-4 sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_rgba(226,232,240,1)]">Row</th>
              <th className="px-6 py-4 sticky left-[72px] bg-slate-50 z-30 shadow-[1px_0_0_rgba(226,232,240,1)]">Status</th>
              {activeColumns.map(col => (
                 <th key={col} className="px-6 py-4 font-semibold text-slate-700">{col}</th>
              ))}
              <th className="px-6 py-4 min-w-[200px]">Issues Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((row) => (
              <tr key={row.rowId} className="hover:bg-slate-50 transition-colors whitespace-nowrap group">
                <td className="px-6 py-4 font-medium text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50 shadow-[1px_0_0_rgba(226,232,240,1)] z-10">{row.rowId}</td>
                <td className="px-6 py-4 sticky left-[72px] bg-white group-hover:bg-slate-50 shadow-[1px_0_0_rgba(226,232,240,1)] z-10">
                  {row.errors.length > 0 || row.isDuplicate ? (
                    <span className="flex items-center text-rose-600 bg-rose-50 px-2 py-1.5 rounded-full text-xs font-bold w-max border border-rose-100 shadow-sm">
                      {row.isDuplicate ? <Copy className="w-3.5 h-3.5 mr-1" /> : <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                      {row.isDuplicate ? "Duplicate" : "Invalid"}
                    </span>
                  ) : (
                    <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-full text-xs font-bold w-max border border-emerald-100 shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Clean
                    </span>
                  )}
                </td>
                {activeColumns.map(col => (
                    <td key={col} className="px-6 py-4 text-slate-700 min-w-[150px] whitespace-normal break-words">
                        <DataCell original={row.original[col]} suggested={row.suggested[col]} />
                    </td>
                ))}
                <td className="px-6 py-4 max-w-xs text-rose-500 text-xs whitespace-normal break-words font-medium">
                   <div className="flex flex-col gap-1">
                     {row.errors.map((err, i) => (
                       <span key={i} className="line-clamp-2" title={err}>• {err}</span>
                     ))}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {data.length > 0 && (
         <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
               Showing <strong className="text-slate-800">{(currentPage - 1) * rowsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * rowsPerPage, data.length)}</strong> of <strong className="text-slate-800">{data.length}</strong> results
            </span>
            
            <div className="flex space-x-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="p-2 border border-slate-300 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
               >
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <div className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 bg-white rounded-lg shadow-sm">
                  Page {currentPage} of {totalPages}
               </div>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="p-2 border border-slate-300 bg-white rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
               >
                 <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      )}
    </div>
  );
};

const DataCell = ({ original, suggested }: { original: string, suggested: string }) => {
  const isChanged = original !== suggested;
  
  if (!isChanged) return <span>{original || '-'}</span>;

  return (
    <div className="flex flex-col gap-0.5">
       <span className="text-rose-400 line-through text-xs font-medium">{original || '(empty)'}</span>
       <span className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded w-max shadow-sm">{suggested}</span>
    </div>
  );
};
