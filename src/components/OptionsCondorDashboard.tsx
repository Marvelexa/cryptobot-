import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  RefreshCw, 
  Sliders, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Activity, 
  Calendar,
  Layers,
  Sparkles,
  Info,
  Copy,
  Check,
  Code,
  X
} from 'lucide-react';

interface CondorLeg {
  symbol: string;
  action: 'SELL' | 'BUY';
  type: 'PUT' | 'CALL';
  strike: number;
  premium: number;
  contracts: number;
  notionalUSD: number;
  status: 'PENDING' | 'FILLED' | 'SIMULATED';
  delta?: number;
  markIv?: number;
  bestBid?: number;
  bestAsk?: number;
}

interface CondorSetup {
  underlying: string;
  spotPrice: number;
  expiry: string;
  expiryFormatted: string;
  expiryTimestamp: number;
  targetPutStrike: number;
  targetCallStrike: number;
  targetPutHedgePremium: number;
  targetCallHedgePremium: number;
  legs: {
    shortPut: CondorLeg;
    shortCall: CondorLeg;
    longPutHedge: CondorLeg;
    longCallHedge: CondorLeg;
  };
  totalCreditUSD: number;
  totalDebitUSD: number;
  netCreditUSD: number;
  netCreditPercent: number;
  lowerBreakeven: number;
  upperBreakeven: number;
  maxProfitUSD: number;
  maxLossUSD: number;
  riskRewardRatio: string;
  marginRequiredUSD: number;
  contractValue: number;
}

interface ActiveCondorPosition {
  id: string;
  underlying: string;
  expiry: string;
  expiryTimestamp: number;
  contracts: number;
  entrySpotPrice: number;
  entryTime: number;
  executedAtIST: string;
  legs: {
    shortPut: CondorLeg;
    shortCall: CondorLeg;
    longPutHedge: CondorLeg;
    longCallHedge: CondorLeg;
  };
  entryNetCreditUSD: number;
  currentPnlUSD: number;
  currentPnlPercent: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CLOSED';
  mode: string;
}

interface OptionsStatusResponse {
  autoScheduleEnabled: boolean;
  scheduleTimeIST: string;
  currentIST: string;
  currentTimeStrIST: string;
  nextRunIn: string;
  underlying: string;
  otmPercent: number;
  hedgePremiumPercent: number;
  defaultContracts: number;
  lastExecutedDateIST: string;
  hasExecutedToday: boolean;
  liveSetup: CondorSetup | null;
  activeCondors: ActiveCondorPosition[];
  historyCount: number;
}

export const OptionsCondorDashboard: React.FC = () => {
  const [data, setData] = useState<OptionsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<number>(10);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/options/status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.defaultContracts) setSelectedContracts(json.defaultContracts);
      }
    } catch (e) {
      console.error('Failed to load Options Condor data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [activePineTab, setActivePineTab] = useState<'5pct' | 'sniper' | 'engine'>('5pct');
  const [pineCode, setPineCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingPine, setLoadingPine] = useState(false);

  const fetchPineScript = async (type: '5pct' | 'sniper' | 'engine') => {
    setLoadingPine(true);
    try {
      const res = await fetch(`/api/indicators/ironcondor?type=${type}`);
      const json = await res.json();
      if (json.pinescript) {
        setPineCode(json.pinescript);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPine(false);
    }
  };

  const handleOpenIndicators = (type: '5pct' | 'sniper' | 'engine' = '5pct') => {
    setActivePineTab(type);
    setShowIndicatorModal(true);
    fetchPineScript(type);
  };

  const handleCopyPine = () => {
    navigator.clipboard.writeText(pineCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSchedule = async () => {
    if (!data) return;
    const newEnabled = !data.autoScheduleEnabled;
    try {
      await fetch('/api/options/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoScheduleEnabled: newEnabled }),
      });
      fetchStatus();
      setToastMessage({
        text: `Daily 5:30 PM IST Auto-Deploy ${newEnabled ? 'ACTIVATED' : 'PAUSED'}`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeployNow = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/options/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contracts: selectedContracts,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage({
          text: `🎯 4-Leg 5% Strangle + Hedges successfully deployed on Delta!`,
          type: 'success',
        });
        fetchStatus();
      } else {
        setToastMessage({
          text: json.message || 'Deployment error',
          type: 'error',
        });
      }
      setTimeout(() => setToastMessage(null), 5000);
    } catch (e: any) {
      setToastMessage({ text: e.message, type: 'error' });
    } finally {
      setDeploying(false);
    }
  };

  const handleCloseCondor = async (id: string) => {
    try {
      const res = await fetch('/api/options/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage({ text: 'Condor position closed successfully', type: 'success' });
        fetchStatus();
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const setup = data?.liveSetup;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-2xl transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Banner: 5:30 PM IST Daily Automation Clock */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>DAILY 5:30 PM IST STRATEGY</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                IRON CONDOR (5% STRANGLE + 10% HEDGES)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Delta 5:30 PM Option Chain Shield</span>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Spot price se <strong className="text-emerald-400">5% niche Put Sell</strong> aur <strong className="text-emerald-400">5% upar Call Sell</strong>. Saath me dono premiums ke <strong className="text-indigo-400">10% premium wale OTM strikes buy</strong> karke 90% net credit capture aur 100% loss-protection!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Clock & Schedule Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 px-4 min-w-[200px]">
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Current IST Clock:</span>
                <span className="text-amber-400 font-bold">{data?.currentTimeStrIST || '--:--'}</span>
              </div>
              <div className="text-lg font-mono font-bold text-white mt-0.5">
                Next: <span className="text-indigo-400">5:30 PM IST</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <span>Runs in:</span>
                <span className="text-emerald-400 font-semibold">{data?.nextRunIn || 'Loading...'}</span>
              </div>
            </div>

            {/* Daily Auto-Scheduler Toggle */}
            <button
              onClick={handleToggleSchedule}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-bold text-xs transition-all shadow-lg ${
                data?.autoScheduleEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {data?.autoScheduleEnabled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>5:30 PM Auto-Deploy: ACTIVE</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>5:30 PM Auto-Deploy: PAUSED</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleOpenIndicators('5pct')}
              className="px-3 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg"
              title="View Nexvora Iron Condor TradingView PineScript"
            >
              <Code className="w-4 h-4 text-indigo-400" />
              <span>Nexvora Pine Indicator</span>
            </button>

            <button
              onClick={() => { setRefreshing(true); fetchStatus(); }}
              disabled={refreshing}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all"
              title="Refresh Chain"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Visual 4-Leg Strike & Payoff Architecture */}
      {setup && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Live Delta 4-Leg Setup (BTCUSD)</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Expiry: {setup.expiryFormatted}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span>Live BTC Spot:</span>
              <span className="text-white font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                ${setup.spotPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Visual Strike Spectrum Bar */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>PUT SIDE (DOWNSIDE WINGS)</span>
              <span className="text-amber-300 font-bold">ATM SPOT (${setup.spotPrice.toLocaleString()})</span>
              <span>CALL SIDE (UPSIDE WINGS)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Leg 3: Long Put Wing */}
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-center">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                  BUY Long Put Hedge
                </span>
                <div className="text-lg font-black text-white mt-0.5 font-mono">
                  ${setup.legs.longPutHedge.strike.toLocaleString()}
                </div>
                <div className="text-xs text-indigo-300 font-mono mt-0.5">
                  Cost: ${setup.legs.longPutHedge.premium} (~10% Prem)
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {setup.legs.longPutHedge.symbol}
                </div>
              </div>

              {/* Leg 1: Short Put */}
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-center shadow-lg">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide flex items-center justify-center gap-1">
                  <span>SELL Short Put (-5%)</span>
                </span>
                <div className="text-lg font-black text-emerald-400 mt-0.5 font-mono">
                  ${setup.legs.shortPut.strike.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-300 font-mono mt-0.5">
                  Collect: +${setup.legs.shortPut.premium} Premium
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {setup.legs.shortPut.symbol}
                </div>
              </div>

              {/* Leg 2: Short Call */}
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-center shadow-lg">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide flex items-center justify-center gap-1">
                  <span>SELL Short Call (+5%)</span>
                </span>
                <div className="text-lg font-black text-emerald-400 mt-0.5 font-mono">
                  ${setup.legs.shortCall.strike.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-300 font-mono mt-0.5">
                  Collect: +${setup.legs.shortCall.premium} Premium
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {setup.legs.shortCall.symbol}
                </div>
              </div>

              {/* Leg 4: Long Call Wing */}
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-center">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                  BUY Long Call Hedge
                </span>
                <div className="text-lg font-black text-white mt-0.5 font-mono">
                  ${setup.legs.longCallHedge.strike.toLocaleString()}
                </div>
                <div className="text-xs text-indigo-300 font-mono mt-0.5">
                  Cost: ${setup.legs.longCallHedge.premium} (~10% Prem)
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {setup.legs.longCallHedge.symbol}
                </div>
              </div>
            </div>
          </div>

          {/* Financials & Execution Control Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Total Strangle Credit:</span>
              <span className="text-base font-black text-white font-mono">+${setup.totalCreditUSD}</span>
              <span className="text-[10px] text-slate-500 block">Short Put + Short Call</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Total Wings Cost:</span>
              <span className="text-base font-black text-rose-400 font-mono">-${setup.totalDebitUSD}</span>
              <span className="text-[10px] text-slate-500 block">{(setup.totalDebitUSD/setup.totalCreditUSD*100).toFixed(1)}% of credit</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-300 block font-semibold">Net Retained Credit:</span>
              <span className="text-base font-black text-emerald-400 font-mono">+${setup.netCreditUSD}</span>
              <span className="text-[10px] text-emerald-500 block font-bold">{setup.netCreditPercent}% Kept</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Safe Range:</span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                ${setup.lowerBreakeven.toLocaleString()} – ${setup.upperBreakeven.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">Breakeven Range</span>
            </div>

            <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Contracts:</span>
                <span className="font-mono font-bold text-white">{selectedContracts} ({selectedContracts * 0.001} BTC)</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {[10, 25, 50, 100].map(cnt => (
                  <button
                    key={cnt}
                    onClick={() => setSelectedContracts(cnt)}
                    className={`px-2 py-0.5 text-[10px] rounded font-mono font-bold transition-all ${
                      selectedContracts === cnt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>
                Daily auto-execution roz sham ko <strong>5:30 PM IST</strong> par automated run hoga. Abhi test karne ke liye manual 1-click deploy karein.
              </span>
            </div>

            <button
              onClick={handleDeployNow}
              disabled={deploying}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {deploying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deploying 4 Legs on Delta...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Deploy 5% Strangle + Hedges Now</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* Active Deployed Condors Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Active Options Shield Positions</h3>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              {data?.activeCondors?.length || 0} Open Condors
            </span>
          </div>
        </div>

        {(!data?.activeCondors || data.activeCondors.length === 0) ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl">
            <Shield className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No active Options Condors currently open</p>
            <p className="text-xs text-slate-500 mt-1">
              Position will automatically deploy daily at 5:30 PM IST or when you click "Deploy Now".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.activeCondors.map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {c.status}
                    </span>
                    <span className="font-bold text-white font-mono text-sm">{c.underlying} 4-LEG IRON CONDOR</span>
                    <span className="text-xs font-mono text-slate-400">({c.contracts} contracts / {c.contracts * 0.001} BTC)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Unrealized PnL:</span>
                      <span className={`text-sm font-black font-mono ${c.currentPnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.currentPnlUSD >= 0 ? '+' : ''}${c.currentPnlUSD} ({c.currentPnlPercent}%)
                      </span>
                    </div>

                    <button
                      onClick={() => handleCloseCondor(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 text-xs font-bold transition-all"
                    >
                      Close Legs
                    </button>
                  </div>
                </div>

                {/* 4 Leg Status Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-indigo-400 block font-bold">LONG PUT HEDGE</span>
                    <span className="text-white font-semibold">{c.legs.longPutHedge.symbol}</span>
                    <span className="text-[10px] text-slate-400 block">Entry: ${c.legs.longPutHedge.premium}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-emerald-400 block font-bold">SHORT PUT (-5%)</span>
                    <span className="text-white font-semibold">{c.legs.shortPut.symbol}</span>
                    <span className="text-[10px] text-slate-400 block">Entry: +${c.legs.shortPut.premium}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-emerald-400 block font-bold">SHORT CALL (+5%)</span>
                    <span className="text-white font-semibold">{c.legs.shortCall.symbol}</span>
                    <span className="text-[10px] text-slate-400 block">Entry: +${c.legs.shortCall.premium}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-indigo-400 block font-bold">LONG CALL HEDGE</span>
                    <span className="text-white font-semibold">{c.legs.longCallHedge.symbol}</span>
                    <span className="text-[10px] text-slate-400 block">Entry: ${c.legs.longCallHedge.premium}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1">
                  <span>Deployed at: {c.executedAtIST}</span>
                  <span>Entry Net Credit: +${c.entryNetCreditUSD} per BTC</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {/* PineScript Indicator Modal */}
      {showIndicatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Nexvora Iron Condor TradingView Pine Script</h3>
              </div>
              <button 
                onClick={() => setShowIndicatorModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Script Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
              <button
                onClick={() => { setActivePineTab('5pct'); fetchPineScript('5pct'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePineTab === '5pct'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                15M 5% Daily Condor (PRO)
              </button>
              <button
                onClick={() => { setActivePineTab('sniper'); fetchPineScript('sniper'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePineTab === 'sniper'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Multi-Asset Band Sniper (PRO)
              </button>
              <button
                onClick={() => { setActivePineTab('engine'); fetchPineScript('engine'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePineTab === 'engine'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Dynamic Corridor Engine
              </button>

              <div className="ml-auto">
                <button
                  onClick={handleCopyPine}
                  disabled={!pineCode || loadingPine}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy for TradingView'}</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-slate-300">
              {loadingPine ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading Pine Script code...
                </div>
              ) : (
                <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-indigo-900 selection:text-white">
                  {pineCode || '// Click Copy to load into TradingView'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
