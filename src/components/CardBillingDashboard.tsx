import React, { useMemo, useState } from 'react';
import { Transaction } from '../types/expense';
import { CreditCard, Calendar, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Check, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils/dateUtils';
import { getBillingCycle } from '../utils/idGenerator';

interface CardBillingDashboardProps {
  transactions: Transaction[];
  selectedCard: string;
  onSelectCard: (card: string) => void;
  selectedMonth: string;
  onSelectMonth?: (month: string) => void;
  billingCycleDay?: number;
  onSetBillingCycleDay?: (day: number) => void;
}

interface CardSummary {
  cardName: string;
  last4: string;
  bankName: string;
  debits: number;
  credits: number;
  netBill: number;
  txCount: number;
  recentTxDate: string;
}

const COMMON_CYCLE_DAYS = [
  { day: 18, label: '18th to 18th (Default)' },
  { day: 1, label: '1st (Calendar Month)' },
  { day: 5, label: '5th to 5th' },
  { day: 10, label: '10th to 10th' },
  { day: 12, label: '12th to 12th' },
  { day: 15, label: '15th to 15th' },
  { day: 20, label: '20th to 20th' },
  { day: 24, label: '24th to 24th' },
  { day: 28, label: '28th to 28th' }
];

export const CardBillingDashboard: React.FC<CardBillingDashboardProps> = ({
  transactions,
  selectedCard,
  onSelectCard,
  selectedMonth,
  billingCycleDay = 18,
  onSetBillingCycleDay
}) => {
  const [isEditingCycle, setIsEditingCycle] = useState(false);

  // Aggregate card-level spending for the selected month / cycle or overall
  const { cardSummaries, totalDebits, totalCredits, netTotal, currentCycleText } = useMemo(() => {
    const cardMap = new Map<string, { debits: number; credits: number; count: number; dates: string[] }>();
    let allDebits = 0;
    let allCredits = 0;

    // Filter by selected billing month if set
    const relevantTxs = selectedMonth === 'all'
      ? transactions
      : transactions.filter(t => {
          const cycle = getBillingCycle(t.date, billingCycleDay);
          return (t.statement_month === selectedMonth) || (cycle.key === selectedMonth) || t.date.startsWith(selectedMonth);
        });

    relevantTxs.forEach(t => {
      const cardKey = t.card || 'Primary Card';
      if (!cardMap.has(cardKey)) {
        cardMap.set(cardKey, { debits: 0, credits: 0, count: 0, dates: [] });
      }
      const data = cardMap.get(cardKey)!;
      data.count++;
      data.dates.push(t.date);

      if (t.type === 'credit') {
        data.credits += t.amount;
        allCredits += t.amount;
      } else {
        data.debits += t.amount;
        allDebits += t.amount;
      }
    });

    const summaries: CardSummary[] = Array.from(cardMap.entries()).map(([cardName, data]) => {
      const match = cardName.match(/(\d{4})/);
      const last4 = match ? match[1] : '';
      let bankName = 'Card';
      if (/sbi/i.test(cardName)) bankName = 'SBI';
      else if (/hdfc/i.test(cardName)) bankName = 'HDFC';
      else if (/icici/i.test(cardName)) bankName = 'ICICI';
      else if (/axis/i.test(cardName)) bankName = 'Axis';
      else if (/indusind/i.test(cardName)) bankName = 'IndusInd';
      else if (/andhra|union\s*bank|ubi/i.test(cardName)) bankName = 'Andhra/UBI';
      else if (/kotak/i.test(cardName)) bankName = 'Kotak';
      else if (/idfc/i.test(cardName)) bankName = 'IDFC';
      else if (/baroda|bob/i.test(cardName)) bankName = 'BOB';
      else if (/pnb|punjab/i.test(cardName)) bankName = 'PNB';
      else if (/canara/i.test(cardName)) bankName = 'Canara';
      else if (/yes/i.test(cardName)) bankName = 'Yes Bank';
      else if (/rbl/i.test(cardName)) bankName = 'RBL';
      else if (/amex|american/i.test(cardName)) bankName = 'Amex';

      data.dates.sort().reverse();

      return {
        cardName,
        last4,
        bankName,
        debits: data.debits,
        credits: data.credits,
        netBill: Math.max(0, data.debits - data.credits),
        txCount: data.count,
        recentTxDate: data.dates[0] || ''
      };
    });

    // Sort by highest debits
    summaries.sort((a, b) => b.debits - a.debits);

    const now = new Date();
    const cycleObj = getBillingCycle(now.toISOString().split('T')[0], billingCycleDay);

    return {
      cardSummaries: summaries,
      totalDebits: allDebits,
      totalCredits: allCredits,
      netTotal: Math.max(0, allDebits - allCredits),
      currentCycleText: cycleObj.rangeText
    };
  }, [transactions, selectedMonth, billingCycleDay]);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 backdrop-blur-sm">
      {/* Header with Small text & billing cycle selector */}
      <div className="flex items-start justify-between pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-teal-400" />
            <h3 className="font-bold text-xs tracking-tight text-white uppercase">
              Card Level Billing
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-teal-400/80" />
            <span>Cycle end: <strong className="text-teal-300">{billingCycleDay === 1 ? '1st (Month-end)' : `${billingCycleDay}th`}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
            {currentCycleText}
          </span>
          {onSetBillingCycleDay && (
            <button
              onClick={() => setIsEditingCycle(!isEditingCycle)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Change Billing Cycle Date"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cycle Selector Dropdown Drawer if toggled */}
      {isEditingCycle && onSetBillingCycleDay && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 animate-in fade-in duration-150">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Select Your Credit Card Billing Date:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {COMMON_CYCLE_DAYS.map(cd => (
              <button
                key={cd.day}
                onClick={() => {
                  onSetBillingCycleDay(cd.day);
                  setIsEditingCycle(false);
                }}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center border ${
                  billingCycleDay === cd.day
                    ? 'bg-teal-500 text-white border-teal-400 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                }`}
              >
                {cd.day === 1 ? '1st (Calendar)' : `${cd.day}th`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini Summary Totals in Small Text */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-[11px]">
        <div>
          <span className="text-slate-400 text-[10px] block">Total Spends</span>
          <span className="font-bold text-slate-100 text-xs">
            {formatCurrency(totalDebits)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block">Net Bill Due</span>
          <span className="font-bold text-teal-400 text-xs">
            {formatCurrency(netTotal)}
          </span>
        </div>
      </div>

      {/* All Cards Selector Option */}
      <button
        onClick={() => onSelectCard('all')}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer ${
          selectedCard === 'all'
            ? 'bg-teal-500/20 text-teal-200 border border-teal-500/40 shadow-sm'
            : 'bg-slate-950/40 hover:bg-slate-800/60 text-slate-300 border border-slate-800/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>All Cards Combined ({transactions.length})</span>
        </div>
        {selectedCard === 'all' && <Check className="w-3.5 h-3.5 text-teal-400" />}
      </button>

      {/* Cards List in Small Text */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5 custom-scrollbar">
        {cardSummaries.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No cards found in statement data
          </div>
        ) : (
          cardSummaries.map((c) => {
            const isSelected = selectedCard === c.cardName;

            let cardBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
            if (c.bankName === 'SBI') cardBadgeColor = 'bg-sky-950/80 text-sky-300 border-sky-800/60';
            else if (c.bankName === 'HDFC') cardBadgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800/60';
            else if (c.bankName === 'ICICI') cardBadgeColor = 'bg-orange-950/80 text-orange-300 border-orange-800/60';
            else if (c.bankName === 'Axis') cardBadgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
            else if (c.bankName === 'IndusInd') cardBadgeColor = 'bg-red-950/80 text-red-300 border-red-800/60';
            else if (c.bankName === 'Andhra/UBI') cardBadgeColor = 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
            else if (c.bankName === 'Kotak') cardBadgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
            else if (c.bankName === 'IDFC') cardBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/60';

            return (
              <div
                key={c.cardName}
                onClick={() => onSelectCard(isSelected ? 'all' : c.cardName)}
                className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-slate-800/90 border-teal-500/60 shadow-md shadow-teal-500/5 ring-1 ring-teal-500/30'
                    : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/70 text-slate-300'
                }`}
              >
                {/* Card Title & Last4 Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${cardBadgeColor}`}>
                      {c.bankName}
                    </span>
                    <span className="font-semibold text-slate-200 text-xs truncate">
                      {c.cardName}
                    </span>
                  </div>

                  {c.last4 && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                      ••{c.last4}
                    </span>
                  )}
                </div>

                {/* Card Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/50 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] flex items-center gap-1">
                      <ArrowUpRight className="w-2.5 h-2.5 text-rose-400" />
                      Spends
                    </span>
                    <span className="font-bold text-slate-100">
                      {formatCurrency(c.debits)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] flex items-center justify-end gap-1">
                      <ArrowDownRight className="w-2.5 h-2.5 text-emerald-400" />
                      Credits
                    </span>
                    <span className="font-medium text-emerald-400">
                      {formatCurrency(c.credits)}
                    </span>
                  </div>
                </div>

                {/* Billing Summary Line */}
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                  <span>{c.txCount} transactions</span>
                  <span className="font-semibold text-teal-300">
                    Net: {formatCurrency(c.netBill)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security Tag */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          100% Client-Side Privacy
        </span>
        <span>≤ ₹25,000</span>
      </div>
    </div>
  );
};
