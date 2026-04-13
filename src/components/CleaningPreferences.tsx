import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Settings2, Wand2, SearchX, Layers, PlayCircle, Save } from 'lucide-react';
import { DEFAULT_CONFIG } from '../lib/CleaningEngineConfig';
import type { CleaningConfig, StrategyMissing, StrategyDedup } from '../lib/CleaningEngineConfig';
import { processDataset } from '../lib/Cleaner';
import type { ProcessedRow } from '../lib/Cleaner';
import type { FieldType } from '../lib/SchemaInferencer';

export const CleaningPreferences = ({ 
   rawData, 
   schemaMap, 
   onConfirm 
}: { 
   rawData: any[], 
   schemaMap: Record<string, FieldType>,
   onConfirm: (config: CleaningConfig, processedData: ProcessedRow[]) => void 
}) => {
   const [config, setConfig] = useState<CleaningConfig>(() => {
       const saved = localStorage.getItem('cleaningPresets');
       if (saved) {
           const presets = JSON.parse(saved);
           if (presets.length > 0) return presets[0];
       }
       return DEFAULT_CONFIG;
   });

   const [presets, setPresets] = useState<CleaningConfig[]>(() => {
       const saved = localStorage.getItem('cleaningPresets');
       return saved ? JSON.parse(saved) : [DEFAULT_CONFIG];
   });

   const [presetName, setPresetName] = useState("");
   
   // Preview stats computationally inexpensive version (max 500 rows)
   const previewStats = useMemo(() => {
       const slice = rawData.slice(0, 500);
       const processed = processDataset(slice, schemaMap, config);
       let duplicates = 0;
       let imputed = 0;
       let formatErrors = 0;

       processed.forEach(r => {
           if (r.isDuplicate) duplicates++;
           if (r.errors.length > 0) formatErrors++;
           const isChanged = Object.keys(r.original).some(k => r.original[k] !== r.suggested[k]);
           if (isChanged && config.missing.strategy !== 'FLAG_ONLY') {
               Object.keys(r.original).forEach(k => {
                   if (!r.original[k] && r.suggested[k]) imputed++;
               });
           }
       });

       return { duplicates, imputed, formatErrors, total: slice.length };
   }, [rawData, schemaMap, config]);

   const onDragEnd = (result: DropResult) => {
       if (!result.destination) return;
       const items = Array.from(config.standardize.order);
       const [reorderedItem] = items.splice(result.source.index, 1);
       items.splice(result.destination.index, 0, reorderedItem);
       setConfig({
           ...config,
           standardize: { ...config.standardize, order: items }
       });
   };

   const savePreset = () => {
       if (!presetName.trim()) return;
       const newConfig = { ...config, id: Date.now().toString(), name: presetName };
       const newPresets = [...presets, newConfig];
       setPresets(newPresets);
       setConfig(newConfig);
       localStorage.setItem('cleaningPresets', JSON.stringify(newPresets));
       setPresetName("");
   };

   return (
       <div className="w-full flex flex-col lg:flex-row gap-6 animate-in fade-in zoom-in-95 duration-500">
           {/* MAIN CONFIG PANEL */}
           <div className="flex-1 space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                   <div className="flex items-center justify-between mb-8">
                       <div>
                           <h2 className="text-xl font-bold text-slate-800 flex items-center">
                               <Settings2 className="w-5 h-5 mr-2 text-indigo-600" /> Cleaning Preferences
                           </h2>
                           <p className="text-sm text-slate-500 mt-1">Configure your automated rules engine</p>
                       </div>
                       <select 
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={config.id}
                          onChange={(e) => {
                              const found = presets.find(p => p.id === e.target.value);
                              if (found) setConfig(found);
                          }}
                       >
                          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                   </div>

                   {/* Standardization Phase */}
                   <div className="mb-8 p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                       <h3 className="text-sm font-bold tracking-wider text-slate-500 flex items-center uppercase mb-4">
                           <Wand2 className="w-4 h-4 mr-2 text-indigo-500" /> Phase 1: Standardization
                       </h3>
                       <DragDropContext onDragEnd={onDragEnd}>
                           <Droppable droppableId="standardization">
                               {(provided) => (
                                   <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                       {config.standardize.order.map((key, index) => {
                                           const rule = config.standardize[key as keyof Omit<CleaningConfig['standardize'], 'order'>];
                                           return (
                                               <Draggable key={rule.id} draggableId={rule.id} index={index}>
                                                   {(provided) => (
                                                       <div 
                                                          ref={provided.innerRef} 
                                                          {...provided.draggableProps} 
                                                          {...provided.dragHandleProps}
                                                          className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-200"
                                                       >
                                                           <div className="flex items-center">
                                                               <span className="font-bold text-slate-300 mr-4 w-4">{index + 1}.</span>
                                                               <input 
                                                                  type="checkbox" 
                                                                  checked={rule.enabled}
                                                                  className="mr-3 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                                  onChange={(e) => setConfig({
                                                                      ...config,
                                                                      standardize: {
                                                                          ...config.standardize,
                                                                          [key]: { ...rule, enabled: e.target.checked }
                                                                      }
                                                                  })}
                                                               />
                                                               <span className="text-sm font-semibold text-slate-700 capitalize">
                                                                   {key.replace(/([A-Z])/g, ' $1').trim()}
                                                               </span>
                                                           </div>
                                                           {key === 'casing' && (
                                                               <select 
                                                                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                                                                  value={(rule as any).strategy}
                                                                  onChange={(e) => setConfig({
                                                                      ...config,
                                                                      standardize: {
                                                                          ...config.standardize,
                                                                          casing: { ...rule, strategy: e.target.value } as any
                                                                      }
                                                                  })}
                                                               >
                                                                  <option value="TITLE">Title Case</option>
                                                                  <option value="UPPER">UPPERCASE</option>
                                                                  <option value="LOWER">lowercase</option>
                                                                  <option value="ORIGINAL">Original</option>
                                                               </select>
                                                           )}
                                                       </div>
                                                   )}
                                               </Draggable>
                                           );
                                       })}
                                       {provided.placeholder}
                                   </div>
                               )}
                           </Droppable>
                       </DragDropContext>
                   </div>

                   {/* Missing Data Phase */}
                   <div className="mb-8 p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                       <h3 className="text-sm font-bold tracking-wider text-slate-500 flex items-center uppercase mb-4">
                           <SearchX className="w-4 h-4 mr-2 text-rose-500" /> Phase 2: Missing Data Handling
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5">Strategy</label>
                               <select 
                                  className="w-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={config.missing.strategy}
                                  onChange={(e) => setConfig({...config, missing: {...config.missing, strategy: e.target.value as StrategyMissing}})}
                               >
                                  <option value="FLAG_ONLY">Flag Only (Do not auto-fill)</option>
                                  <option value="DEFAULT_FILL">Fill with Default Value</option>
                                  <option value="INTERPOLATE">Forward-Fill (Interpolate)</option>
                               </select>
                           </div>
                           {config.missing.strategy === 'DEFAULT_FILL' && (
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5">Default Fallback Text</label>
                               <input 
                                  type="text"
                                  className="w-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={config.missing.defaultFillText}
                                  onChange={(e) => setConfig({...config, missing: {...config.missing, defaultFillText: e.target.value}})}
                               />
                           </div>
                           )}
                       </div>
                   </div>

                   {/* Deduplication Phase */}
                   <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200">
                       <h3 className="text-sm font-bold tracking-wider text-slate-500 flex items-center uppercase mb-4">
                           <Layers className="w-4 h-4 mr-2 text-amber-500" /> Phase 3: Deduplication
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5">Matching Algorithm</label>
                               <select 
                                  className="w-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  value={config.dedup.strategy}
                                  onChange={(e) => setConfig({...config, dedup: {...config.dedup, strategy: e.target.value as StrategyDedup}})}
                               >
                                  <option value="EXACT">Exact Match</option>
                                  <option value="FUZZY">Fuzzy Matching (Algorithmic)</option>
                                  <option value="OFF">Turn Off Deduplication</option>
                               </select>
                           </div>
                           {config.dedup.strategy === 'FUZZY' && (
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1.5">Match Sensitivity ({config.dedup.fuzzyThreshold}%)</label>
                               <input 
                                  type="range" min="50" max="99" 
                                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-3"
                                  value={config.dedup.fuzzyThreshold}
                                  onChange={(e) => setConfig({...config, dedup: {...config.dedup, fuzzyThreshold: parseInt(e.target.value)}})}
                               />
                           </div>
                           )}
                       </div>
                   </div>

               </div>
           </div>

           {/* SIDE PANEL */}
           <div className="w-full lg:w-80 space-y-4">
               {/* Impact Preview */}
               <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 text-slate-50 sticky top-24">
                   <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 mb-5 flex items-center">
                       Live Config Preview
                   </h3>
                   <div className="space-y-4">
                       <div className="flex justify-between items-center bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                           <span className="text-sm font-medium">Duplicates Caught</span>
                           <span className="text-lg font-black text-amber-400">{previewStats.duplicates}</span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                           <span className="text-sm font-medium">Missing Val Imputed</span>
                           <span className="text-lg font-black text-emerald-400">{previewStats.imputed}</span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                           <span className="text-sm font-medium">Formatting Issues</span>
                           <span className="text-lg font-black text-rose-400">{previewStats.formatErrors}</span>
                       </div>
                   </div>
                   <p className="text-xs text-slate-400 mt-5 text-center px-4 leading-relaxed font-medium">Live metrics based on sequential inference sample of {previewStats.total} rows</p>
                   
                   <button 
                      onClick={() => onConfirm(config, processDataset(rawData, schemaMap, config))}
                      className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] transition-all active:scale-95 flex items-center justify-center text-sm"
                   >
                       <PlayCircle className="w-5 h-5 mr-2" /> Execute Pipeline
                   </button>
               </div>

               {/* Preset Saving */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                   <h3 className="text-sm font-bold text-slate-800 mb-3">Save as Pipeline Preset</h3>
                   <div className="flex gap-2">
                       <input 
                           type="text" 
                           placeholder="My Preset..." 
                           className="flex-1 text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                           value={presetName}
                           onChange={e => setPresetName(e.target.value)}
                       />
                       <button 
                          onClick={savePreset}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl transition-colors shadow-sm"
                       >
                           <Save className="w-4 h-4" />
                       </button>
                   </div>
               </div>
           </div>
       </div>
   );
};
