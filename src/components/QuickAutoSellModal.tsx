import React, { useState, useEffect } from 'react';
import { X, Zap, Target, ShieldAlert, Sliders, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoTicker, RuleType, AutoSellRule } from '../types';

interface QuickAutoSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: CryptoTicker | null;
  onCreateRule: (ruleData: Partial<AutoSellRule>) => Promise<void>;
}

export const QuickAutoSellModal: React.FC<QuickAutoSellModalProps> = ({
  isOpen,
  onClose,
  ticker,
  onCreateRule,
}) => {
  const [ruleType, setRuleType] = useState<RuleType>('TAKE_PROFIT');
  const [offsetPercent, setOffsetPercent] = useState<number>(5);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0.1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (ticker) {
      const current = ticker.price;
      if (ruleType === 'TAKE_PROFIT') {
        setCustomPrice((current * (1 + offsetPercent / 100)).toFixed(2));
      } else if (ruleType === 'STOP_LOSS') {
        setCustomPrice((current * (1 - offsetPercent / 100)).toFixed(2));
      } else if (ruleType === 'TRAILING_STOP') {
        setCustomPrice((current * (1 - 0.025)).toFixed(2));
      }
    }
  }, [ticker, ruleType, offsetPercent]);

  if (!isOpen || !ticker) return null;

  const baseAsset = ticker.symbol.replace('USDT', '');
  const currentPrice = ticker.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(customPrice);
    const qty = parseFloat(quantity);
    if (!price || !qty) return;

    setIsSubmitting(true);
    try {
      await onCreateRule({
        symbol: ticker.symbol,
        baseAsset,
        quoteAsset: 'USDT',
        ruleType,
        triggerPrice: price,
        amount: qty,
        amountPercent: 100,
        entryPrice: currentPrice,
        orderType: 'MARKET',
        trailingPercent: ruleType === 'TRAILING_STOP' ? 2.5 : undefined,
        trailingPeakPrice: currentPrice,
        status: 'ACTIVE',
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Set Auto-Sell for {baseAsset}</h3>
              <p className="text-[11px] text-slate-400">Live Price: ${currentPrice.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Strategy selection */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRuleType('TAKE_PROFIT');
                setOffsetPercent(5);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                ruleType === 'TAKE_PROFIT'
                  ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🎯 Take Profit
            </button>
            <button
              type="button"
              onClick={() => {
                setRuleType('STOP_LOSS');
                setOffsetPercent(3);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                ruleType === 'STOP_LOSS'
                  ? 'bg-rose-600 text-white ring-1 ring-rose-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🛡️ Stop Loss
            </button>
            <button
              type="button"
              onClick={() => {
                setRuleType('TRAILING_STOP');
                setOffsetPercent(2.5);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                ruleType === 'TRAILING_STOP'
                  ? 'bg-cyan-600 text-white ring-1 ring-cyan-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🌊 Trailing Stop
            </button>
          </div>

          {/* Quick preset percentage offsets */}
          {ruleType !== 'TRAILING_STOP' && (
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Quick Target:</span>
              <div className="flex items-center gap-1">
                {(ruleType === 'TAKE_PROFIT' ? [3, 5, 10, 15] : [2, 3, 5, 8]).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setOffsetPercent(pct)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                      offsetPercent === pct
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {ruleType === 'TAKE_PROFIT' ? '+' : '-'}{pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target Price */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Trigger Execution Price ($)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentPrice > 0 && customPrice
                  ? `${(((parseFloat(customPrice) - currentPrice) / currentPrice) * 100).toFixed(2)}% difference`
                  : ''}
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Quantity to Auto-Sell ({baseAsset})
            </label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {success && (
            <div className="p-2 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium text-center rounded-lg flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Auto-Sell Guard armed successfully!
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              {isSubmitting ? 'Arming...' : 'Activate Auto-Sell'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
