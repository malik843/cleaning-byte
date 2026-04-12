import { useMemo } from 'react';
import type { ProcessedRow } from '../lib/Cleaner';
import type { FieldType } from '../lib/SchemaInferencer';
import { Fingerprint, BarChart2, ShieldCheck, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

export const MetricsDashboard = ({ data, schemaMap }: { data: ProcessedRow[], schemaMap: Record<string, FieldType> }) => {
  const hasFingerprints = Object.values(schemaMap).includes('FINGERPRINT');
  
  const fingerprintStats = useMemo(() => {
     let passed = 0;
     let failed = 0;
     let flagged = 0;
     if (hasFingerprints) {
         data.forEach(r => {
             if (r.biometricAssessment) {
                 if (r.biometricAssessment.status === 'passed') passed++;
                 if (r.biometricAssessment.status === 'failed') failed++;
                 if (r.biometricAssessment.status === 'flagged') flagged++;
             }
         });
     }
     return { passed, failed, flagged };
  }, [data, hasFingerprints]);
  
  const metrics = useMemo(() => {
    let modifiedCount = 0;
    const errorDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};

    Object.values(schemaMap).forEach(type => {
      if (type !== 'IGNORE') {
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      }
    });

    data.forEach(row => {
      const isChanged = Object.keys(row.original).some(k => row.original[k] !== row.suggested[k]);
      if (isChanged) modifiedCount++;

      row.errors.forEach(err => {
         const colName = err.split(':')[0];
         if (colName) {
            errorDistribution[colName] = (errorDistribution[colName] || 0) + 1;
         }
      });
    });

    const percentageCleaned = data.length > 0 ? Math.round((modifiedCount / data.length) * 100) : 0;
    
    return {
      percentageCleaned,
      modifiedCount,
      errorData: Object.entries(errorDistribution).map(([name, value]) => ({ name, value })),
      typeData: Object.entries(typeDistribution).map(([name, value]) => ({ name, value }))
    };
  }, [data, schemaMap]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cleaning Efficacy Score Widget */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
             <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" /> Cleaning Efficacy
          </h3>
          <div className="relative flex justify-center items-center w-40 h-40">
             <svg className="w-full h-full transform -rotate-90">
               <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
               <circle cx="80" cy="80" r="70" fill="transparent" stroke="#6366f1" strokeWidth="12" 
                       strokeDasharray="439.8" strokeDashoffset={439.8 - (439.8 * metrics.percentageCleaned) / 100} 
                       strokeLinecap="round" className="transition-all duration-1000 ease-out" />
             </svg>
             <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-slate-800">{metrics.percentageCleaned}%</span>
             </div>
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center leading-relaxed">
            <strong>{metrics.modifiedCount}</strong> out of {data.length} rows were successfully standardized by the semantic engine.
          </p>
        </div>

        {/* Column Types Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <PieChartIcon className="w-4 h-4 mr-2" /> Detected Schema Shape
          </h3>
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" labelLine={false}>
                  {metrics.typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NFIQ Automated Dashboard Widget */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col relative transition-all">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Fingerprint className="w-4 h-4 mr-2 text-indigo-500" /> NFIQ Quality Assessed
             </h3>
             {hasFingerprints && (
                 <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    DETECTED
                 </span>
             )}
          </div>

          {!hasFingerprints ? (
             <div className="flex flex-col items-center justify-center flex-1 h-full opacity-60">
                 <ShieldCheck className="w-12 h-12 text-slate-300 mb-2" />
                 <p className="text-slate-500 text-sm font-medium px-4 text-center">No biometric fingerprint data mapped in current dataset.</p>
             </div>
          ) : (
             <div className="flex flex-col flex-1 space-y-3 mt-2">
                 <div className="flex items-center justify-between bg-emerald-50 rounded-lg p-3 border border-emerald-100 shadow-sm">
                    <span className="text-sm font-bold text-emerald-800">Passed / Accepted</span>
                    <span className="text-xl font-black text-emerald-600">{fingerprintStats.passed}</span>
                 </div>
                 <div className="flex items-center justify-between bg-rose-50 rounded-lg p-3 border border-rose-100 shadow-sm">
                    <span className="text-sm font-bold text-rose-800">Failed Format</span>
                    <span className="text-xl font-black text-rose-600">{fingerprintStats.failed}</span>
                 </div>
                 <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3 border border-amber-100 shadow-sm">
                    <span className="text-sm font-bold text-amber-800">Flagged (Recapture)</span>
                    <span className="text-xl font-black text-amber-600">{fingerprintStats.flagged}</span>
                 </div>
             </div>
          )}
        </div>
      </div>

      {/* Errors Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center">
            <BarChart2 className="w-4 h-4 mr-2 text-rose-500" /> Validation Error Distribution
         </h3>
         {metrics.errorData.length > 0 ? (
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={metrics.errorData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 600, fill: '#475569' }} width={80} />
                 <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         ) : (
           <div className="h-64 flex items-center justify-center border-2 border-dashed border-emerald-100 rounded-2xl bg-emerald-50/50">
              <div className="text-center">
                 <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                 <p className="text-slate-600 font-semibold text-lg">Spotless!</p>
                 <p className="text-slate-500 mt-1">No validation errors remaining mapped dataset.</p>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};
