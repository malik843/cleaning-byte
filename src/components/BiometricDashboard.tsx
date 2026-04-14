import { useState, useEffect } from 'react';
import { assessBiometricQuality } from '../server/biometric-quality';
import type { OpenBqResult } from '../server/biometric-quality';
import { Fingerprint, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export type BiometricJob = {
    file: File;
    status: 'pending' | 'processing' | 'done' | 'failed';
    result?: OpenBqResult;
    errorText?: string;
};

export const BiometricDashboard = ({ files }: { files: File[] }) => {
    const [jobs, setJobs] = useState<BiometricJob[]>(() => 
        files.map(f => ({ file: f, status: 'pending' }))
    );
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Concurrency Engine strictly chunking requests preventing Docker socket exhaustion
    useEffect(() => {
        if (!processing || progress >= jobs.length) return;

        let isCancelled = false;

        const runBatch = async () => {
            const CONCURRENCY = 4;
            
            for (let i = 0; i < jobs.length; i += CONCURRENCY) {
                if (isCancelled) break;

                const chunk = jobs.slice(i, i + CONCURRENCY);
                const chunkPromises = chunk.map(async (job, idx) => {
                    const actualIndex = i + idx;
                    if (job.status !== 'pending') return;

                    setJobs(prev => {
                        const next = [...prev];
                        next[actualIndex].status = 'processing';
                        return next;
                    });

                    try {
                        const result = await assessBiometricQuality(job.file, 'fingerprint');
                        setJobs(prev => {
                            const next = [...prev];
                            next[actualIndex].status = 'done';
                            next[actualIndex].result = result;
                            return next;
                        });
                    } catch (e: any) {
                        setJobs(prev => {
                            const next = [...prev];
                            next[actualIndex].status = 'failed';
                            next[actualIndex].errorText = e.message;
                            return next;
                        });
                    }
                });

                await Promise.all(chunkPromises);
                if (!isCancelled) {
                    setProgress(Math.min((i + CONCURRENCY), jobs.length));
                }
            }
            setProcessing(false);
        };

        runBatch();

        return () => {
            isCancelled = true;
        };
    }, [processing, jobs, progress]);

    const handleStart = () => {
        setProcessing(true);
    };

    const completed = jobs.filter(j => j.status === 'done' || j.status === 'failed').length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Control Strip */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
               <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center">
                     <Fingerprint className="w-6 h-6 mr-3 text-indigo-600" />
                     Biometric Batch Assessment
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Safely queued {jobs.length} files targeting Fingerprint Modality.</p>
               </div>
               {completed < jobs.length && !processing ? (
                   <button 
                       onClick={handleStart}
                       className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center"
                   >
                       <Fingerprint className="w-4 h-4 mr-2" /> Process Target Files
                   </button>
               ) : (
                   <div className="w-1/3">
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                         <span>Analysis Progress</span>
                         <span>{completed} / {jobs.length}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 shadow-inner">
                          <div 
                              className="bg-indigo-500 h-3 transition-all duration-300" 
                              style={{ width: `${(completed / jobs.length) * 100}%` }}
                          ></div>
                      </div>
                   </div>
               )}
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-widest">File Asset</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Status</th>
                                <th className="px-6 py-4 font-bold tracking-widest text-right">NFIQ Quality Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {job.file.webkitRelativePath || job.file.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.status === 'pending' && <span className="text-slate-400 font-bold px-2 py-1 rounded bg-slate-100">Pending...</span>}
                                        {job.status === 'processing' && <span className="text-indigo-600 font-bold flex items-center px-2 py-1 rounded bg-indigo-50"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Assessing</span>}
                                        {job.status === 'done' && (
                                            <span className="text-emerald-700 font-bold flex items-center px-2 py-1 rounded bg-emerald-50">
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> Checked
                                            </span>
                                        )}
                                        {job.status === 'failed' && (
                                            <div className="group relative inline-block">
                                              <span className="text-rose-700 font-bold flex items-center px-2 py-1 rounded bg-rose-50 cursor-pointer">
                                                  <AlertTriangle className="w-4 h-4 mr-1.5" /> Error
                                              </span>
                                              <div className="absolute hidden group-hover:block z-20 bg-slate-800 text-white text-xs p-2 rounded w-64 top-full mt-1 mb-2 left-0 shadow-xl">
                                                {job.errorText}
                                              </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {job.result ? (
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm border ${
                                                job.result.score > 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                {job.result.score} / 100
                                            </span>
                                        ) : job.status === 'failed' ? (
                                            <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs font-mono font-bold shadow-sm">REJECTED</span>
                                        ) : (
                                            <span className="text-slate-300 font-black tracking-widest">---</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
