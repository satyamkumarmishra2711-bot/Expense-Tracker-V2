import React from 'react';
import { User } from 'firebase/auth';
import { SheetMetadata } from '../types/expense';
import {
  CreditCard,
  RefreshCw,
  ExternalLink,
  Plus,
  FileSpreadsheet,
  LogOut,
  Upload,
  Settings,
  Sparkles,
  Mail,
  Tag
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  connectedSheet: SheetMetadata | null;
  onOpenSheetModal: () => void;
  onOpenUploadModal: () => void;
  onOpenEmailModal: () => void;
  onOpenRulesModal: () => void;
  onRefreshData: () => void;
  onSyncCategories?: () => void;
  onPushToSheet?: () => void;
  isRefreshing: boolean;
  lastSyncedAt: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  connectedSheet,
  onOpenSheetModal,
  onOpenUploadModal,
  onOpenEmailModal,
  onOpenRulesModal,
  onRefreshData,
  onSyncCategories,
  onPushToSheet,
  isRefreshing,
  lastSyncedAt
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  StatementFlow
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.5 AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Credit Card Statement Extractor &amp; Sheets Sync
              </p>
            </div>
          </div>

          {/* Center Actions / Connected Sheet Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {connectedSheet ? (
              <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 transition">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <button
                  onClick={onOpenSheetModal}
                  className="text-left group flex items-center gap-1.5"
                  title="Click to switch or view connected Google Sheet"
                >
                  <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 truncate max-w-[120px] sm:max-w-[180px]">
                    {connectedSheet.title}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden md:inline">({connectedSheet.sheetName})</span>
                </button>
                <a
                  href={connectedSheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition"
                  title="Open live Google Sheet in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <button
                onClick={onOpenSheetModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Connect Google Sheet</span>
              </button>
            )}

            {/* Sync / Refresh Button */}
            {connectedSheet && (
              <button
                onClick={onRefreshData}
                disabled={isRefreshing}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
                title={lastSyncedAt ? `Last refreshed: ${new Date(lastSyncedAt).toLocaleTimeString()} - Click to sync with Google Sheet` : 'Refresh & Sync from Google Sheet'}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
                <span className="hidden md:inline">{isRefreshing ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>
            )}

            {/* Push / Overwrite to Sheet Button */}
            {connectedSheet && onPushToSheet && (
              <button
                onClick={onPushToSheet}
                disabled={isRefreshing}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
                title="Overwrite / Push all current dataset to Google Sheet (Fresh Sync)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>Push to Sheet</span>
              </button>
            )}

            {/* Sync Categories from Sheet Rules Tab */}
            {connectedSheet && onSyncCategories && (
              <button
                onClick={onSyncCategories}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Sync category rules from Google Sheet 'Rules' tab and re-categorize all transactions based on description/email text"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Sync Categories</span>
              </button>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Rules button */}
            <button
              onClick={onOpenRulesModal}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer"
              title="Category Rules & Automation"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden lg:inline">Rules</span>
            </button>

            {/* Email Sync CTA */}
            <button
              onClick={onOpenEmailModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
              title="Sync daily expenses from bank email alerts (ICICI, BPCL SBI, Pulse SBI)"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Sync Email Alerts</span>
            </button>

            {/* Upload Statement Primary CTA */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Statement</span>
            </button>

            {/* Auth / Profile Area */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full ring-1 ring-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button bg-white text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                <div className="w-4 h-4 shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{isLoggingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
