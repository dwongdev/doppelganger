import { X } from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Action } from '../../types';
import { ACTION_CATALOG } from './actionCatalog';

interface ActionPaletteProps {
    open: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
    onSelect: (type: Action['type']) => void;
}

const ActionPalette: React.FC<ActionPaletteProps> = ({ open, query, onQueryChange, onClose, onSelect }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return ACTION_CATALOG;
        return ACTION_CATALOG.filter((item) =>
            item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
        );
    }, [query]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        document.getElementById(`action-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[activeIndex]) {
                onSelect(filtered[activeIndex].type);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
            onClick={onClose}
        >
            <div
                className="glass-card w-full max-w-xl rounded-[28px] border border-white/10 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-gray-500">Add Block</p>
                        <p className="text-xs text-gray-400 mt-1">Search actions and control flow blocks.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <input
                    ref={(node) => {
                        inputRef.current = node;
                        if (node) node.focus();
                    }}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type to filter (e.g., if, click, loop)"
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="action-listbox"
                    aria-expanded={true}
                    aria-activedescendant={`action-option-${activeIndex}`}
                />
                <div
                    id="action-listbox"
                    role="listbox"
                    className="mt-4 max-h-[320px] overflow-y-auto custom-scrollbar space-y-2"
                >
                    {filtered.map((item, index) => (
                        <button
                            key={item.type}
                            id={`action-option-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            onClick={() => onSelect(item.type)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                index === activeIndex
                                    ? 'bg-white/10 border-white/30 ring-1 ring-white/20'
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'
                            }`}
                        >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white">{item.label}</div>
                            <div className="text-[9px] text-gray-500 mt-1">{item.description}</div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest">No matches.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionPalette;
