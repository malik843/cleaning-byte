import { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { SchemaMapping } from './components/SchemaMapping';
import { CleaningPreferences } from './components/CleaningPreferences';
import { MetricsDashboard } from './components/MetricsDashboard';
import { BiometricUpload } from './components/BiometricUpload';
import { BiometricDashboard } from './components/BiometricDashboard';
import { inferSchema } from './lib/SchemaInferencer';
import type { CleaningConfig } from './lib/CleaningEngineConfig';
import type { FieldType } from './lib/SchemaInferencer';
import type { ProcessedRow } from './lib/Cleaner';
import { BarChart3, Download, RefreshCcw, FileWarning, Copy, CheckCircle, TableProperties, PieChart as PieChartIcon, Fingerprint, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

function App() {
  const [appMode, setAppMode] = useState<'SELECT' | 'DATASET' | 'BIOMETRIC'>('SELECT');
  
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [schemaMap, setSchemaMap] = useState<Record<string, FieldType>>({});
  const [schemaConfirmed, setSchemaConfirmed] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedRow[] | null>(null);
  const [activeTab, setActiveTab] = useState<'DATA' | 'METRICS'>('DATA');

  const [rawBiometrics, setRawBiometrics] = useState<File[] | null>(null);

  const handleUpload = (data: any[]) => {
    if (!data || data.length === 0) return;
    setRawData(data);
    const extractedHeaders = Object.keys(data[0]);
    setHeaders(extractedHeaders);
    setSchemaMap(inferSchema(extractedHeaders));
  };

  const handleConfirmMapping = () => {
    setSchemaConfirmed(true);
  };
  
  const handleExecutePipeline = (_config: CleaningConfig, processed: ProcessedRow[]) => {
      setProcessedData(processed);
      setActiveTab('DATA');
  };

  const activeColumns = headers.filter(h => schemaMap[h] !== 'IGNORE');

  const handleExport = () => {
    if (!processedData) return;
    const exportData = processedData
      .filter(r => !r.isDuplicate)
      .map(r => {
         const out: any = {};
         activeColumns.forEach(c => out[c] = r.suggested[c]);
         return out;
      });
      
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CleanedData");
    XLSX.writeFile(wb, "Cleaned_Dataset.xlsx");
  };

  const stats = useMemo(() => {
    if (!processedData) return null;
    return {
      total: processedData.length,
      issues: processedData.filter(r => r.errors.length > 0).length,
      duplicates: processedData.filter(r => r.isDuplicate).length,
      clean: processedData.filter(r => r.errors.length === 0 && !r.isDuplicate).length
    };
  }, [processedData]);

  const reset = () => {
    setRawData(null);
    setProcessedData(null);
    setHeaders([]);
    setSchemaMap({});
    setSchemaConfirmed(false);
    setActiveTab('DATA');
    setRawBiometrics(null);
    setAppMode('SELECT');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
               <RefreshCcw className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 cursor-pointer" onClick={reset}>CleaningByte</h1>
          </div>
          {(rawData || rawBiometrics || appMode !== 'SELECT') && (
            <div className="flex space-x-3">
              <button 
                onClick={reset}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition active:scale-95"
              >
                Start Over
              </button>
              {processedData && (
                  <button 
                    onClick={handleExport}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Cleaned
                  </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {appMode === 'SELECT' && (
           <div className="mt-16 animate-in fade-in zoom-in-95 duration-500">
             <div className="text-center mb-12">
               <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                 Any Data. Instantly Clean.
               </h2>
               <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                 Seamlessly standardize tabular CRM arrays, or batch-assess native OS biometric fingerprint images. Select your module to initiate the pipeline.
               </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                 <div onClick={() => setAppMode('DATASET')} className="bg-white border-2 border-slate-200 hover:border-indigo-400 p-8 rounded-3xl cursor-pointer shadow-sm hover:shadow-lg transition-all group">
                     <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 group-hover:bg-indigo-600 transition-colors">
                         <FileSpreadsheet className="h-8 w-8 text-indigo-500 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-3">Tabular Dataset Pipeline</h3>
                     <p className="text-slate-500">Heuristic schema inference, algorithmic deduplication, and customizable rules engine for .csv and .xlsx architectures.</p>
                 </div>
                 
                 <div onClick={() => setAppMode('BIOMETRIC')} className="bg-white border-2 border-slate-200 hover:border-slate-800 p-8 rounded-3xl cursor-pointer shadow-sm hover:shadow-lg transition-all group">
                     <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-200 group-hover:bg-slate-900 transition-colors">
                         <Fingerprint className="h-8 w-8 text-slate-600 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-3">Batch Biometric Intake</h3>
                     <p className="text-slate-500">Natively assess massive directories of raw OS imagery utilizing an independent Blackbox Docker connection.</p>
                 </div>
             </div>
           </div>
        )}

        {appMode === 'DATASET' && (
          !rawData ? (
            <div className="mt-16 animate-in fade-in zoom-in-95 duration-500">
               <FileUpload onUpload={handleUpload} />
            </div>
          ) : !schemaConfirmed ? (
            <SchemaMapping 
               headers={headers} 
               schemaMap={schemaMap} 
               setSchemaMap={setSchemaMap} 
               onConfirm={handleConfirmMapping} 
            />
          ) : !processedData ? (
            <CleaningPreferences 
               rawData={rawData} 
               schemaMap={schemaMap} 
               onConfirm={handleExecutePipeline} 
            />
          ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Global Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Rows Analyzed" value={stats?.total} icon={<BarChart3 className="w-5 h-5 text-indigo-600" />} bg="bg-indigo-50" />
              <StatCard title="Overall Clean Rows" value={stats?.clean} icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" />
              <StatCard title="Duplicates Found" value={stats?.duplicates} icon={<Copy className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" />
              <StatCard title="Validation Errors" value={stats?.issues} icon={<FileWarning className="w-5 h-5 text-rose-600" />} bg="bg-rose-50" />
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-xl w-max mb-6">
               <button 
                  onClick={() => setActiveTab('DATA')}
                  className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'DATA' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  <TableProperties className="w-4 h-4 mr-2" /> Assessment Table
               </button>
               <button 
                  onClick={() => setActiveTab('METRICS')}
                  className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'METRICS' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
               >
                  <PieChartIcon className="w-4 h-4 mr-2" /> Metrics Dashboard
               </button>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'DATA' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <DataTable data={processedData} activeColumns={activeColumns} />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <MetricsDashboard data={processedData} schemaMap={schemaMap} />
              </div>
            )}
          </div>
          )
        )}

        {appMode === 'BIOMETRIC' && (
            !rawBiometrics ? (
              <div className="mt-16 animate-in fade-in zoom-in-95 duration-300">
                  <BiometricUpload onUpload={setRawBiometrics} />
              </div>
            ) : (
              <BiometricDashboard files={rawBiometrics} />
            )
        )}
      </main>
    </div>
  );
}

const StatCard = ({ title, value, icon, bg }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
    <div className={`p-4 rounded-xl shadow-inner ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <h4 className="text-3xl font-black text-slate-900 mt-1">{value}</h4>
    </div>
  </div>
);

export default App;
