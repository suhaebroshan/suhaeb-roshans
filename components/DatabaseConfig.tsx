import React, { useState, useEffect } from 'react';
import { saveConfig, getStoredConfig } from '../services/firebase';
import Button from './Button';
import { Database, X, AlertTriangle, ExternalLink } from 'lucide-react';

const DatabaseConfig: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const config = getStoredConfig();
    if (config) {
      setIsConfigured(true);
      setConfigInput(JSON.stringify(config, null, 2));
    } else {
      const hasSkipped = sessionStorage.getItem('trust_skip_db_config');
      if (!hasSkipped) {
        setIsOpen(true);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      const config = JSON.parse(configInput);
      if (!config.projectId) throw new Error("Config must contain projectId");
      
      saveConfig(config);
      setIsOpen(false);
    } catch (e) {
      setError('Invalid JSON. Make sure to copy only the object { ... }');
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    sessionStorage.setItem('trust_skip_db_config', 'true');
  };

  // If configured (which is true by default now), just show the small indicator button
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button 
            onClick={() => setIsOpen(true)}
            className={`p-2 rounded-full shadow-lg border-2 transition-all flex items-center gap-2 px-4 ${isConfigured ? 'bg-green-100 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
        >
            <Database size={16} />
            <span className="text-xs font-bold">{isConfigured ? 'Connected' : 'Offline Demo'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl p-8 border-2 border-violet-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                    <Database size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">Database Settings</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {isConfigured ? 'Connected to Firestore' : 'Configure Connection'}
                  </p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
            </button>
        </div>

        <div className="overflow-y-auto pr-2 mb-4">
            {!isConfigured && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <ExternalLink size={16} /> 
                    Setup Instructions:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-1">
                      <li>Create a project in <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-violet-500 underline font-bold">Firebase Console</a>.</li>
                      <li>Enable <strong>Firestore Database</strong> (Test Mode).</li>
                      <li>Copy the config object from Project Settings.</li>
                  </ol>
              </div>
            )}

            <div className="mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Firebase Config JSON
                </label>
                <textarea 
                    value={configInput}
                    onChange={(e) => setConfigInput(e.target.value)}
                    placeholder="{ ... }"
                    className="w-full h-48 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 font-mono text-xs focus:ring-4 focus:ring-violet-100 outline-none"
                />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
        </div>

        <div className="flex flex-col gap-3 mt-auto">
            <Button onClick={handleSave} fullWidth>
                {isConfigured ? 'Update Configuration' : 'Connect'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfig;