import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { SheetMetadata } from '../types/expense';
import {
  listUserSpreadsheets,
  createStatementSpreadsheet,
  getSheetMetadataById
} from '../services/googleSheets';
import { getAccessToken, googleSignIn } from '../services/auth';
import {
  FileSpreadsheet,
  Plus,
  ExternalLink,
  CheckCircle2,
  X,
  RefreshCw,
  Search,
  FolderOpen,
  Sparkles,
  Link2,
  LogIn,
  AlertCircle
} from 'lucide-react';

interface SheetManagerModalProps {
  connectedSheet: SheetMetadata | null;
  onSelectSheet: (sheet: SheetMetadata) => void;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
  isLoggingIn: boolean;
  onAuthSuccess?: (user: User, token: string) => void;
}

export const SheetManagerModal: React.FC<SheetManagerModalProps> = ({
  connectedSheet,
  onSelectSheet,
  onClose,
  user,
  onLogin,
  isLoggingIn,
  onAuthSuccess
}) => {
  const [spreadsheets, setSpreadsheets] = useState<SheetMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLinkingUrl, setIsLinkingUrl] = useState(false);
  const [isSigningInInternal, setIsSigningInInternal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTitle, setNewTitle] = useState(`StatementFlow Expenses ${new Date().getFullYear()}`);
  const [directUrlOrId, setDirectUrlOrId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'link' | 'browse'>('create');

  const fetchSheets = async () => {
    const token = await getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const list = await listUserSpreadsheets();
      setSpreadsheets(list);
    } catch (err: any) {
      console.warn('Failed to list spreadsheets', err);
      // Non-fatal if drive listing fails
      setSpreadsheets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, [user]);

  const handleSignIn = async () => {
    setIsSigningInInternal(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        if (onAuthSuccess) {
          onAuthSuccess(result.user, result.accessToken);
        }
        await fetchSheets();
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsSigningInInternal(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        // Trigger sign-in on user click
        const result = await googleSignIn();
        if (!result) {
          setError('Please sign in with Google to create a spreadsheet.');
          setIsCreating(false);
          return;
        }
        token = result.accessToken;
        if (onAuthSuccess) {
          onAuthSuccess(result.user, result.accessToken);
        }
      }

      const created = await createStatementSpreadsheet(newTitle.trim());
      onSelectSheet(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create sheet', err);
      setError(err.message || 'Failed to create spreadsheet in Google Drive');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkDirectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrlOrId.trim()) return;

    setIsLinkingUrl(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) {
          setError('Please sign in with Google to connect this spreadsheet.');
          setIsLinkingUrl(false);
          return;
        }
        token = result.accessToken;
        if (onAuthSuccess) {
          onAuthSuccess(result.user, result.accessToken);
        }
      }

      const meta = await getSheetMetadataById(directUrlOrId.trim());
      onSelectSheet(meta);
      onClose();
    } catch (err: any) {
      console.error('Failed to link spreadsheet', err);
      setError(err.message || 'Failed to access spreadsheet. Please check the URL or permissions.');
    } finally {
      setIsLinkingUrl(false);
    }
  };

  const filteredSheets = spreadsheets.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Sheet Connection</h2>
              <p className="text-xs text-slate-400">
                Primary reference source for expense transactions &amp; categorization rules
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
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* Not signed in banner */}
          {!user && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 text-center space-y-3">
              <div className="space-y-1">
                <p className="font-semibold text-white text-xs">Sign in with Google to Connect Sheets</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Access your existing spreadsheets or automatically create and sync a new StatementFlow sheet.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningInInternal || isLoggingIn}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningInInternal || isLoggingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {/* Currently connected card */}
          {connectedSheet && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Currently Connected Sheet
                </span>
                <a
                  href={connectedSheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white font-medium"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h3 className="text-sm font-bold text-white truncate">{connectedSheet.title}</h3>
              <p className="text-[11px] text-slate-400">
                Active tab: <span className="font-semibold text-slate-300">{connectedSheet.sheetName}</span>
              </p>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-teal-500 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create New Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'link'
                  ? 'bg-teal-500 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link by URL / ID</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('browse');
                fetchSheets();
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'browse'
                  ? 'bg-teal-500 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse Drive</span>
            </button>
          </div>

          {/* Tab 1: Create New Sheet */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateNew} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Create New StatementFlow Google Sheet</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Creates a pre-formatted spreadsheet in your Google Drive with headers, frozen title rows, and an automatic "Rules" tab.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Spreadsheet name..."
                  required
                  className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreating ? 'Creating...' : 'Create & Link'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Link by URL or ID */}
          {activeTab === 'link' && (
            <form onSubmit={handleLinkDirectUrl} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Link2 className="w-4 h-4 text-teal-400" />
                <span>Connect Existing Sheet by URL or ID</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Paste the full URL or Spreadsheet ID of your existing Google Sheet (e.g. one with your custom "Rules" tab).
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={directUrlOrId}
                  onChange={e => setDirectUrlOrId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLinkingUrl}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isLinkingUrl ? 'Connecting...' : 'Connect Sheet'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tab 3: Existing Spreadsheets List */}
          {activeTab === 'browse' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 text-xs">Select from Google Drive:</span>
                <button
                  onClick={fetchSheets}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search spreadsheets..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Sheets list */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {isLoading ? (
                  <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Loading spreadsheets...</span>
                  </div>
                ) : filteredSheets.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    {user
                      ? (searchQuery ? `No spreadsheets matching "${searchQuery}".` : 'No spreadsheets found in Google Drive.')
                      : 'Please sign in with Google to browse your Drive spreadsheets.'}
                  </div>
                ) : (
                  filteredSheets.map(sheet => {
                    const isCurrent = connectedSheet?.spreadsheetId === sheet.spreadsheetId;

                    return (
                      <div
                        key={sheet.spreadsheetId}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                          isCurrent
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold truncate text-xs">{sheet.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt).toLocaleDateString() : 'Updated recently'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectSheet(sheet);
                                onClose();
                              }}
                              className="px-3 py-1 bg-slate-700 hover:bg-teal-600 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
