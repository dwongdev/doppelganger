import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmRequest } from '../types';

interface CaptureEntry {
    name: string;
    url: string;
    size: number;
    modified: number;
    type: 'screenshot' | 'recording';
}

interface CapturesScreenProps {
    onConfirm: (request: string | ConfirmRequest) => Promise<boolean>;
    onNotify: (message: string, tone?: 'success' | 'error') => void;
}

const CapturesScreen: React.FC<CapturesScreenProps> = ({ onConfirm, onNotify }) => {
    const navigate = useNavigate();
    const [captures, setCaptures] = useState<CaptureEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCaptures = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/data/captures');
            const data = res.ok ? await res.json() : { captures: [] };
            setCaptures(Array.isArray(data.captures) ? data.captures : []);
        } catch {
            setCaptures([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteCapture = async (name: string) => {
        const confirmed = await onConfirm(`Delete capture ${name}?`);
        if (!confirmed) return;
        const res = await fetch(`/api/data/captures/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (res.ok) {
            setCaptures((prev) => prev.filter((c) => c.name !== name));
            onNotify('Capture deleted.', 'success');
        } else {
            onNotify('Delete failed.', 'error');
        }
    };

    useEffect(() => {
        loadCaptures();
    }, []);

    return (
        <main className="flex-1 p-12 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em]">Captures</p>
                        <h2 className="text-3xl font-bold tracking-tighter text-white">All Captures</h2>
                        <div className="text-[8px] text-gray-500 uppercase tracking-[0.2em]">
                            Recordings and screenshots from every run
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadCaptures}
                            className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/executions')}
                            className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                        >
                            Executions
                        </button>
                    </div>
                </div>

                <div className="glass-card rounded-[32px] p-8">
                    {loading && (
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest">Loading captures...</div>
                    )}
                    {!loading && captures.length === 0 && (
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest">No captures found.</div>
                    )}
                    {!loading && captures.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {captures.map((capture) => (
                                <div key={capture.name} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                    <div className="p-3 border-b border-white/10 flex items-center justify-between">
                                        <div className="text-[9px] font-bold text-white uppercase tracking-widest">
                                            {capture.type === 'recording' ? 'Recording' : 'Screenshot'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={capture.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[9px] font-bold uppercase tracking-widest text-blue-300 hover:text-blue-200"
                                            >
                                                Open
                                            </a>
                                            <button
                                                onClick={() => deleteCapture(capture.name)}
                                                className="text-[9px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-black">
                                        {capture.type === 'recording' ? (
                                            <video src={capture.url} controls className="w-full h-64 object-contain bg-black" />
                                        ) : (
                                            <img src={capture.url} className="w-full h-64 object-contain bg-black" />
                                        )}
                                    </div>
                                    <div className="p-3 text-[9px] text-gray-500 uppercase tracking-widest">
                                        {capture.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default CapturesScreen;
