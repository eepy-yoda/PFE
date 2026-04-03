import React from 'react';
import { AIAnalysisResult, AIChecks } from '../types';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    HelpCircle,
    TrendingUp,
    MessageSquare,
    ClipboardList,
} from 'lucide-react';

// ── Check label display map ───────────────────────────────────────────────────

const CHECK_LABELS: Record<keyof AIChecks, string> = {
    subject_concept:   'Subject / Concept',
    brand_message:     'Brand Message',
    target_audience:   'Target Audience',
    style_mood:        'Style & Mood',
    colors:            'Color Palette',
    composition:       'Composition',
    required_elements: 'Required Elements',
};

// ── Check value badge ─────────────────────────────────────────────────────────

const CHECK_BADGE: Record<string, { label: string; cls: string }> = {
    match:    { label: 'Match',    cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    partial:  { label: 'Partial',  cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    mismatch: { label: 'Mismatch', cls: 'bg-rose-100  dark:bg-rose-900/30  text-rose-700  dark:text-rose-400'  },
    unknown:  { label: 'Unknown',  cls: 'bg-gray-100  dark:bg-gray-800     text-gray-500  dark:text-gray-400'  },
};

const getCheckBadge = (value: string) => {
    const key = value.toLowerCase().trim();
    return CHECK_BADGE[key] ?? { label: value, cls: CHECK_BADGE.unknown.cls };
};

// ── Status config ─────────────────────────────────────────────────────────────

type StatusConfig = {
    icon: React.ReactNode;
    label: string;
    badgeCls: string;
    borderCls: string;
    bgCls: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
    aligns: {
        icon: <CheckCircle2 size={16} className="text-emerald-500" />,
        label: 'Aligns with Brief',
        badgeCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        borderCls: 'border-emerald-100 dark:border-emerald-900/40',
        bgCls: 'bg-emerald-50/40 dark:bg-emerald-900/10',
    },
    needs_revision: {
        icon: <AlertTriangle size={16} className="text-amber-500" />,
        label: 'Needs Revision',
        badgeCls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        borderCls: 'border-amber-100 dark:border-amber-900/40',
        bgCls: 'bg-amber-50/40 dark:bg-amber-900/10',
    },
    does_not_align: {
        icon: <XCircle size={16} className="text-rose-500" />,
        label: 'Does Not Align',
        badgeCls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
        borderCls: 'border-rose-100 dark:border-rose-900/40',
        bgCls: 'bg-rose-50/40 dark:bg-rose-900/10',
    },
    error: {
        icon: <HelpCircle size={16} className="text-gray-400" />,
        label: 'Parse Error',
        badgeCls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        borderCls: 'border-gray-100 dark:border-gray-800',
        bgCls: 'bg-gray-50/40 dark:bg-gray-800/20',
    },
};

// ── Score bar ──────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
    const pct = Math.max(0, Math.min(100, score));
    const barCls =
        pct >= 75 ? 'bg-emerald-500' :
        pct >= 50 ? 'bg-amber-400'   :
                    'bg-rose-500';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${barCls}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-lg font-black text-gray-900 dark:text-white w-14 text-right tabular-nums">
                {pct}<span className="text-xs font-bold text-gray-400">/100</span>
            </span>
        </div>
    );
};

// ── Safe JSON parse helper ─────────────────────────────────────────────────────

function parseAIResult(raw?: string): AIAnalysisResult | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AIAnalysisResult;
    } catch {
        return null;
    }
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AIAnalysisCardProps {
    /** Raw JSON string from TaskSubmission.ai_analysis_result */
    aiAnalysisResult?: string;
}

const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ aiAnalysisResult }) => {
    const result = parseAIResult(aiAnalysisResult);

    // Fallback: show safe error state, never crash
    if (!result) {
        return (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 p-4">
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                    <HelpCircle size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">AI Analysis</span>
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
                    AI analysis could not be parsed correctly.
                </p>
            </div>
        );
    }

    const cfg = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.error;
    const checks = result.checks ?? {};

    return (
        <div className={`rounded-2xl border p-4 space-y-4 ${cfg.borderCls} ${cfg.bgCls}`}>

            {/* ── Header: label + status badge ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">AI Analysis</span>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.badgeCls}`}>
                    {cfg.icon}
                    {cfg.label}
                </span>
            </div>

            {/* ── Score ── */}
            {result.status !== 'error' && (
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Alignment Score</p>
                    <ScoreBar score={result.score} />
                </div>
            )}

            {/* ── Summary ── */}
            {result.summary && (
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Summary</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>
                </div>
            )}

            {/* ── Checks ── */}
            {Object.keys(checks).length > 0 && (
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <ClipboardList size={12} className="text-gray-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Brief Checks</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(Object.keys(CHECK_LABELS) as Array<keyof AIChecks>).map((key) => {
                            const val = checks[key] ?? 'unknown';
                            const badge = getCheckBadge(val);
                            return (
                                <div
                                    key={key}
                                    className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800"
                                >
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mr-2">
                                        {CHECK_LABELS[key]}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                                        {badge.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Feedback ── */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare size={12} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Corrective Feedback</p>
                </div>
                {result.feedback && result.feedback.length > 0 ? (
                    <ul className="space-y-1.5">
                        {result.feedback.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800"
                            >
                                <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center text-[9px] font-black">
                                    {i + 1}
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 italic bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900/30">
                        No corrective feedback required.
                    </p>
                )}
            </div>
        </div>
    );
};

export default AIAnalysisCard;
