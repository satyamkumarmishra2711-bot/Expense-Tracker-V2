import React, { useState, useEffect } from 'react';
import { Transaction } from '../types/expense';
import {
  searchRecentTransactionEmails,
  parseEmailsToTransactions,
  SAMPLE_EMAIL_ALERTS,
  EmailTransactionAlert,
  parseEmailsLocally,
  TimeRangeOption
} from '../services/gmailSync';
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from '../utils/categorizer';
import {
  Mail,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Inbox,
  Folder,
  CheckSquare,
  Square,
  Clock
} from 'lucide-react';

interface EmailSyncModalProps {
  onClose: () => void;
  existingTransactions: Transaction[];
  onSyncTransactions: (newTxs: Transaction[], isFreshSync?: boolean) => Promise<void>;
  isSyncing: boolean;
  billingCycleDay?: number;
}

const AVAILABLE_LABELS = [
  { id: 'all', name: 'All Banks & Inbox' },
  { id: 'SBI', name: 'SBI (Bank/SBI)' },
  { id: 'HDFC', name: 'HDFC (Bank/HDFC)' },
  { id: 'ICICI', name: 'ICICI (Bank/ICICI)' },
  { id: 'AXIS', name: 'Axis Bank' },
  { id: 'INDUSIND', name: 'IndusInd Bank' },
  { id: 'ANDHRA', name: 'Andhra / Union Bank' },
  { id: 'KOTAK', name: 'Kotak Bank' },
  { id: 'INBOX', name: 'Inbox' }
];

const DATE_RANGE_OPTIONS: Array<{ id: TimeRangeOption; label: string; sub?: string }> = [
  { id: 'current_billing_cycle', label: 'Current Billing Cycle', sub: 'From Last Billing Date' },
  { id: 'prev_billing_cycle', label: 'Previous Cycle', sub: 'Full Billing Period' },
  { id: '30_days', label: 'Last 30 Days' },
  { id: '60_days', label: 'Last 60 Days' },
  { id: '90_days', label: 'Last 90 Days' },
  { id: 'all', label: 'All Time' }
];

export const EmailSyncModal: React.FC<EmailSyncModalProps> = ({
  onClose,
  existingTransactions,
  onSyncTransactions,
  isSyncing,
  billingCycleDay = 18
}) => {
  const [selectedLabel, setSelectedLabel] = useState('all');
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>('current_billing_cycle');
  const [customDays, setCustomDays] = useState<string>('');
  const [isCustomDaysActive, setIsCustomDaysActive] = useState(false);
  const [isFreshSyncMode, setIsFreshSyncMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlerts, setEmailAlerts] = useState<EmailTransactionAlert[]>([]);
  const [extractedTxs, setExtractedTxs] = useState<Transaction[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [isDemoMode, setIsDemoMode] = useState(false);

  const activeRange: TimeRangeOption = isCustomDaysActive ? (parseInt(customDays, 10) || 'current_month') : selectedRange;

  const fetchGmailAlerts = async (labelFilter = selectedLabel, rangeFilter = activeRange) => {
    setIsLoading(true);
    setError(null);
    setIsDemoMode(false);
    try {
      const alerts = await searchRecentTransactionEmails(labelFilter, rangeFilter, billingCycleDay);
      setEmailAlerts(alerts);
      if (alerts.length > 0) {
        const parsed = await parseEmailsToTransactions(alerts);
        setExtractedTxs(parsed);
        // Default select all
        setSelectedTxIds(new Set(parsed.map(t => t.transaction_id)));
      } else {
        setExtractedTxs([]);
        setSelectedTxIds(new Set());
      }
    } catch (err: any) {
      console.warn('Failed to fetch from Gmail API:', err);
      setError(err.message || 'Could not fetch emails from Gmail. You can test sample alert emails below.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateAlerts = (labelFilter = selectedLabel) => {
    setIsLoading(true);
    setError(null);
    setIsDemoMode(true);

    let filteredSamples = SAMPLE_EMAIL_ALERTS;
    if (labelFilter === 'ICICI') {
      filteredSamples = SAMPLE_EMAIL_ALERTS.filter(s => s.primaryLabel === 'ICICI');
    } else if (labelFilter === 'SBI') {
      filteredSamples = SAMPLE_EMAIL_ALERTS.filter(s => s.primaryLabel === 'SBI');
    } else if (labelFilter === 'HDFC') {
      filteredSamples = SAMPLE_EMAIL_ALERTS.filter(s => s.primaryLabel === 'HDFC');
    }

    setEmailAlerts(filteredSamples);
    setTimeout(() => {
      const parsed = parseEmailsLocally(filteredSamples);
      setExtractedTxs(parsed);
      setSelectedTxIds(new Set(parsed.map(t => t.transaction_id)));
      setIsLoading(false);
    }, 400);
  };

  const handleLabelChange = (labelId: string) => {
    setSelectedLabel(labelId);
    if (isDemoMode) {
      handleSimulateAlerts(labelId);
    } else {
      fetchGmailAlerts(labelId, activeRange);
    }
  };

  const handleRangeChange = (range: TimeRangeOption) => {
    setSelectedRange(range);
    setIsCustomDaysActive(false);
    if (!isDemoMode) {
      fetchGmailAlerts(selectedLabel, range);
    }
  };

  const handleCustomDaysSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customDays, 10);
    if (parsed > 0) {
      setIsCustomDaysActive(true);
      if (!isDemoMode) {
        fetchGmailAlerts(selectedLabel, parsed);
      }
    }
  };

  useEffect(() => {
    fetchGmailAlerts('all', 'current_billing_cycle');
  }, []);

  const existingIdSet = new Set(existingTransactions.map(t => t.transaction_id));
  const newTransactions = extractedTxs.filter(t => !existingIdSet.has(t.transaction_id));
  const duplicateTransactions = extractedTxs.filter(t => existingIdSet.has(t.transaction_id));

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTxIds(new Set(extractedTxs.map(t => t.transaction_id)));
  };

  const deselectAll = () => {
    setSelectedTxIds(new Set());
  };

  const selectNewOnly = () => {
    setSelectedTxIds(new Set(newTransactions.map(t => t.transaction_id)));
  };

  const handleConfirmSync = async () => {
    const selectedTransactions = extractedTxs.filter(t => selectedTxIds.has(t.transaction_id));
    if (selectedTransactions.length === 0) return;
    await onSyncTransactions(selectedTransactions, isFreshSyncMode);
    onClose();
  };

  const selectedCount = selectedTxIds.size;
  const totalSelectedAmount = extractedTxs
    .filter(t => selectedTxIds.has(t.transaction_id))
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Daily Expenses from Email</h2>
              <p className="text-xs text-slate-400">
                Scanning email labels: ICICI, SBI, HDFC &amp; Inbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] text-slate-300 mt-1">
                  You can click "Test Sample Alerts" below to simulate transaction emails from your bank labels.
                </p>
              </div>
            </div>
          )}

          {/* Email Label Switcher Pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-teal-400" />
              1. Select Email Label / Bank Folder
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVAILABLE_LABELS.map(lbl => {
                const isSelected = selectedLabel === lbl.id;
                return (
                  <button
                    key={lbl.id}
                    onClick={() => handleLabelChange(lbl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-teal-500 text-white border-teal-400 shadow-md shadow-teal-500/20 font-semibold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sync Date Range Timeframe Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              2. Select Sync Timeframe (Current Month, Last Month, or Custom)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {DATE_RANGE_OPTIONS.map(opt => {
                const isSelected = !isCustomDaysActive && selectedRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleRangeChange(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20 font-semibold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}

              {/* Custom days input */}
              <form onSubmit={handleCustomDaysSubmit} className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="Custom days..."
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500 font-mono"
                />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    isCustomDaysActive
                      ? 'bg-teal-500 text-white border-teal-400 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Apply
                </button>
              </form>
            </div>
          </div>

          {/* Quick status banner */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Scan Status:</span>
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-teal-300 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Scanning Gmail emails...
                </span>
              ) : (
                <span className="font-semibold text-white">
                  Found {emailAlerts.length} alert email(s) • {extractedTxs.length} extracted expense(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchGmailAlerts(selectedLabel, activeRange)}
                disabled={isLoading}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-scan</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateAlerts(selectedLabel)}
                disabled={isLoading}
                className="px-3 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Test Sample Alerts</span>
              </button>
            </div>
          </div>

          {/* Selection & Batch Action Toolbar */}
          {extractedTxs.length > 0 && (
            <div className="space-y-3">
              {/* Fresh Sync Option */}
              <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/40 text-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFreshSyncMode}
                    onChange={e => {
                      setIsFreshSyncMode(e.target.checked);
                      if (e.target.checked) selectAll();
                    }}
                    className="rounded border-teal-500 bg-slate-900 text-teal-500 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      Fresh Sync Mode (Rewrite all selected emails to Google Sheet)
                    </span>
                    <span className="text-[11px] text-teal-300/80 block">
                      Recommended if you deleted data from your sheet or want to sync all emails again from scratch.
                    </span>
                  </div>
                </label>

                {isFreshSyncMode && (
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-1 rounded-full font-semibold shrink-0 self-start sm:self-auto">
                    Fresh Overwrite Active
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                  >
                    Select All ({extractedTxs.length})
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[11px] text-slate-400 hover:text-slate-300 font-medium cursor-pointer"
                  >
                    Deselect All
                  </button>
                  {!isFreshSyncMode && duplicateTransactions.length > 0 && (
                    <>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={selectNewOnly}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        Select New Only ({newTransactions.length})
                      </button>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {selectedCount} item(s) selected
                </span>
              </div>

              {/* Transactions list */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-2.5 bg-slate-950 font-semibold text-slate-300 text-[11px] border-b border-slate-800 flex items-center justify-between">
                  <span>Detected Transactions ({extractedTxs.length})</span>
                  <span className="text-[10px] text-slate-400">Click row or checkbox to select</span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                  {extractedTxs.map((tx) => {
                    const isDuplicate = duplicateTransactions.some(
                      dt => dt.transaction_id === tx.transaction_id
                    );
                    const isChecked = selectedTxIds.has(tx.transaction_id);
                    const colors = CATEGORY_COLORS[tx.category] || CATEGORY_COLORS['Other'];

                    return (
                      <div
                        key={tx.transaction_id}
                        onClick={() => toggleSelectTx(tx.transaction_id)}
                        className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                          isChecked ? 'bg-slate-800/70' : 'hover:bg-slate-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectTx(tx.transaction_id);
                            }}
                            className="text-teal-400 p-0.5 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-teal-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          <div className="truncate">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{tx.merchant}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                                {tx.card}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate font-mono">
                              {tx.date} • Month: {tx.statement_month} • {tx.source_file}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors?.badge || 'bg-slate-700 text-slate-200'}`}>
                            {tx.category}
                          </span>

                          {isDuplicate ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              In Dataset
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                              New
                            </span>
                          )}

                          <span className={`font-mono font-bold text-xs ${
                            tx.type === 'credit' ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {tx.type === 'credit' ? '+' : ''}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {extractedTxs.length === 0 && !isLoading && (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl p-6">
              <Mail className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">No transactions found for the selected filter &amp; timeframe</p>
              <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                Try switching to "Current Month", "Last Month", or click "Test Sample Alerts" to preview real sample emails.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="text-slate-400 text-xs">
            {selectedCount > 0 && (
              <span>
                Ready to sync <strong className="text-white">{selectedCount}</strong> expense(s) totaling <strong className="text-teal-300">{formatCurrency(totalSelectedAmount)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSync}
              disabled={selectedCount === 0 || isSyncing}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {isSyncing
                  ? 'Syncing to Google Sheet...'
                  : isFreshSyncMode
                  ? `Fresh Overwrite & Sync ${selectedCount} Expense(s) to Sheet`
                  : `Sync & Update ${selectedCount} Expense(s) to Sheet`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
