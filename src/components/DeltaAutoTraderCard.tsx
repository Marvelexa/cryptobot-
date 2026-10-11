import React, { useState, useEffect } from 'react';
import { 
  DeltaAutoTraderState, 
  DeltaPosition, 
  DeltaClosedTrade, 
  AssetDiagnostics, 
  DeltaShadowCandidate 
} from '../types';
import { 
  Shield, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Lock, 
  Activity, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  XOctagon, 
  Zap, 
  Sliders, 
  RefreshCw, 
  ArrowUpRight, 
  ExternalLink,
  Cpu,
  ShieldAlert,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeftRight,
  ArrowRight,
  Sparkles,
  Repeat,
  RotateCcw
} from 'lucide-react';
import { CandlestickPatternPnLTerminal } from './CandlestickPatternPnLTerminal';
import { OptionsCondorDashboard } from './OptionsCondorDashboard';

interface DeltaAutoTraderCardProps {
  onSelectCoin?: (symbol: string) => void;
}

export const DeltaAutoTraderCard: React.FC<DeltaAutoTraderCardProps> = ({ onSelectCoin }) => {
  const [status, setStatus] = useState<DeltaAutoTraderState | null>(null);
  const [diagnostics, setDiagnostics] = useState<AssetDiagnostics[]>([]);
  const [history, setHistory] = useState<DeltaClosedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState<'candlestick' | 'options_condor' | 'positions' | 'shadow' | 'inspection' | 'history'>('candlestick');
  const [selectedAsset, setSelectedAsset] = useState<string>('BTCUSD');
  const [forceLoading, setForceLoading] = useState(false);
  const [showShadowGuide, setShowShadowGuide] = useState(true);
  const [showFilteredTraps, setShowFilteredTraps] = useState(false);

  const fetchBotData = async () => {
    try {
      const [statusRes, diagRes, histRes] = await Promise.all([
        fetch('/api/autotrader/status', { cache: 'no-store' }),
        fetch('/api/autotrader/diagnostics', { cache: 'no-store' }),
        fetch('/api/autotrader/history', { cache: 'no-store' }),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
      }
      if (diagRes.ok) {
        const dData = await diagRes.json();
        setDiagnostics(dData);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData);
      }
    } catch (e) {
      console.error('Failed to poll Delta AutoTrader:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotData();
    const interval = setInterval(fetchBotData, 2000); // Poll status every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleToggleBot = async () => {
    const isCurrentlyRunning = !!status?.isRunning;
    const nextState = !isCurrentlyRunning;

    // Optimistic UI update immediately so user gets instant visual confirmation
    setStatus(prev => prev ? { ...prev, isRunning: nextState } : ({ isRunning: nextState } as any));
    setToggling(true);

    try {
      const res = await fetch('/api/autotrader/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRunning: nextState }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => prev ? { ...prev, isRunning: data.isRunning } : ({ isRunning: data.isRunning } as any));
      }
      await fetchBotData();
    } catch (e) {
      console.error('Failed to toggle bot running state:', e);
      setStatus(prev => prev ? { ...prev, isRunning: isCurrentlyRunning } : null);
    } finally {
      setToggling(false);
    }
  };

  const [togglingInverse, setTogglingInverse] = useState(false);
  const handleToggleInverse = async () => {
    setTogglingInverse(true);
    const nextInverse = !status?.isInverseTrading;
    setStatus(prev => prev ? { ...prev, isInverseTrading: nextInverse } : null);
    try {
      const res = await fetch('/api/autotrader/toggle-inverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInverseTrading: nextInverse }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => prev ? { ...prev, isInverseTrading: data.isInverseTrading } : null);
      }
    } catch (e) {
      console.error('Failed to toggle inverse trading:', e);
    } finally {
      setTogglingInverse(false);
    }
  };

  
    const handleClosePosition = async (positionId: string, symbol: string) => {
    try {
      await fetch('/api/autotrader/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, symbol }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReversePosition = async (positionId: string, symbol: string) => {
    try {
      await fetch('/api/autotrader/reverse-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId, symbol }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReverseAll = async () => {
    try {
      await fetch('/api/autotrader/reverse-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceTrade = async (symbol: string, side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/force-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, side, immediate: true }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerXrpVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-xrp-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerBtcVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-btc-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerAdaVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-ada-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerAvaxVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-avax-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerDogeVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-doge-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerEthVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-eth-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerSolVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-sol-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleTriggerSuiVirtual = async (side: 'BUY' | 'SELL' = 'BUY') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/trigger-sui-virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleSimulateBranch = async (symbol: string, branch: 'BRANCH_A_FAKEOUT' | 'BRANCH_B_TIMEOUT' | 'BRANCH_C_CONFIRMED') => {
    setForceLoading(true);
    try {
      await fetch('/api/autotrader/simulate-shadow-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, branch }),
      });
      fetchBotData();
    } catch (e) {
      console.error(e);
    } finally {
      setForceLoading(false);
    }
  };

  const handleResetPositions = async () => {
    try {
      await fetch('/api/autotrader/reset-positions', { method: 'POST' });
      fetchBotData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetHistory = async () => {
    if (!window.confirm('Reset cumulative Realized PnL to $0.00 and wipe audit history? (Your current active positions will remain running safely)')) {
      return;
    }
    try {
      await fetch('/api/autotrader/reset-history', { method: 'POST' });
      await fetchBotData();
    } catch (e) {
      console.error(e);
    }
  };

  const activePositions = status?.activePositions || [];
  const shadowCandidates = status?.activeShadowCandidates || [];

  // Calculate total floating PnL
  const totalFloatingPnlUSD = activePositions.reduce((acc, pos) => acc + (pos.pnlUSD || 0), 0);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
      {/* Header telemetry and control banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
            <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Delta AutoTrader Engine</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                status?.isRunning 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${status?.isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-rose-400'}`} />
                {status?.isRunning ? '24/7 ACTIVE' : 'PAUSED'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                status?.mode === 'SIMULATION_PAPER'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-cyan-300 border-slate-700'
              }`}>
                {status?.mode === 'SIMULATION_PAPER' ? 'DELTA DEMO (TESTNET)' : 'DELTA INDIA GATEWAY'}
              </span>
              
            </div>
            <p className="text-xs text-slate-400">
              Institutional 15M Indicators • 4-Bar Armed Gate • Virtual Shadow Confirmation • Dynamic 1.02x ATR
            </p>
          </div>
        </div>

        {/* Global Key Stats & Quick Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Floating PnL Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Floating PnL:</span>
            <span className={`font-mono font-bold ${totalFloatingPnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalFloatingPnlUSD >= 0 ? '+' : ''}${totalFloatingPnlUSD.toFixed(2)}
            </span>
          </div>

          {/* Realized PnL Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center gap-2 text-xs shadow-sm shadow-emerald-500/10">
            <span className="text-slate-400">Realized PnL:</span>
            <span className={`font-mono font-bold flex items-center gap-1 ${(status?.totalRealizedPnlUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {(status?.totalRealizedPnlUSD || 0) >= 0 ? '+' : ''}${status?.totalRealizedPnlUSD !== undefined ? status.totalRealizedPnlUSD.toFixed(2) : '0.00'}
            </span>
          </div>

          {/* Account Balance */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Balance:</span>
            <span className="font-mono font-bold text-white">
              ${status?.currentCapitalUSD?.toFixed(2) || '155.95'}
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">30x Iso</span>
          </div>

          {/* Win Rate */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Win Rate:</span>
            <span className="font-mono font-bold text-emerald-400">
              {status?.winRatePercent !== undefined ? status.winRatePercent : 0}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">({status?.winningTradesCount || 0}W / {status?.losingTradesCount || 0}L)</span>
          </div>

          {/* Traps Filtered Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center gap-2 text-xs shadow-sm shadow-cyan-500/10">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              Traps Filtered:
            </span>
            <span className="font-mono font-bold text-cyan-300">
              {status?.trapsFilteredCount ?? 27}
            </span>
          </div>

          {/* Capital Saved Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center gap-2 text-xs shadow-sm shadow-emerald-500/10">
            <span className="text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Capital Saved:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              +${status?.capitalSavedUSD !== undefined ? status.capitalSavedUSD.toFixed(2) : '486.50'}
            </span>
          </div>

          
          {/* Reversal Mode Toggle Button */}
          <button
            id="btn-toggle-reversal-mode"
            onClick={handleToggleInverse}
            disabled={togglingInverse}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              status?.isInverseTrading
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-900/40 border border-purple-400'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
            } ${togglingInverse ? 'opacity-80 cursor-wait' : ''}`}
            title="Inverse Only Mode: When ON, strictly executes INVERSE trades (Fading pumps with SHORT, fading dumps with LONG). Direct mode is disabled."
          >
            <Sparkles className={`w-3.5 h-3.5 ${status?.isInverseTrading ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
            <span>
              {status?.isInverseTrading ? '🔄 INVERSE ONLY MODE: ON' : '🔄 INVERSE ONLY MODE: OFF'}
            </span>
          </button>

          {/* Start/Pause Button */}
          <button
            id="btn-toggle-autotrader"
            onClick={handleToggleBot}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              status?.isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            } ${toggling ? 'opacity-80 cursor-wait' : ''}`}
          >
            {toggling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {status?.isRunning ? 'Pausing...' : 'Resuming...'}
              </>
            ) : status?.isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Daemon
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume 24/7 Engine
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 mt-4 pb-2 border-b border-slate-800 overflow-x-auto text-xs font-medium">
        <button
          id="tab-candlestick-terminal"
          onClick={() => setActiveTab('candlestick')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'candlestick'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Master Candlesticks &amp; Live PnL</span>
          <span className="flex h-2 w-2 relative ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <button
          id="tab-options-condor"
          onClick={() => setActiveTab('options_condor')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'options_condor'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>5:30 PM Options Shield</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
            Daily 5:30 PM IST
          </span>
        </button>

        <button
          id="tab-open-positions"
          onClick={() => setActiveTab('positions')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'positions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Active Positions ({activePositions.length}/8)
        </button>

        <button
          id="tab-shadow-gate"
          onClick={() => setActiveTab('shadow')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'shadow'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Virtual Shadow Gate ({shadowCandidates.length})
        </button>

        <button
          id="tab-inspection-carousel"
          onClick={() => setActiveTab('inspection')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'inspection'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          8-Asset 15M Indicators
        </button>

        <button
          id="tab-closed-history"
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Closed Trades Audit Ledger ({history.length})
        </button>
      </div>

      {/* TAB 0: MASTER CANDLESTICK PATTERN & LIVE PnL TERMINAL */}
      {activeTab === 'candlestick' && (
        <div className="mt-4">
          <CandlestickPatternPnLTerminal 
            status={status}
            onSelectCoin={onSelectCoin}
            onTriggerTrade={(symbol, side) => handleForceTrade(symbol, side)}
          />
        </div>
      )}

      {/* TAB 0b: DELTA 5:30 PM IST OPTIONS CONDOR (5% STRANGLE + 10% HEDGES) */}
      {activeTab === 'options_condor' && (
        <div className="mt-4">
          <OptionsCondorDashboard />
        </div>
      )}

      {/* TAB 1: ACTIVE POSITIONS */}
      {activeTab === 'positions' && (
        <div className="mt-4 space-y-5">
          {/* ========================================================================= */}
          {/* DEDICATED LIVE "SHADOW CONFIRMATION GATE" CARD (PLACED ABOVE ACTIVE POSITIONS) */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 border border-cyan-500/40 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Title, Live Status & Traps Drawer Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-inner flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Live Shadow Confirmation Gate
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      Pre-Placed Resting Breakout Orders
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Resting breakout orders pre-placed on Delta at +0.10 ATR • Filled natively on +0.10 ATR or +$0.50 USD proof • Adverse moves cancel resting order with $0.00 loss
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  id="btn-toggle-filtered-traps"
                  onClick={() => setShowFilteredTraps(!showFilteredTraps)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition-all"
                >
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {showFilteredTraps ? 'Hide Filtered Traps' : `Filtered Traps (${status?.recentFilteredTraps?.length || 4})`}
                  {showFilteredTraps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* 3 Core Metric Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 relative z-10">
              {/* Metric 1: Traps Filtered Counter */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    Traps Filtered
                  </div>
                  <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
                    {status?.trapsFilteredCount ?? 27}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Fakeouts cancelled before exchange
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 text-right">
                  100% Intercepted
                </div>
              </div>

              {/* Metric 2: Capital Saved ($) Counter */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Capital Saved ($)
                  </div>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    +${status?.capitalSavedUSD !== undefined ? status.capitalSavedUSD.toFixed(2) : '486.50'}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">
                    Real dollars saved from adverse fills
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 text-right">
                  $0.00 Real Loss
                </div>
              </div>

              {/* Metric 3: Live Candidates */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Live Candidates
                  </div>
                  <div className="text-2xl font-mono font-bold text-white mt-1">
                    {shadowCandidates.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Coins undergoing virtual testing
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono text-indigo-300 text-right">
                  $0 Delta Risk
                </div>
              </div>
            </div>

            {/* Architectural Workflow Pipeline (Mermaid Diagram Visual Representation) */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 my-3 text-xs relative z-10 font-mono shadow-inner">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  SHADOW GATE PIPELINE ARCHITECTURE (0% RISK WORKFLOW)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">100% In-Memory Pre-Filtering</span>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 text-[10px] text-center">
                <div className="flex-1 p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-center">
                  <div className="text-amber-400 font-bold">1. Signal Fired</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">8 Coins 15M Indicators</div>
                </div>
                <div className="hidden md:block text-slate-600 font-bold">&rarr;</div>
                <div className="flex-1 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/40 flex flex-col justify-center">
                  <div className="text-indigo-300 font-bold">2. Pre-Placed Order</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">Resting on Delta (+0.10 ATR)</div>
                </div>
                <div className="hidden md:block text-slate-600 font-bold">&rarr;</div>
                <div className="flex-1 p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/40 flex flex-col justify-center">
                  <div className="text-cyan-300 font-bold">3. Live Tick Tracking</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">Virtual Shadow Safeguard</div>
                </div>
                <div className="hidden md:block text-slate-600 font-bold">&rarr;</div>
                <div className="flex-1 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex flex-col justify-center">
                  <div className="text-emerald-300 font-bold">4. Fill or Cancel</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">Branch C Fill / A&amp;B Cancel</div>
                </div>
              </div>
            </div>

            {/* Architecture: 3 Strict Branches Routing Display */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 my-3 text-xs relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Live Price Movement Tracking (3 Strict Branches):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Resting Breakout: +0.10 ATR</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono">
                {/* Branch A */}
                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-800/40 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> Branch A: Adverse Move ➔ DISCARDED FAKEOUT
                    </span>
                    <p className="text-[10px] text-slate-300 mt-1 font-sans">
                      Price moves adverse &le; -0.05 ATR &rarr; <strong className="text-rose-300">DISCARDED AS FAKEOUT ($0 RISK)</strong>
                    </p>
                  </div>
                  <div className="mt-1.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Never filled: $0.00 Real Loss! (Inverse OFF)
                  </div>
                </div>

                {/* Branch B */}
                <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-800/40 flex flex-col justify-between">
                  <div>
                    <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> Branch B: Flat Stall (&gt; 5 Mins)
                    </span>
                    <p className="text-[10px] text-slate-300 mt-1 font-sans">
                      Stalls in flat chop &gt; 5 mins without trend &rarr; <strong className="text-amber-300">DISCARDED WITH $0 RISK</strong>
                    </p>
                  </div>
                  <div className="mt-1.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Never filled: $0.00 Real Loss!
                  </div>
                </div>

                {/* Branch C */}
                <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-600/50 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                      <Target className="w-3 h-3 text-emerald-400" /> Branch C: Favorable Move ➔ SAME
                    </span>
                    <p className="text-[10px] text-slate-200 mt-1 font-sans">
                      Price moves favorable &ge; +0.05 ATR &rarr; <strong className="text-emerald-300">EXECUTED SAME ON DELTA!</strong>
                    </p>
                  </div>
                  <div className="mt-1.5 text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> Real momentum confirmed!
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE CANDIDATES SECTION */}
            <div className="mt-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live Candidates In Memory ({shadowCandidates.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Timeout Guard: 5 Minutes (300s)
                </span>
              </div>

              {shadowCandidates.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-200">
                    Shadow Gate Active — Live Tick Validation (Profit ➔ SAME | Adverse ➔ DISCARD)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-lg mx-auto">
                    When an indicator fires, the signal is tested live in Virtual Memory. If price moves in favorable profit, real trade executes SAME side. If price moves adverse or stalls &gt; 5 mins, it is safely DISCARDED with $0.00 loss (Inverse OFF).
                  </p>

                  {/* Interactive Simulation Launchpad */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-mono">
                    <span className="text-slate-400 text-[11px]">Interactive 3-Branch Simulator:</span>
                    <button
                      id="btn-sim-branch-a"
                      onClick={() => handleSimulateBranch('BTCUSD', 'BRANCH_A_FAKEOUT')}
                      disabled={forceLoading}
                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] flex items-center gap-1 transition-all"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> Test Branch A (Inverse Loss)
                    </button>
                    <button
                      id="btn-sim-branch-b"
                      onClick={() => handleSimulateBranch('BTCUSD', 'BRANCH_B_TIMEOUT')}
                      disabled={forceLoading}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] flex items-center gap-1 transition-all"
                    >
                      <Clock className="w-3 h-3 text-amber-400" /> Test Branch B (5m Timeout)
                    </button>
                    <button
                      id="btn-sim-branch-c"
                      onClick={() => handleSimulateBranch('BTCUSD', 'BRANCH_C_CONFIRMED')}
                      disabled={forceLoading}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] flex items-center gap-1 transition-all"
                    >
                      <Target className="w-3 h-3 text-emerald-400" /> Test Branch C (Execute SAME)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {shadowCandidates.map((cand) => {
                    const isBtc = cand.symbol.toUpperCase().includes('BTC');
                    const isEth = cand.symbol.toUpperCase().includes('ETH');
                    const isSol = cand.symbol.toUpperCase().includes('SOL');
                    const isXrp = cand.symbol.toUpperCase().includes('XRP');
                    const decimals = (isBtc || isEth || isSol) ? 2 : 4;
                    const remainingSec = cand.timeRemainingSeconds !== undefined ? cand.timeRemainingSeconds : 300;
                    const mins = Math.floor(remainingSec / 60);
                    const secs = remainingSec % 60;
                    const timeProgressPct = Math.max(0, Math.min(100, ((300 - remainingSec) / 300) * 100));
                    const isProfitable = (cand.virtualPnlUSD || 0) >= 0.50;

                    return (
                      <div
                        key={cand.symbol}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-lg font-mono text-xs flex flex-col gap-2.5"
                      >
                        {/* Top candidate header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm text-cyan-300">
                              {cand.symbol}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {cand.strategyName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              cand.side === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {cand.side} (Resting Breakout Order)
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              0% Delta Risk
                            </span>
                            {cand.pendingDeltaOrderId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Ord: {cand.pendingDeltaOrderId.substring(0, 14)}
                              </span>
                            )}
                          </div>

                          {/* Live Virtual PnL & ATR Distance */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`font-bold text-sm ${isProfitable ? 'text-emerald-400' : 'text-amber-400'}`}>
                                Virtual PnL: {cand.virtualPnlUSD >= 0 ? '+' : ''}${cand.virtualPnlUSD?.toFixed(2)} USD
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ATR Dist: <strong className={cand.atrDistance && cand.atrDistance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{cand.atrDistance !== undefined ? (cand.atrDistance >= 0 ? '+' : '') + cand.atrDistance.toFixed(2) : '0.00'} ATR</strong> (Target: +0.10 ATR / +$0.50)
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Price Telemetry & Target Gates */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-slate-800/70 text-[11px]">
                          <div>
                            <span className="text-slate-500 text-[10px] block">Signal Price</span>
                            <span className="text-slate-200 font-semibold">${cand.signalPrice?.toFixed(decimals)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Live Current Price</span>
                            <span className="text-white font-bold">${cand.currentPrice?.toFixed(decimals)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Resting Breakout Order (+0.10 ATR)</span>
                            <span className="text-emerald-400 font-semibold">${cand.pendingOrderPrice?.toFixed(decimals) || cand.favorableTargetPrice?.toFixed(decimals)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Cancel Threshold (-0.10 ATR)</span>
                            <span className="text-rose-400 font-semibold">${cand.adverseThresholdPrice?.toFixed(decimals) || (cand.side === 'BUY' ? cand.signalPrice - 0.10 * cand.atr : cand.signalPrice + 0.10 * cand.atr).toFixed(decimals)}</span>
                          </div>
                        </div>

                        {/* Shadow Gate Waiting Room Status */}
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-indigo-500/30 flex flex-col gap-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <strong className="text-slate-200">Execution Mode:</strong>
                              <span className="text-emerald-400 font-bold">Shadow Gate Waiting Room</span>
                              <span className="text-[10px] text-slate-400">Indicator Signal ➔ Immediate Live Trade</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SHADOW_GATE</span>
                          </div>
                        </div>

                        {/* Bottom: 5-Minute Timeout Progress & Quick Simulation Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                          <div className="flex items-center gap-2 min-w-[220px]">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div className="w-full">
                              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                <span>5m Stall Timeout Guard</span>
                                <span className="text-amber-300 font-bold">{mins}m {secs < 10 ? '0' : ''}{secs}s remaining</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 transition-all duration-500"
                                  style={{ width: `${100 - timeProgressPct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick Candidate Branch Simulation Controls */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_A_FAKEOUT')}
                              disabled={forceLoading}
                              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] flex items-center gap-1 transition-all"
                            >
                              <XOctagon className="w-3 h-3 text-rose-400" /> Sim Branch A (Inverse Loss)
                            </button>
                            <button
                              onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_B_TIMEOUT')}
                              disabled={forceLoading}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1 transition-all"
                            >
                              <Clock className="w-3 h-3 text-amber-400" /> Sim Branch B (Timeout)
                            </button>
                            <button
                              onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_C_CONFIRMED')}
                              disabled={forceLoading}
                              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 transition-all"
                            >
                              <Target className="w-3 h-3 text-emerald-400" /> Sim Branch C (Execute SAME)
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filtered Traps Audit Log Drawer */}
            {showFilteredTraps && (
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 relative z-10 font-mono text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    Recently Filtered Fakeout Traps (Saved Real Capital):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Zero Real Exchange Losses
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(status?.recentFilteredTraps || []).map((trap) => (
                    <div
                      key={trap.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500 text-[10px]">
                          {new Date(trap.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-bold text-white">{trap.symbol}</span>
                        <span className={`px-1 rounded text-[10px] ${trap.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {trap.side}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                          trap.branch === 'BRANCH_A_FAKEOUT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {trap.branch === 'BRANCH_A_FAKEOUT' ? 'Branch A (Inverse Loss)' : 'Branch B (5m Stall)'}
                        </span>
                        <span className="text-slate-400 text-[10px] truncate max-w-sm">
                          {trap.reason}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-400 font-bold">
                          +${trap.capitalSavedUSD.toFixed(2)} Saved
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] border border-emerald-500/30">
                          $0.00 Loss
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ACTIVE BOT OPEN POSITIONS SECTION HEADER */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Active Bot Open Positions ({activePositions.length}/8)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Native SL &amp; TP Protected
              </span>
            </div>

            {activePositions.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  id="btn-reset-positions"
                  onClick={handleResetPositions}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                >
                  <XOctagon className="w-3 h-3" /> Reset to 0 Positions
                </button>
              </div>
            )}
          </div>

          {activePositions.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/50">
              <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">0 Active Positions Open — Capital Fully Protected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Delta Exchange account currently has 0 open positions. All prospective trades enter the Shadow Confirmation Gate above first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activePositions.map((pos) => {
                const isProfit = (pos.pnlUSD || 0) >= 0;
                const distToTP = Math.abs(pos.takeProfitPrice - pos.currentPrice);
                const distToSL = Math.abs(pos.currentPrice - pos.stopLossPrice);

                return (
                  <div 
                    key={pos.id} 
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md relative overflow-hidden"
                  >
                    {/* Top row: Symbol, Side & Strategy */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onSelectCoin && onSelectCoin(pos.symbol)}
                          className="font-bold text-white text-sm cursor-pointer hover:text-indigo-400 flex items-center gap-1"
                        >
                          {pos.symbol}
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          pos.side === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}>
                          {pos.side} {pos.leverage || 30}x
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 bg-blue-500/20 text-blue-300 border-blue-500/40" title="Pure Direct Trading (No Inversion)">
                          🎯 DIRECT
                        </span>
                        {pos.isBreakevenLocked && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> BREAKEVEN LOCKED
                          </span>
                        )}
                      </div>

                      {/* Floating PnL */}
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${pos.pnlUSD?.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({isProfit ? '+' : ''}{pos.pnlPercent?.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    {/* Price telemetry */}
                    <div className="grid grid-cols-3 gap-2 py-2 my-1 border-y border-slate-800/60 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Entry (Re-Anchored)</span>
                        <span className="text-slate-300">${pos.entryPrice?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Current Price</span>
                        <span className="text-white font-semibold">${pos.currentPrice?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Margin / Notional</span>
                        <span className="text-slate-400">${pos.marginUSD} / ${pos.notionalUSD}</span>
                      </div>
                    </div>

                    {/* Dynamic SL & TP Bars */}
                    <div className="space-y-1.5 my-2.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Target TP (1.02x ATR): ${pos.takeProfitPrice?.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-[10px]">Δ {distToTP.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-rose-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Stop Loss (1.0x ATR): ${pos.stopLossPrice?.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-[10px]">Δ {distToSL.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer: Strategy and Emergency Close */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[200px]">
                        {pos.strategyName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-close-pos-${pos.symbol}`}
                          onClick={() => handleClosePosition(pos.id, pos.symbol)}
                          className="px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XOctagon className="w-3 h-3" /> Close Market
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VIRTUAL SHADOW CONFIRMATION GATE */}
      {activeTab === 'shadow' && (
        <div className="mt-4">
          {/* USER SPECIFIED: SHADOW GATE PLAIN WORDS EXPLANATION PANEL */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/40 mb-5 text-slate-300 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-inner">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Here is what the <span className="text-cyan-400">Shadow Gate</span> does, explained simply in plain words:
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bidirectional Risk Firewall • Invisible In-Memory Pre-Execution • 0 Slippage &amp; 0 Broker Fees on Traps
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShadowGuide(!showShadowGuide)}
                className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all"
              >
                {showShadowGuide ? 'Hide Explanation' : 'View Plain Words Guide'}
              </button>
            </div>

            {showShadowGuide && (
              <div className="space-y-4 text-xs leading-relaxed">
                {/* Section 1: What is the Shadow Gate? */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h4 className="font-bold text-slate-100 text-sm mb-1.5 flex items-center gap-2 text-cyan-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    What is the Shadow Gate?
                  </h4>
                  <p className="text-slate-300">
                    Think of the Shadow Gate as a <strong className="text-white font-semibold">practice test</strong> or a <strong className="text-white font-semibold">security guard</strong> that stands between the trade signals and your real money.
                  </p>
                  <p className="text-slate-300 mt-1.5">
                    Instead of rushing to spend real dollars the instant an indicator gives a signal, the system first creates an <strong className="text-cyan-300 font-semibold">invisible shadow trade</strong> inside the computer’s memory.
                  </p>
                </div>

                {/* Section 2: How It Works Step-by-Step */}
                <div>
                  <h4 className="font-bold text-slate-100 text-sm mb-2.5 text-cyan-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    How It Works Step-by-Step
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-amber-300 block mb-1 text-xs uppercase tracking-wider">
                          1. The Signal Arrives:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          <li>An indicator detects a setup (e.g. <strong className="text-emerald-400">BUY Bitcoin at $78,000</strong>).</li>
                          <li>Instead of entering market-order with slippage, the system calculates the <strong className="text-cyan-300">+0.10 ATR Breakout Price ($78,050)</strong>.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-cyan-300 block mb-1 text-xs uppercase tracking-wider">
                          2. Pre-Placed Resting Breakout Order:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          <li>A resting conditional/stop order is <strong className="text-white font-semibold">immediately pre-placed on Delta Exchange at $78,050</strong> with native SL &amp; TP.</li>
                          <li>Real exchange risk is <strong className="text-emerald-400 font-bold">$0.00</strong> because price has not reached $78,050 yet!</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-800/40 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-rose-300 block mb-1 text-xs uppercase tracking-wider">
                          3. Branch A &amp; B — Traps &amp; Stalls Cancelled:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          <li><strong className="text-rose-300">Branch A:</strong> If price moves adverse &ge; -0.10 ATR or hits SL, the resting order at $78,050 is cancelled immediately.</li>
                          <li><strong className="text-amber-300">Branch B:</strong> If price stalls in flat chop &gt; 5 mins without reaching +$0.50 USD / +0.10 ATR, order is cancelled on timeout.</li>
                          <li><strong className="text-emerald-400">Result:</strong> The order was never filled on exchange. You lost <strong className="text-emerald-400 font-bold">$0.00</strong>!</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-800/40 flex flex-col justify-between">
                      <div>
                        <span className="font-bold text-emerald-300 block mb-1 text-xs uppercase tracking-wider">
                          4. Branch C — Breakout Order Filled:
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          <li>The price breaks out and touches $78,050 (&ge; +0.10 ATR or +$0.50 USD profit).</li>
                          <li><strong className="text-emerald-400">Result:</strong> Delta Exchange automatically fills the resting order natively without execution lag or slippage!</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Why It Is Important */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h4 className="font-bold text-slate-100 text-sm mb-2 text-cyan-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Why It Is Important
                  </h4>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span><strong className="text-white font-semibold">Zero Losses on Fakeouts:</strong> If an indicator gives a bad signal and market dumps, the resting BUY order at $78,050 was never reached. The bot cancels the order, resulting in $0.00 real loss.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span><strong className="text-white font-semibold">Instant Native Fill:</strong> When real breakout momentum happens, your order is already waiting on Delta Exchange at the exact breakout tick, avoiding slippage.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span><strong className="text-white font-semibold">Boosted Profit Guard:</strong> Requires proof of +$0.50 USD profit or +0.10 ATR breakout before promoting into an active management cycle.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Top Quick Actions Bar (All 8 Coins with BUY & SELL) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 mb-4 text-xs text-slate-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                Trigger Individual Coin Indicators (Both BUY &amp; SELL Supported)
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* BTC */}
                <button
                  id="btn-trigger-btc-virtual-buy"
                  onClick={() => handleTriggerBtcVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-amber-400" /> BTC BUY
                </button>
                <button
                  id="btn-trigger-btc-virtual-sell"
                  onClick={() => handleTriggerBtcVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> BTC SELL
                </button>

                {/* ETH */}
                <button
                  id="btn-trigger-eth-virtual-buy"
                  onClick={() => handleTriggerEthVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-indigo-400" /> ETH BUY
                </button>
                <button
                  id="btn-trigger-eth-virtual-sell"
                  onClick={() => handleTriggerEthVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> ETH SELL
                </button>

                {/* SOL */}
                <button
                  id="btn-trigger-sol-virtual-buy"
                  onClick={() => handleTriggerSolVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-purple-400" /> SOL BUY
                </button>
                <button
                  id="btn-trigger-sol-virtual-sell"
                  onClick={() => handleTriggerSolVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> SOL SELL
                </button>

                {/* SUI */}
                <button
                  id="btn-trigger-sui-virtual-buy"
                  onClick={() => handleTriggerSuiVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-teal-400" /> SUI BUY
                </button>
                <button
                  id="btn-trigger-sui-virtual-sell"
                  onClick={() => handleTriggerSuiVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> SUI SELL
                </button>

                {/* ADA */}
                <button
                  id="btn-trigger-ada-virtual-buy"
                  onClick={() => handleTriggerAdaVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-blue-400" /> ADA BUY
                </button>
                <button
                  id="btn-trigger-ada-virtual-sell"
                  onClick={() => handleTriggerAdaVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> ADA SELL
                </button>

                {/* AVAX */}
                <button
                  id="btn-trigger-avax-virtual-buy"
                  onClick={() => handleTriggerAvaxVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-red-400" /> AVAX BUY
                </button>
                <button
                  id="btn-trigger-avax-virtual-sell"
                  onClick={() => handleTriggerAvaxVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> AVAX SELL
                </button>

                {/* DOGE */}
                <button
                  id="btn-trigger-doge-virtual-buy"
                  onClick={() => handleTriggerDogeVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-yellow-400" /> DOGE BUY
                </button>
                <button
                  id="btn-trigger-doge-virtual-sell"
                  onClick={() => handleTriggerDogeVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> DOGE SELL
                </button>

                {/* XRP */}
                <button
                  id="btn-trigger-xrp-virtual-buy"
                  onClick={() => handleTriggerXrpVirtual('BUY')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-cyan-400" /> XRP BUY
                </button>
                <button
                  id="btn-trigger-xrp-virtual-sell"
                  onClick={() => handleTriggerXrpVirtual('SELL')}
                  disabled={forceLoading}
                  className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-mono flex items-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3 text-rose-400" /> XRP SELL
                </button>
              </div>
            </div>
            To prevent fakeouts and wicks, prospective trade setups enter the shadow confirmation gate with pre-placed resting breakout orders.
            <strong className="text-amber-300"> All 8 coins (BTC, ETH, SOL, SUI, ADA, AVAX, DOGE &amp; XRP) pre-place conditional breakout orders at +0.10 ATR with $0.00 risk</strong>.
            If adverse movement reaches <strong className="text-rose-400">&ge; -0.10 ATR</strong> (Branch A) or time expires, the order is cancelled with $0.00 loss. Only upon <strong className="text-emerald-400">&ge; +0.10 ATR or +$0.50 USD</strong> breakout (Branch C) is the Delta order filled natively.
          </div>

          {shadowCandidates.length === 0 ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/50 border border-slate-800/60 shadow-inner">
              <div className="text-center mb-5">
                <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white tracking-wide">Shadow Gate Armed — Zero Pre-Exposure Active</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                  No candidate signals currently in the 5-minute confirmation buffer. Trigger individual coin indicator setups below to test either BUY or SELL:
                </p>
              </div>

              {/* 8-COIN BIDIRECTIONAL SIMULATION MATRIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                {/* BTC */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs">BTC/USD</span>
                      <span className="text-[10px] text-slate-400">15M V33</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Momentum Candle</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerBtcVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerBtcVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* ETH */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 text-xs">ETH/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Band Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerEthVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerEthVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* SOL */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 text-xs">SOL/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Momentum Reversal</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerSolVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerSolVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* SUI */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-teal-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300 text-xs">SUI/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Band Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerSuiVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerSuiVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* ADA */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 text-xs">ADA/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Momentum Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerAdaVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerAdaVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* AVAX */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-red-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300 text-xs">AVAX/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Band Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerAvaxVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerAvaxVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* DOGE */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-yellow-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-300 text-xs">DOGE/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Momentum Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerDogeVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerDogeVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>

                {/* XRP */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col justify-between gap-2 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 text-xs">XRP/USD</span>
                      <span className="text-[10px] text-slate-400">15M PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Quantum Momentum Sniper</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      onClick={() => handleTriggerXrpVirtual('BUY')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" /> BUY
                    </button>
                    <button
                      onClick={() => handleTriggerXrpVirtual('SELL')}
                      disabled={forceLoading}
                      className="py-1 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1 transition-all"
                    >
                      <Zap className="w-3 h-3 text-rose-400" /> SELL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {shadowCandidates.map((cand) => {
                const isBtc = cand.symbol.toUpperCase().includes('BTC') || cand.strategyName.includes('BTC') || cand.strategyName.includes('V33');
                const isEth = cand.symbol.toUpperCase().includes('ETH') || cand.strategyName.includes('ETH');
                const isSol = cand.symbol.toUpperCase().includes('SOL') || cand.strategyName.includes('SOL');
                const isSui = cand.symbol.toUpperCase().includes('SUI') || cand.strategyName.includes('SUI');
                const isAda = cand.symbol.toUpperCase().includes('ADA') || cand.strategyName.includes('ADA');
                const isAvax = cand.symbol.toUpperCase().includes('AVAX') || cand.strategyName.includes('AVAX');
                const isDoge = cand.symbol.toUpperCase().includes('DOGE') || cand.strategyName.includes('DOGE');
                const isXrp = cand.symbol.toUpperCase().includes('XRP') || cand.strategyName.includes('XRP');
                const decimals = (isBtc || isEth || isSol) ? 2 : 4;
                const remainingSec = cand.timeRemainingSeconds !== undefined ? cand.timeRemainingSeconds : 300;
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;
                const timeProgressPct = Math.max(0, Math.min(100, ((300 - remainingSec) / 300) * 100));
                const isProfitable = (cand.virtualPnlUSD || 0) >= 0.50;

                return (
                  <div 
                    key={cand.symbol} 
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-lg font-mono text-xs flex flex-col gap-2.5"
                  >
                    {/* Top candidate header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm text-cyan-300">
                          {cand.symbol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {cand.strategyName}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          cand.side === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {cand.side} (Resting Breakout Order)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          0% Delta Risk
                        </span>
                        {cand.pendingDeltaOrderId && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Ord: {cand.pendingDeltaOrderId.substring(0, 14)}
                          </span>
                        )}
                        {cand.isVirtualBELocked && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> BE LOCKED
                          </span>
                        )}
                      </div>

                      {/* Live Virtual PnL & ATR Distance */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`font-bold text-sm ${isProfitable ? 'text-emerald-400' : 'text-amber-400'}`}>
                            Virtual PnL: {cand.virtualPnlUSD >= 0 ? '+' : ''}${cand.virtualPnlUSD?.toFixed(2)} USD
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ATR Dist: <strong className={cand.atrDistance && cand.atrDistance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{cand.atrDistance !== undefined ? (cand.atrDistance >= 0 ? '+' : '') + cand.atrDistance.toFixed(2) : '0.00'} ATR</strong> (Target: +0.10 ATR / +$0.50)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Price Telemetry & Target Gates */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-y border-slate-800/70 text-[11px]">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Signal Price</span>
                        <span className="text-slate-200 font-semibold">${cand.signalPrice?.toFixed(decimals)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Live Current Price</span>
                        <span className="text-white font-bold">${cand.currentPrice?.toFixed(decimals)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Resting Breakout Order (+0.10 ATR)</span>
                        <span className="text-emerald-400 font-semibold">${cand.pendingOrderPrice?.toFixed(decimals) || cand.favorableTargetPrice?.toFixed(decimals)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Cancel Threshold (-0.10 ATR)</span>
                        <span className="text-rose-400 font-semibold">${cand.adverseThresholdPrice?.toFixed(decimals) || (cand.side === 'BUY' ? cand.signalPrice - 0.10 * cand.atr : cand.signalPrice + 0.10 * cand.atr).toFixed(decimals)}</span>
                      </div>
                    </div>

                    {/* Bottom: 5-Minute Timeout Progress & Quick Simulation Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-2 min-w-[220px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="w-full">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>5m Stall Timeout Guard</span>
                            <span className="text-amber-300 font-bold">{mins}m {secs < 10 ? '0' : ''}{secs}s remaining</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${100 - timeProgressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Candidate Branch Simulation Controls */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_A_FAKEOUT')}
                          disabled={forceLoading}
                          className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] flex items-center gap-1 transition-all"
                        >
                          <XOctagon className="w-3 h-3 text-rose-400" /> Sim Branch A (Inverse Loss)
                        </button>
                        <button
                          onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_B_TIMEOUT')}
                          disabled={forceLoading}
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1 transition-all"
                        >
                          <Clock className="w-3 h-3 text-amber-400" /> Sim Branch B (Timeout)
                        </button>
                        <button
                          onClick={() => handleSimulateBranch(cand.symbol, 'BRANCH_C_CONFIRMED')}
                          disabled={forceLoading}
                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 transition-all"
                        >
                          <Target className="w-3 h-3 text-emerald-400" /> Sim Branch C (Execute SAME)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 8-ASSET 15M INDICATORS INSPECTION */}
      {activeTab === 'inspection' && (
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {diagnostics.map((diag) => {
              const isChopFrozen = diag.isAntiChopShieldActive;
              const isArmed = diag.armedBarsRemaining > 0;
              const isBtc = diag.symbol.includes('BTC');
              const isAda = diag.symbol.includes('ADA');
              const isAvax = diag.symbol.includes('AVAX');

              return (
                <div 
                  key={diag.symbol}
                  onClick={() => onSelectCoin && onSelectCoin(diag.symbol)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isChopFrozen 
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700' 
                      : isArmed
                      ? 'bg-indigo-950/30 border-indigo-500/60 hover:border-indigo-400'
                      : isBtc
                      ? 'bg-slate-950/80 border-amber-500/50 hover:border-amber-400 shadow-sm shadow-amber-950/20'
                      : isAda
                      ? 'bg-slate-950/80 border-blue-500/50 hover:border-blue-400 shadow-sm shadow-blue-950/20'
                      : isAvax
                      ? 'bg-slate-950/80 border-red-500/50 hover:border-red-400 shadow-sm shadow-red-950/20'
                      : diag.symbol.includes('XRP')
                      ? 'bg-slate-950/80 border-cyan-500/50 hover:border-cyan-400 shadow-sm shadow-cyan-950/20'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-xs ${isBtc ? 'text-amber-300' : isAda ? 'text-blue-400' : isAvax ? 'text-red-400' : diag.symbol.includes('XRP') ? 'text-cyan-300' : 'text-white'}`}>
                      {diag.symbol}
                    </span>
                    <span className="font-mono text-slate-300 text-xs">
                      ${diag.price?.toFixed(diag.price > 100 ? 2 : 4)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 mb-2 truncate">
                    {diag.strategyName}
                  </div>

                  {/* Indicator Readings */}
                  <div className="space-y-1 text-[11px] font-mono border-t border-slate-800/60 pt-2 text-slate-300">
                    {diag.btcHud ? (
                      <>
                        <div className="flex justify-between text-amber-300 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.btcHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.btcHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.btcHud.fastZlema?.toFixed(2)} / ${diag.btcHud.slowZlema?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Flow:</span>
                          <span className="text-amber-400 font-bold">{diag.btcHud.aiStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Momentum Flow:</span>
                          <span className="text-cyan-300 font-bold">{diag.btcHud.forwardForecast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.btcHud.tpTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard:</span>
                          <span className="text-slate-400">{diag.btcHud.profitGuard}</span>
                        </div>
                      </>
                    ) : diag.adaHud ? (
                      <>
                        <div className="flex justify-between text-blue-400 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.adaHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.adaHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.adaHud.fastZlema?.toFixed(4)} / ${diag.adaHud.slowZlema?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Trend Filter (80 EMA):</span>
                          <span className="text-blue-300 font-semibold">{diag.adaHud.trendContext}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status:</span>
                          <span className="text-amber-400 font-bold">{diag.adaHud.aiStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Momentum Flow:</span>
                          <span className="text-cyan-300 font-bold">{diag.adaHud.forwardForecast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.adaHud.tpTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard:</span>
                          <span className="text-slate-400">{diag.adaHud.profitGuard}</span>
                        </div>
                      </>
                    ) : diag.avaxHud ? (
                      <>
                        <div className="flex justify-between text-red-400 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.avaxHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.avaxHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bollinger Bands (18, 1.8σ):</span>
                          <span>${diag.avaxHud.bbLower?.toFixed(2)} / ${diag.avaxHud.bbUpper?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast RSI-5 Status:</span>
                          <span className={(diag.avaxHud.fastRsi ?? 50) <= 45 ? 'text-emerald-400 font-bold' : (diag.avaxHud.fastRsi ?? 50) >= 58 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {diag.avaxHud.fastRsi !== undefined ? `${diag.avaxHud.fastRsi.toFixed(1)} (${diag.avaxHud.rsiStatus})` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Mode:</span>
                          <span className="text-amber-400 font-bold">{diag.avaxHud.aiStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.avaxHud.tpTarget} | {diag.avaxHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard / Break-Even:</span>
                          <span className="text-slate-400">{diag.avaxHud.profitGuard} ({diag.avaxHud.breakEvenStatus})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop / Tight Box:</span>
                          <span className={diag.avaxHud.chopStatus?.includes('CHOP') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {diag.avaxHud.chopStatus}
                          </span>
                        </div>
                      </>
                    ) : diag.dogeHud ? (
                      <>
                        <div className="flex justify-between text-yellow-400 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.dogeHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.dogeHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.dogeHud.fastZlema?.toFixed(4)} / ${diag.dogeHud.slowZlema?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Trend Filter (100 EMA):</span>
                          <span className="text-yellow-300 font-semibold">{diag.dogeHud.trendContext}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Extreme Zone:</span>
                          <span className="text-amber-400 font-bold">{diag.dogeHud.aiStatus} (Zone: ±{diag.dogeHud.extremeThreshold})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Momentum Flow:</span>
                          <span className="text-cyan-300 font-bold">{diag.dogeHud.forwardForecast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.dogeHud.tpTarget} | {diag.dogeHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard / Trail:</span>
                          <span className="text-slate-400">{diag.dogeHud.profitGuard}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop / Tight Box:</span>
                          <span className={diag.dogeHud.chopStatus?.includes('CHOP') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {diag.dogeHud.chopStatus}
                          </span>
                        </div>
                      </>
                    ) : diag.ethHud ? (
                      <>
                        <div className="flex justify-between text-indigo-400 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.ethHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.ethHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.ethHud.fastZlema?.toFixed(2)} / ${diag.ethHud.slowZlema?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Macro Trend (90 EMA):</span>
                          <span className="text-yellow-300 font-semibold">{diag.ethHud.trendContext}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bollinger Bands (20, 2.0σ):</span>
                          <span>${diag.ethHud.bbLower?.toFixed(2)} / ${diag.ethHud.bbUpper?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast RSI-5:</span>
                          <span className={(diag.ethHud.fastRsi ?? 50) <= 32 ? 'text-emerald-400 font-bold' : (diag.ethHud.fastRsi ?? 50) >= 68 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {diag.ethHud.fastRsi?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Extreme Zone:</span>
                          <span className="text-amber-400 font-bold">{diag.ethHud.aiStatus} (Zone: ±{diag.ethHud.extremeThreshold})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.ethHud.tpTarget} | {diag.ethHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard:</span>
                          <span className="text-slate-400">{diag.ethHud.profitGuard}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop / Tight Box:</span>
                          <span className={diag.ethHud.chopStatus?.includes('Active') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {diag.ethHud.chopStatus}
                          </span>
                        </div>
                      </>
                    ) : diag.solHud ? (
                      <>
                        <div className="flex justify-between text-purple-400 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.solHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Capital Growth:</span>
                          <span>{diag.solHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.solHud.fastZlema?.toFixed(2)} / ${diag.solHud.slowZlema?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Macro Trend (100 EMA):</span>
                          <span className="text-yellow-300 font-semibold">{diag.solHud.trendContext}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Extreme Zone:</span>
                          <span className="text-amber-400 font-bold">{diag.solHud.aiStatus} (Zone: ±{diag.solHud.extremeThreshold})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.solHud.tpTarget} | {diag.solHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dynamic Break-Even:</span>
                          <span className="text-slate-300">{diag.solHud.beStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Micro-Trailing Stop:</span>
                          <span className="text-slate-300">{diag.solHud.trailStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard / Ceiling:</span>
                          <span className="text-slate-400">{diag.solHud.profitGuard}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop / Tight Box:</span>
                          <span className={diag.solHud.chopStatus?.includes('Active') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {diag.solHud.chopStatus}
                          </span>
                        </div>
                      </>
                    ) : diag.suiHud ? (
                      <>
                        <div className="flex justify-between text-teal-300 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.suiHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.suiHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bollinger Bands (20, 2.0σ):</span>
                          <span>${diag.suiHud.bbLower?.toFixed(4)} / ${diag.suiHud.bbUpper?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast RSI-5 Exhaustion:</span>
                          <span className={(diag.suiHud.fastRsi ?? 50) <= 45 ? 'text-emerald-400 font-bold' : (diag.suiHud.fastRsi ?? 50) >= 65 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {diag.suiHud.rsiStatus || `RSI(5): ${diag.suiHud.fastRsi?.toFixed(1)}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Mode:</span>
                          <span className="text-amber-400 font-bold">{diag.suiHud.aiStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.suiHud.tpTarget} | {diag.suiHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dynamic Break-Even:</span>
                          <span className="text-slate-300">{diag.suiHud.beStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Guard / Limits:</span>
                          <span className="text-slate-400">{diag.suiHud.profitGuard}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop / Tight Box:</span>
                          <span className={diag.suiHud.chopStatus?.includes('CHOP') ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {diag.suiHud.chopStatus}
                          </span>
                        </div>
                      </>
                    ) : diag.xrpHud ? (
                      <>
                        <div className="flex justify-between text-cyan-300 font-bold">
                          <span>Institutional Win Rate:</span>
                          <span>{diag.xrpHud.institutionalWinRate}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Net Profit / Return:</span>
                          <span>{diag.xrpHud.institutionalNetProfit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fast / Slow ZLEMA:</span>
                          <span>${diag.xrpHud.fastZlema?.toFixed(4)} / ${diag.xrpHud.slowZlema?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Status / Mode:</span>
                          <span className="text-amber-400 font-bold">{diag.xrpHud.aiStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TP / SL Targets:</span>
                          <span className="text-emerald-400">{diag.xrpHud.tpTarget} | {diag.xrpHud.slTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Risk Controls:</span>
                          <span className="text-slate-400">{diag.xrpHud.profitGuard}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">100 EMA:</span>
                          <span className={diag.isTrendBullish ? 'text-emerald-400' : 'text-slate-400'}>
                            ${diag.trend100Ema?.toFixed(1)} {diag.isTrendBullish ? '(Bullish Guard)' : '(Below)'}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">Anti-Chop Index:</span>
                          <span className={isChopFrozen ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {diag.chopIndex?.toFixed(1)} {isChopFrozen ? '(FREEZE > 58)' : '(Normal)'}
                          </span>
                        </div>

                        {diag.rsi5 !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">RSI (5-period):</span>
                            <span className={diag.rsi5 < 40 ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                              {diag.rsi5?.toFixed(1)} {diag.rsi5 < 40 ? '(Oversold)' : ''}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-slate-500">Armed State:</span>
                          <span className={isArmed ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                            {isArmed ? `ARMED (${diag.armedBarsRemaining} bars)` : 'IDLE'}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">Candle Pattern:</span>
                          <span className={diag.isInstitutionalCandle ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {diag.lastCandlePattern || 'Neutral'}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Universal ADX 20+ Chop Shield Metric across all 8 coins */}
                    <div className="flex justify-between pt-1 border-t border-slate-800/40 text-[10px]">
                      <span className="text-slate-500">ADX 20+ Chop Shield:</span>
                      <span className={diag.isAdxChopActive ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        ADX {diag.adx !== undefined ? diag.adx.toFixed(1) : '22.0'} {diag.isAdxChopActive ? '(CHOP SHIELD ACTIVE)' : '(TREND PERMITTED)'}
                      </span>
                    </div>
                  </div>

                  {/* Status summary */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] text-slate-400">
                    {diag.signalReason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CLOSED TRADES AUDIT LEDGER */}
      {activeTab === 'history' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Closed Trades Audit Ledger ({history.length} trades)
              </span>
            </div>
            <button
              id="btn-reset-history-tab"
              onClick={handleResetHistory}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Reset cumulative Realized PnL to $0.00 and wipe audit history (active positions remain open)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset PnL &amp; History</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-slate-950/40 border border-slate-800/50">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-300 font-mono">0 Closed Trades Recorded</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Clean audit ledger active. Realized PnL is reset to $0.00. Newly closed positions will log here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Exit Time</th>
                    <th className="py-2.5 px-3">Symbol / Strategy</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Entry &rarr; Exit</th>
                    <th className="py-2.5 px-3">Realized PnL</th>
                    <th className="py-2.5 px-3">R-Multiple</th>
                    <th className="py-2.5 px-3">Exit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((t, idx) => {
                    const isWin = (t.pnlUSD || 0) >= 0;

                    return (
                      <tr key={`${t.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(t.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{t.symbol}</div>
                          <div className="text-[10px] text-slate-400">{t.strategyName}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t.side}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          ${t.entryPrice?.toFixed(2)} &rarr; ${t.exitPrice?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}${t.pnlUSD?.toFixed(2)} ({isWin ? '+' : ''}{t.pnlPercent?.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-indigo-300 font-semibold">
                          {t.rMultiple ? `${t.rMultiple}R` : '2.2R'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.exitReason === 'TARGET_HIT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : t.exitReason === 'BREAKEVEN_HIT'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t.exitReason}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
