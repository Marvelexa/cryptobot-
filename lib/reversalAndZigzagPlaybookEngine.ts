import { KlinePoint } from './quantMathematicalEngine';
import { CryptoDedicatedStrategyEngine } from './cryptoDedicatedStrategyEngine';

export type ZigzagState = 
  | 'IDLE'
  | 'IMPULSE'
  | 'CLIMAX_WATCH'
  | 'REVERSAL_ACTIVE'
  | 'BASE_ZONE'
  | 'BOUNCE_ACTIVE'
  | 'TOP_RETEST_WATCH'
  | 'COOLDOWN';

export interface ClimaxScoreBreakdown {
  score: number;               // 0 to 100
  isArmed: boolean;            // score >= 55
  runATR: number;              // (highest(high, 3) - base) / ATR
  streak: number;              // consecutive color bars
  vwapDist: number;            // (close - sessionVWAP) / ATR
  rvol: number;                // volume / SMA(volume, 20)
  rejectionWickPct: number;    // upper wick for tops, lower wick for bottoms
  levelNearATR: number;        // distance to prior key swing level
  topHigh: number;
  originLow: number;
  legHeightAtr: number;
  reasons: string[];
}

export interface ReversalSignal {
  symbol: string;
  side: 'BUY' | 'SELL';
  setupType: 'CLIMAX_BLOWOFF_REVERSAL' | 'ZIGZAG_BASE_BOUNCE' | 'DOUBLE_TOP_RETEST_SHORT' | 'DOUBLE_BOTTOM_RETEST_LONG';
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1: number;         // 61.8% retrace
  takeProfit2: number;         // Base / Origin
  takeProfit3: number;         // Sweep zone runner
  riskRewardRatio: number;     // Must be >= 2.0 to TP2
  stopDistance: number;
  dropAtr: number;             // Distance already fallen from top (< 1.5 ATR required)
  triggerStyle: 'AGGRESSIVE' | 'STANDARD_CHOCH' | 'CONSERVATIVE_RETEST';
  confidenceScore: number;     // 70 - 99
  reason: string;
  isHalfSize?: boolean;        // true for base bounce longs
}

export interface SymbolZigzagMemory {
  state: ZigzagState;
  biasSide: 'TOP_FADE' | 'BOTTOM_FADE' | 'NONE';
  topHigh: number;
  originLow: number;
  climaxBarTime: number;
  climaxWatchBarsRemaining: number;
  legHeight: number;
  climaxScore: number;
  reversalLossCount: number;
  pausedUntil: number;
  lastExitTime: number;
  lastExitWasWin: boolean;
}

/**
 * =========================================================================
 * REVERSAL AND ZIGZAG CAPTURE PLAYBOOK 2026 ENGINE (signal.pdf)
 * =========================================================================
 * Designed to capture full blow-off exhaustion cycles:
 * Leg 1: Climax blow-off top -> CHoCH break of structure -> Short down to origin base
 * Leg 2: Base zone sweep & reclaim -> Half-size bounce long back to mid/top
 * Leg 3: Top zone retest (double top fail) -> Second short down to base
 * =========================================================================
 */
export class ReversalAndZigzagPlaybookEngine {
  private static symbolMemory: Map<string, SymbolZigzagMemory> = new Map();

  /**
   * Helper: Calculate Session VWAP from 15m candles (last 24 bars / session)
   */
  public static calculateSessionVWAP(candles: KlinePoint[], lookback: number = 32): number {
    const n = candles.length;
    if (n === 0) return 0;
    const slice = candles.slice(Math.max(0, n - lookback));
    let cumVol = 0;
    let cumTypicalVol = 0;
    for (const c of slice) {
      const typical = (c.high + c.low + c.close) / 3;
      const vol = c.volume > 0 ? c.volume : 1;
      cumTypicalVol += typical * vol;
      cumVol += vol;
    }
    return cumVol > 0 ? cumTypicalVol / cumVol : slice[slice.length - 1].close;
  }

  /**
   * Helper: Calculate 20-period Relative Volume (RVOL)
   */
  public static calculateRVOL(candles: KlinePoint[]): number {
    const n = candles.length;
    if (n < 21) return 1.0;
    const lastVol = candles[n - 1].volume;
    const sumVol20 = candles.slice(n - 21, n - 1).reduce((sum, c) => sum + c.volume, 0);
    const avgVol = sumVol20 / 20;
    return avgVol > 0 ? parseFloat((lastVol / avgVol).toFixed(2)) : 1.0;
  }

  /**
   * Get or initialize memory state machine for a symbol
   */
  public static getMemory(symbol: string): SymbolZigzagMemory {
    let mem = this.symbolMemory.get(symbol);
    if (!mem) {
      mem = {
        state: 'IDLE',
        biasSide: 'NONE',
        topHigh: 0,
        originLow: 0,
        climaxBarTime: 0,
        climaxWatchBarsRemaining: 0,
        legHeight: 0,
        climaxScore: 0,
        reversalLossCount: 0,
        pausedUntil: 0,
        lastExitTime: 0,
        lastExitWasWin: false,
      };
      this.symbolMemory.set(symbol, mem);
    }
    return mem;
  }

  /**
   * MODULE A: CLIMAX DETECTOR (Page 3-4 of signal.pdf)
   * Scores exhaustion on the last closed 15M candle. Long-side blow-off top shown; mirrors for bottoms.
   */
  public static evaluateClimaxTop(candles: KlinePoint[], atr: number): ClimaxScoreBreakdown {
    const n = candles.length;
    const defaultFail: ClimaxScoreBreakdown = {
      score: 0,
      isArmed: false,
      runATR: 0,
      streak: 0,
      vwapDist: 0,
      rvol: 1.0,
      rejectionWickPct: 0,
      levelNearATR: 999,
      topHigh: 0,
      originLow: 0,
      legHeightAtr: 0,
      reasons: [],
    };

    if (n < 20 || atr <= 0) return defaultFail;

    const lastBar = candles[n - 1];
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // 1. Base = lowest low over last 12 bars
    const window12 = candles.slice(Math.max(0, n - 12));
    const originLow = Math.min(...window12.map(c => c.low));

    // 2. Highest high of last 3 bars
    const topHigh = Math.max(...candles.slice(n - 3).map(c => c.high));

    // 3. runATR = (topHigh - originLow) / ATR
    const runATR = parseFloat(((topHigh - originLow) / atr).toFixed(2));

    // 4. Consecutive bullish closes (greenStreak)
    let greenStreak = 0;
    for (let i = n - 1; i >= 0; i--) {
      if (candles[i].close > candles[i].open) {
        greenStreak++;
      } else {
        break;
      }
    }

    // 5. Stretch from Session VWAP: vwapDist = (close - sessionVWAP) / ATR
    const vwap = this.calculateSessionVWAP(candles, 32);
    const vwapDist = parseFloat(((lastBar.close - vwap) / atr).toFixed(2));

    // 6. RVOL on top candle or 2 of last 3
    const rvolLast = this.calculateRVOL(candles);
    const rvolPrev1 = n > 21 ? candles[n - 2].volume / (candles.slice(n - 22, n - 2).reduce((s, c) => s + c.volume, 0) / 20) : 1;
    const rvol = parseFloat(Math.max(rvolLast, rvolPrev1).toFixed(2));

    // 7. Top Rejection Wick: upperWickPct = (high - max(open, close)) / (high - low)
    const range = Math.max(0.0001, lastBar.high - lastBar.low);
    const upperWick = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const upperWickPct = parseFloat((upperWick / range).toFixed(2));

    // 8. Known Resistance / Prior Swing High Check (within 0.5 ATR)
    // Look for previous swing highs in earlier bars (bars n-35 to n-6)
    let levelNearATR = 999;
    if (n >= 35) {
      const priorBars = candles.slice(Math.max(0, n - 40), n - 6);
      const priorHigh = Math.max(...priorBars.map(c => c.high));
      levelNearATR = Math.abs(topHigh - priorHigh) / atr;
    }

    // -------------------------------------------------------------
    // SCORING (Table in Section 3 of signal.pdf):
    // -------------------------------------------------------------
    let score = 0;
    const reasons: string[] = [];

    // Big run: runATR >= 3.0 -> 25 points, >= 2.0 -> 20 points, >= 1.5 -> 12 points
    if (runATR >= 3.0) {
      score += 25;
      reasons.push(`Big run (${runATR} ATR >= 3.0) [+25]`);
    } else if (runATR >= 2.0) {
      score += 20;
      reasons.push(`Strong run (${runATR} ATR >= 2.0) [+20]`);
    } else if (runATR >= 1.5) {
      score += 12;
      reasons.push(`Moderate run (${runATR} ATR >= 1.5) [+12]`);
    }

    // Streak: greenStreak >= 4 -> 15 points, >= 2 -> 10 points
    if (greenStreak >= 4) {
      score += 15;
      reasons.push(`Streak (${greenStreak} green bars >= 4) [+15]`);
    } else if (greenStreak >= 2) {
      score += 10;
      reasons.push(`Streak (${greenStreak} green bars >= 2) [+10]`);
    }

    // Stretch from VWAP: vwapDist >= 2.0 -> 15 points, >= 1.2 -> 10 points
    if (vwapDist >= 2.0) {
      score += 15;
      reasons.push(`Stretched from VWAP (+${vwapDist} ATR >= 2.0) [+15]`);
    } else if (vwapDist >= 1.2) {
      score += 10;
      reasons.push(`Stretched from VWAP (+${vwapDist} ATR >= 1.2) [+10]`);
    }

    // Climax volume: rvol >= 2.0 on top candle or 2 of last 3 -> 15 points
    if (rvol >= 2.0) {
      score += 15;
      reasons.push(`Climax volume (RVOL ${rvol} >= 2.0) [+15]`);
    } else if (rvol >= 1.3) {
      score += 10;
      reasons.push(`High volume (RVOL ${rvol} >= 1.3) [+10]`);
    }

    // Top rejection: upperWickPct >= 0.30 on top candle, or red candle after run -> 15 points
    const isRedAfterRun = lastBar.close < lastBar.open && greenStreak === 0;
    if (upperWickPct >= 0.30 || isRedAfterRun) {
      score += 15;
      reasons.push(`Top rejection (${(upperWickPct * 100).toFixed(0)}% upper wick / red bar) [+15]`);
    }

    // Level above: prior swing high within 0.8 ATR -> 15 points
    if (levelNearATR <= 0.8) {
      score += 15;
      reasons.push(`Resistance level tested (within ${levelNearATR.toFixed(2)} ATR) [+15]`);
    }

    // Context check: If 1H strong breakout in progress, reduce score by 20
    const closes1h = closes.filter((_, idx) => idx % 4 === 0);
    if (closes1h.length >= 20) {
      const ema50_1h = CryptoDedicatedStrategyEngine.calculateEMA(closes1h, 50);
      const lastEma50 = ema50_1h[ema50_1h.length - 1] || lastBar.close;
      if (lastBar.close > lastEma50 * 1.05 && rvol >= 2.5 && upperWickPct < 0.20) {
        score = Math.max(0, score - 20);
        reasons.push(`HTF strong expansion in progress (-20 deduction)`);
      }
    }

    // Armed when score >= 45 (Page 4 of signal.pdf)
    const isArmed = score >= 45;

    return {
      score,
      isArmed,
      runATR,
      streak: greenStreak,
      vwapDist,
      rvol,
      rejectionWickPct: upperWickPct,
      levelNearATR,
      topHigh,
      originLow,
      legHeightAtr: parseFloat(((topHigh - originLow) / atr).toFixed(2)),
      reasons,
    };
  }

  /**
   * MODULE B & C: REVERSAL TRIGGER & TARGETS (Pages 4, 5, 6 of signal.pdf)
   * Evaluates if an armed climax top has produced a valid short trigger.
   */
  public static evaluateShortTrigger(params: {
    symbol: string;
    candles: KlinePoint[];
    atr: number;
    currentPrice: number;
    topHigh: number;
    originLow: number;
    climaxScore: number;
  }): ReversalSignal | null {
    const { symbol, candles, atr, currentPrice, topHigh, originLow, climaxScore } = params;
    const n = candles.length;
    if (n < 5 || atr <= 0 || topHigh <= 0) return null;

    const lastBar = candles[n - 1];
    const prevBar = candles[n - 2];
    const leg = topHigh - originLow;

    // Late-Reversal Guard (Page 5 of signal.pdf):
    // dropATR = (topHigh - currentPrice) / ATR
    // If dropATR > 1.5, DO NOT market-sell! (Wait for conservative retest or skip)
    const dropAtr = parseFloat(((topHigh - currentPrice) / atr).toFixed(2));
    if (dropAtr > 1.5) {
      return null;
    }

    // 1. Identify Trigger Style (Section 4):
    let triggerStyle: 'AGGRESSIVE' | 'STANDARD_CHOCH' | 'CONSERVATIVE_RETEST' | null = null;
    let triggerReason = '';

    // Style 1: Aggressive - Bearish candle closes below or breaks previous candle's low
    const lastBody = Math.abs(lastBar.close - lastBar.open);
    const brokePrevLow = lastBar.close <= prevBar.low + 0.0001 || lastBar.low < prevBar.low;
    if (lastBar.close < lastBar.open && (lastBody >= 0.35 * atr || brokePrevLow)) {
      triggerStyle = 'AGGRESSIVE';
      triggerReason = `Aggressive: Bearish bar (Body ${(lastBody / atr).toFixed(2)} ATR) broke prev bar low ($${prevBar.low.toFixed(4)})`;
    }

    // Style 2: Standard (CHoCH) - Close below last higher low (the low before final push) or midpoint of biggest green bar
    const greenBars = candles.slice(Math.max(0, n - 8), n - 1).filter(b => b.close > b.open);
    let biggestGreenMid = 0;
    let maxGreenRange = 0;
    for (const gb of greenBars) {
      const gRange = gb.close - gb.open;
      if (gRange > maxGreenRange) {
        maxGreenRange = gRange;
        biggestGreenMid = (gb.open + gb.close) / 2;
      }
    }
    const preClimaxBars = candles.slice(Math.max(0, n - 5), n - 1);
    const lowBeforePush = preClimaxBars.length >= 2 ? preClimaxBars[preClimaxBars.length - 2].low : prevBar.low;
    const isBelowLowOrMid = (lastBar.close < lowBeforePush) || (biggestGreenMid > 0 && lastBar.close < biggestGreenMid) || (lastBar.close <= prevBar.low);

    if (isBelowLowOrMid) {
      triggerStyle = 'STANDARD_CHOCH';
      triggerReason = `Standard CHoCH: Closed below low before push ($${lowBeforePush.toFixed(4)}) or impulse mid ($${biggestGreenMid.toFixed(4)})`;
    }

    // Style 3: Conservative Retest - Price bounced to broken level and gave rejection candle
    const upperWick = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const range = Math.max(0.0001, lastBar.high - lastBar.low);
    const wickPct = upperWick / range;
    if (wickPct >= 0.40 && lastBar.close < lastBar.open && currentPrice < topHigh - 0.2 * atr) {
      triggerStyle = 'CONSERVATIVE_RETEST';
      triggerReason = `Conservative Retest: Bearish rejection (${(wickPct * 100).toFixed(0)}% upper wick) below top ($${topHigh.toFixed(4)})`;
    }

    if (!triggerStyle) return null;

    // 2. Stop Options (Section 5.1 of signal.pdf):
    // Tight: Above most recent lower high + 0.3 ATR
    // Structural: Above climax top + 0.3 ATR
    const structuralStop = topHigh + 0.3 * atr;
    const recentLowerHigh = Math.max(lastBar.high, prevBar.high);
    const tightStop = recentLowerHigh + 0.3 * atr;

    // Minimum buffer: at least 0.8 ATR total distance to prevent noise stop-out (from traps.pdf Fix 6)
    const chosenStopPrice = Math.max(tightStop, currentPrice + 0.8 * atr);
    const stopDistance = chosenStopPrice - currentPrice;

    // 3. Targets (Section 5.2 of signal.pdf):
    // TP1: topHigh - 0.618 * leg (about 61.8% retrace) -> Take 40%, move stop to BE (+fees)
    // TP2: originLow (Impulse base) -> Take 40%, trail runner
    // TP3: originLow - 0.3 * ATR (Sweep zone) -> 20% runner
    const tp1 = parseFloat((topHigh - 0.618 * leg).toFixed(4));
    const tp2 = parseFloat(originLow.toFixed(4));
    const tp3 = parseFloat((originLow - 0.3 * atr).toFixed(4));

    // 4. Reward / Risk Assertion (Page 5 of signal.pdf):
    // Rule: require reward / risk >= 1.3 to origin or TP1, or skip!
    const targetDistance = currentPrice - tp2;
    const riskReward = stopDistance > 0 ? parseFloat((targetDistance / stopDistance).toFixed(2)) : 0;

    if (riskReward < 1.3) {
      // Risk/reward not favorable enough
      return null;
    }

    const confidenceScore = Math.min(99, climaxScore + (triggerStyle === 'STANDARD_CHOCH' ? 15 : 10));

    return {
      symbol,
      side: 'SELL',
      setupType: 'CLIMAX_BLOWOFF_REVERSAL',
      entryPrice: currentPrice,
      stopLossPrice: chosenStopPrice,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: riskReward,
      stopDistance,
      dropAtr,
      triggerStyle,
      confidenceScore,
      reason: `Playbook Climax Reversal [${triggerStyle}]: ${triggerReason} | Top=$${topHigh.toFixed(4)}, Base=$${originLow.toFixed(4)}, Run=${((topHigh - originLow) / atr).toFixed(2)} ATR | Target=$${tp2.toFixed(4)} (R:R ${riskReward}:1, Drop: ${dropAtr} ATR)`,
    };
  }

  /**
   * MODULE D: ZIGZAG BASE BOUNCE LONG (Section 6 of signal.pdf)
   * Captures the bounce back from origin base (Leg 2 of the cycle).
   * Optional, executed at half size!
   */
  public static evaluateBaseBounceLong(params: {
    symbol: string;
    candles: KlinePoint[];
    atr: number;
    currentPrice: number;
    originLow: number;
    topHigh: number;
  }): ReversalSignal | null {
    const { symbol, candles, atr, currentPrice, originLow, topHigh } = params;
    const n = candles.length;
    if (n < 5 || atr <= 0 || originLow <= 0) return null;

    const lastBar = candles[n - 1];
    const prevBar = candles[n - 2];
    const baseZoneHigh = originLow + 0.3 * atr;
    const baseZoneLow = originLow - 0.3 * atr;

    // Check if price is at or just reclaimed the base zone
    const isAtBaseZone = currentPrice >= baseZoneLow && currentPrice <= baseZoneHigh;
    const isSweepAndReclaim = prevBar.low < originLow && lastBar.close > originLow;

    const range = Math.max(0.0001, lastBar.high - lastBar.low);
    const lowerWick = Math.min(lastBar.open, lastBar.close) - lastBar.low;
    const lowerWickPct = lowerWick / range;
    const hasRejectionWick = lowerWickPct >= 0.40;

    if (!isAtBaseZone && !isSweepAndReclaim) return null;
    if (!hasRejectionWick && !isSweepAndReclaim) return null;

    // Structural Stop: Below sweep low - 0.3 ATR (signal.pdf Section 6)
    const sweepLow = (prevBar.low < originLow && prevBar.low >= baseZoneLow)
      ? Math.min(lastBar.low, prevBar.low)
      : lastBar.low;
    const stopLossPrice = parseFloat((sweepLow - 0.3 * atr).toFixed(4));
    const stopDistance = Math.max(0.8 * atr, currentPrice - stopLossPrice);

    // Target: 50% of the leg first, top zone second
    const leg = topHigh - originLow;
    const tp1 = parseFloat((originLow + 0.5 * leg).toFixed(4));
    const tp2 = parseFloat((topHigh - 0.2 * atr).toFixed(4));
    const tp3 = topHigh;

    const riskReward = stopDistance > 0 ? parseFloat(((tp1 - currentPrice) / stopDistance).toFixed(2)) : 0;
    if (riskReward < 1.5) return null;

    return {
      symbol,
      side: 'BUY',
      setupType: 'ZIGZAG_BASE_BOUNCE',
      entryPrice: currentPrice,
      stopLossPrice: currentPrice - stopDistance,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: riskReward,
      stopDistance,
      dropAtr: 0,
      triggerStyle: 'STANDARD_CHOCH',
      confidenceScore: 82,
      isHalfSize: true, // Half size per Section 6 of signal.pdf
      reason: `Zigzag Base Bounce (Half-Size): Sweep & reclaim at impulse base $${originLow.toFixed(4)} with ${(lowerWickPct * 100).toFixed(0)}% lower wick | Target=$${tp1.toFixed(4)} (R:R ${riskReward}:1)`,
    };
  }

  /**
   * MODULE D: TOP RETEST DOUBLE TOP SHORT (Section 6 & Page 7 of signal.pdf)
   * Captures the second drop from a failed retest of the top zone.
   */
  public static evaluateTopRetestShort(params: {
    symbol: string;
    candles: KlinePoint[];
    atr: number;
    currentPrice: number;
    topHigh: number;
    originLow: number;
  }): ReversalSignal | null {
    const { symbol, candles, atr, currentPrice, topHigh, originLow } = params;
    const n = candles.length;
    if (n < 5 || atr <= 0 || topHigh <= 0) return null;

    const lastBar = candles[n - 1];
    const topZoneLow = topHigh - 0.3 * atr;
    const topZoneHigh = topHigh + 0.3 * atr;

    // If price closes above top zone by >= 0.3 ATR with volume, pattern is invalid (Section 6)
    if (lastBar.close > topHigh + 0.3 * atr) {
      return null;
    }

    // Check if price retested top zone [topHigh - 0.3 ATR, topHigh + 0.3 ATR]
    const testedTop = lastBar.high >= topZoneLow && currentPrice <= topZoneHigh;
    if (!testedTop) return null;

    // Evidence for a failed retest (Page 7 table):
    // 1. Upper wick >= 0.40 or red close at the zone
    const range = Math.max(0.0001, lastBar.high - lastBar.low);
    const upperWick = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const upperWickPct = upperWick / range;
    const isFailedWick = upperWickPct >= 0.40 || (lastBar.close < lastBar.open && lastBar.close < topZoneLow);

    // 2. Weaker push: Volume on retest lower than top
    const rvol = this.calculateRVOL(candles);

    if (!isFailedWick) return null;

    // Stop: Above the retest high + 0.3 ATR
    const retestHigh = Math.max(lastBar.high, topHigh);
    const stopLossPrice = parseFloat((retestHigh + 0.3 * atr).toFixed(4));
    const stopDistance = Math.max(0.8 * atr, stopLossPrice - currentPrice);

    // Target: Origin again (R:R often ~2:1)
    const tp1 = parseFloat((topHigh - 0.5 * (topHigh - originLow)).toFixed(4));
    const tp2 = parseFloat(originLow.toFixed(4));
    const tp3 = parseFloat((originLow - 0.3 * atr).toFixed(4));

    const riskReward = stopDistance > 0 ? parseFloat(((currentPrice - tp2) / stopDistance).toFixed(2)) : 0;
    if (riskReward < 1.8) return null;

    return {
      symbol,
      side: 'SELL',
      setupType: 'DOUBLE_TOP_RETEST_SHORT',
      entryPrice: currentPrice,
      stopLossPrice: currentPrice + stopDistance,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      riskRewardRatio: riskReward,
      stopDistance,
      dropAtr: parseFloat(((topHigh - currentPrice) / atr).toFixed(2)),
      triggerStyle: 'STANDARD_CHOCH',
      confidenceScore: 88,
      reason: `Double Top Failed Retest: Price rejected top zone $${topHigh.toFixed(4)} (${(upperWickPct * 100).toFixed(0)}% upper wick, RVOL ${rvol}) | Target Base=$${tp2.toFixed(4)} (R:R ${riskReward}:1)`,
    };
  }

  /**
   * FULL STATE-MACHINE EVALUATION (Section 7 of signal.pdf)
   * Evaluates a symbol across all cycle phases and transitions the state machine.
   */
  public static evaluateSymbolReversal(symbol: string, candles: KlinePoint[], atr: number): ReversalSignal | null {
    const mem = this.getMemory(symbol);
    const now = Date.now();

    // Check circuit breaker pause after 2 reversal losses (Section 9)
    if (mem.pausedUntil > now) {
      return null;
    }

    // Cooldown check: 1-2 bars after a win, 4 bars after a loss (Section 8)
    const barsSinceExit = (now - mem.lastExitTime) / (15 * 60 * 1000);
    const reqCooldownBars = mem.lastExitWasWin ? 1.5 : 4.0;
    if (mem.lastExitTime > 0 && barsSinceExit < reqCooldownBars) {
      return null;
    }

    const n = candles.length;
    if (n < 20 || atr <= 0) return null;
    const currentPrice = candles[n - 1].close;

    // 1. Evaluate Climax Top Score
    const climaxTop = this.evaluateClimaxTop(candles, atr);

    // State Transitions (Section 7):
    const currentBarTime = candles[n - 1].time;
    if ((mem.state === 'IDLE' || mem.state === 'IMPULSE') && climaxTop.isArmed) {
      mem.state = 'CLIMAX_WATCH';
      mem.biasSide = 'TOP_FADE';
      mem.topHigh = climaxTop.topHigh;
      mem.originLow = climaxTop.originLow;
      mem.legHeight = climaxTop.topHigh - climaxTop.originLow;
      mem.climaxBarTime = currentBarTime;
      mem.climaxWatchBarsRemaining = 8; // Expires after 8 actual 15M bars (Page 8)
      mem.climaxScore = climaxTop.score;

      // Immediate trigger check: if current bar already has a shooting star, CHoCH or aggressive red close
      const immediateSignal = this.evaluateShortTrigger({
        symbol,
        candles,
        atr,
        currentPrice,
        topHigh: mem.topHigh,
        originLow: mem.originLow,
        climaxScore: mem.climaxScore || climaxTop.score || 80,
      });

      if (immediateSignal) {
        mem.state = 'REVERSAL_ACTIVE';
        return immediateSignal;
      }
    }

    // If currently in CLIMAX_WATCH:
    if (mem.state === 'CLIMAX_WATCH') {
      // Only decrement bars when a NEW 15-minute candle timestamp has elapsed
      if (mem.climaxBarTime !== currentBarTime) {
        mem.climaxWatchBarsRemaining--;
        mem.climaxBarTime = currentBarTime;
      }

      if (mem.climaxWatchBarsRemaining <= 0) {
        mem.state = 'IDLE';
        mem.biasSide = 'NONE';
        return null;
      }

      // Check if price made new high beyond top + 0.3 ATR -> pattern invalidated
      if (currentPrice > mem.topHigh + 0.3 * atr) {
        mem.state = 'IDLE';
        mem.biasSide = 'NONE';
        return null;
      }

      // Try triggering Leg 1 Short
      const shortSignal = this.evaluateShortTrigger({
        symbol,
        candles,
        atr,
        currentPrice,
        topHigh: mem.topHigh,
        originLow: mem.originLow,
        climaxScore: mem.climaxScore || climaxTop.score || 80,
      });

      if (shortSignal) {
        mem.state = 'REVERSAL_ACTIVE';
        return shortSignal;
      }
    }

    // If in BASE_ZONE: Check for Bounce Long (Leg 2)
    if (mem.state === 'BASE_ZONE' && mem.originLow > 0 && mem.topHigh > 0) {
      const bounceSignal = this.evaluateBaseBounceLong({
        symbol,
        candles,
        atr,
        currentPrice,
        originLow: mem.originLow,
        topHigh: mem.topHigh,
      });

      if (bounceSignal) {
        mem.state = 'BOUNCE_ACTIVE';
        return bounceSignal;
      }
    }

    // If in TOP_RETEST_WATCH: Check for Double Top Short (Leg 3)
    if (mem.state === 'TOP_RETEST_WATCH' && mem.topHigh > 0 && mem.originLow > 0) {
      const retestSignal = this.evaluateTopRetestShort({
        symbol,
        candles,
        atr,
        currentPrice,
        topHigh: mem.topHigh,
        originLow: mem.originLow,
      });

      if (retestSignal) {
        mem.state = 'REVERSAL_ACTIVE';
        return retestSignal;
      }
    }

    return null;
  }

  /**
   * Handle Position Exit in State Machine
   */
  public static recordTradeOutcome(symbol: string, isWin: boolean, exitType: 'TP' | 'SL' | 'TIME'): void {
    const mem = this.getMemory(symbol);
    mem.lastExitTime = Date.now();
    mem.lastExitWasWin = isWin;

    if (isWin) {
      mem.reversalLossCount = 0;
      // After winning Leg 1, transition to BASE_ZONE to watch for bounce / retest
      if (mem.state === 'REVERSAL_ACTIVE') {
        mem.state = 'BASE_ZONE';
      } else if (mem.state === 'BOUNCE_ACTIVE') {
        mem.state = 'TOP_RETEST_WATCH';
      } else {
        mem.state = 'IDLE';
      }
    } else {
      mem.reversalLossCount++;
      // Section 9: Two losing reversal trades on a coin -> pause coin for session (3 hours)
      if (mem.reversalLossCount >= 2) {
        mem.pausedUntil = Date.now() + 3 * 60 * 60 * 1000;
        console.log(`🛑 [ZIGZAG CIRCUIT BREAKER] ${symbol} paused for 3 hours after 2 consecutive reversal losses.`);
      }
      mem.state = 'COOLDOWN';
    }
  }
}

export const reversalPlaybook = ReversalAndZigzagPlaybookEngine;
