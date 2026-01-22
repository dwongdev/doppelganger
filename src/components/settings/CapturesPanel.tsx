interface CaptureEntry {
    name: string;
    url: string;
    size: number;
    modified: number;
    type: 'screenshot' | 'recording';
}

interface CapturesPanelProps {
    captures: CaptureEntry[];
    loading: boolean;
    onRefresh: () => void;
    onDelete: (name: string) => void;
}

const CapturesPanel: React.FC<CapturesPanelProps> = ({ captures, loading, onRefresh, onDelete }) => {
    return (
        <div className="glass-card p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Captures</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Recordings and screenshots</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-4 py-2 border border-white/10 text-[9px] font-bold rounded-xl uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                >
                    Refresh
                </button>
            </div>
            {loading && (
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">Loading captures...</div>
            )}
            {!loading && captures.length === 0 && (
                <div className="text-[9px] text-gray-600 uppercase tracking-widest">No captures found.</div>
            )}
            {!loading && captures.length > 0 && (
                <div className="space-y-3">
                    {captures.map((capture) => (
                        <div key={capture.name} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest">
                                    {capture.type === 'recording' ? 'Recording' : 'Screenshot'}
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest">{capture.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={capture.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 rounded-xl border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                                >
                                    Open
                                </a>
                                <button
                                    onClick={() => onDelete(capture.name)}
                                    className="px-3 py-2 rounded-xl border border-red-500/20 text-[9px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/10 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CapturesPanel;
