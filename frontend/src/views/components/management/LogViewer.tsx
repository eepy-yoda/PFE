import React, { useState, useEffect } from 'react';
import { managementService } from '../../../api/management';
import { ActivityLog } from '../../../types';
import { 
    Activity, 
    Terminal
} from 'lucide-react';

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await managementService.getLogs();
                setLogs(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        if (action.includes('create')) return 'text-green-500 bg-green-50';
        if (action.includes('delete')) return 'text-rose-500 bg-rose-50';
        if (action.includes('update')) return 'text-blue-500 bg-blue-50';
        return 'text-gray-500 bg-gray-50';
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading audit trail...</div>;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={16} /> Audit Trail & System Logs
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {logs.map(log => (
                        <div key={log.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors flex items-start gap-4">
                            <div className={`p-2 rounded-xl mt-1 ${getActionColor(log.action)}`}>
                                <Activity size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-gray-900 dark:text-white truncate">
                                        {log.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Entity: <span className="font-mono text-xs">{log.entity_type}</span> 
                                    {log.entity_id && <span className="text-[10px] opacity-70 ml-2">({log.entity_id.slice(0, 8)})</span>}
                                </div>
                                {log.details && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg mt-2 text-[11px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
                                        {JSON.stringify(log.details)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="p-12 text-center text-gray-400 italic">No activity logs recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogViewer;
