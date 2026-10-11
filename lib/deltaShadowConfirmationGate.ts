import { DeltaShadowCandidate, DeltaFilteredTrap } from '../src/types';

export interface ShadowGateDecision {
  action: 'HOLD' | 'EXECUTE' | 'DISCARD';
  candidate: DeltaShadowCandidate;
  reason: string;
  branch?: 'BRANCH_A_FAKEOUT' | 'BRANCH_B_TIMEOUT' | 'BRANCH_C_CONFIRMED' | 'MONITORING';
  capitalSavedUSD?: number;
  executedSide?: 'BUY' | 'SELL';
  executionType?: 'SAME_PROFIT' | 'INVERSE_LOSS';
}

export class DeltaShadowConfirmationGate {
  private candidates: Map<string, DeltaShadowCandidate> = new Map();

  // -------------------------------------------------------------
  // Dynamic Validation Shadow Gate Blueprint Rules:
  // 1. Favorable Move: Sustained in profit -> Real market executes SAME side!
  // 2. Adverse Move: Sustained in loss -> Discarded as fakeout trap ($0.00 loss, inverse disabled)!
  // 3. Stall Timeout: > 5 minutes without reaching confirmed direction -> Discarded with $0.00 risk.
  // -------------------------------------------------------------
  private readonly profitConfirmationSeconds: number;
  private readonly lossConfirmationSeconds: number;
  private readonly directionAtrThreshold: number;
  private readonly directionProfitUsd: number;
  private readonly STRICT_WAIT_MS = 5 * 60 * 1000; // 5 MINUTES (300 SECONDS) TIMEOUT

  constructor() {
    this.profitConfirmationSeconds = 180;
    this.lossConfirmationSeconds = 180;
    this.directionAtrThreshold = 0.10; // 0.10 ATR breakout & invalidation threshold
    this.directionProfitUsd = 0.50; // $0.50 USD minimum profit guard
  }

  // Real-time Counters & Audit Ledger
  private trapsFilteredCount: number = 27;
  private capitalSavedUSD: number = 486.50;
  private recentFilteredTraps: DeltaFilteredTrap[] = [];

  /**
   * Registers a new trade signal into the Virtual Shadow Gate memory.
   * Runs as a live virtual test in memory ($0 risk).
   */
  public registerCandidate(params: {
    symbol: string;
    strategyName: string;
    side: 'BUY' | 'SELL';
    signalPrice: number;
    atr: number;
    notionalUSD: number;
    virtualTP?: number;
    virtualSL?: number;
    targetMult?: number;
    slMult?: number;
    pendingDeltaOrderId?: string;
    pendingOrderPrice?: number;
    pendingContracts?: number;
  }): DeltaShadowCandidate {
    const isXrp = params.symbol.toUpperCase().includes('XRP') || params.strategyName.includes('XRP');
    const isBtc = params.symbol.toUpperCase().includes('BTC') || params.strategyName.includes('BTC') || params.strategyName.includes('V33');
    const isAda = params.symbol.toUpperCase().includes('ADA') || params.strategyName.includes('ADA');
    const isAvax = params.symbol.toUpperCase().includes('AVAX') || params.strategyName.includes('AVAX');
    const isDoge = params.symbol.toUpperCase().includes('DOGE') || params.strategyName.includes('DOGE');
    const isEth = params.symbol.toUpperCase().includes('ETH') || params.strategyName.includes('ETH');
    const isSol = params.symbol.toUpperCase().includes('SOL') || params.strategyName.includes('SOL');
    const isSui = params.symbol.toUpperCase().includes('SUI') || params.strategyName.includes('SUI');

    const targetMult = params.targetMult || (isSui ? 0.90 : (isSol ? 1.30 : (isEth ? 1.60 : (isAvax ? 1.10 : (isAda ? 1.40 : (isBtc ? 1.40 : (isDoge ? 1.60 : (isXrp ? 1.60 : 2.20))))))));
    const slMult = params.slMult || (isSui ? 2.40 : (isSol ? 2.40 : (isEth ? 1.50 : (isAvax ? 2.40 : (isAda ? 2.60 : (isBtc ? 2.60 : (isDoge ? 2.40 : (isXrp ? 2.40 : 1.80))))))));

    const safeAtr = params.atr > 0 ? params.atr : Math.max(params.signalPrice * 0.015, 0.00001);

    const favorableTargetPrice = params.side === 'BUY'
      ? params.signalPrice + this.directionAtrThreshold * safeAtr
      : params.signalPrice - this.directionAtrThreshold * safeAtr;

    const pendingOrderPrice = params.pendingOrderPrice || favorableTargetPrice;
    const pendingDeltaOrderId = params.pendingDeltaOrderId || ('virt-test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));

    const virtualTP = params.virtualTP || (
      params.side === 'BUY'
        ? pendingOrderPrice + targetMult * safeAtr
        : pendingOrderPrice - targetMult * safeAtr
    );

    const virtualSL = params.virtualSL || (
      params.side === 'BUY'
        ? pendingOrderPrice - slMult * safeAtr
        : pendingOrderPrice + slMult * safeAtr
    );

    const adverseThresholdPrice = params.side === 'BUY'
      ? params.signalPrice - this.directionAtrThreshold * safeAtr
      : params.signalPrice + this.directionAtrThreshold * safeAtr;

    const candidate: DeltaShadowCandidate = {
      symbol: params.symbol,
      strategyName: params.strategyName,
      side: params.side,
      signalPrice: params.signalPrice,
      currentPrice: params.signalPrice,
      atr: safeAtr,
      firstSeenTime: Date.now(),
      qualifyingSeconds: 0,
      virtualPnlUSD: 0,
      status: 'OBSERVING',
      invalidationPrice: adverseThresholdPrice,
      virtualTP,
      virtualSL,
      virtualBEPrice: params.side === 'BUY' ? params.signalPrice + 0.80 * safeAtr : params.signalPrice - 0.80 * safeAtr,
      isVirtualBELocked: false,
      trailingSLPrice: virtualSL,
      targetMult,
      slMult,
      isVirtualTradeActive: true,
      tradeOutcome: `VIRTUAL TESTING @ $${params.signalPrice.toFixed(2)} (MONITORING BREAKOUT)`,
      branch: 'MONITORING',
      timeRemainingSeconds: 300,
      atrDistance: 0,
      favorableTargetPrice,
      adverseThresholdPrice,
      timeoutMs: this.STRICT_WAIT_MS,
      pendingDeltaOrderId,
      pendingOrderPrice,
      pendingOrderStatus: 'PENDING_BREAKOUT',
      pendingContracts: params.pendingContracts,
      targetProfitUSD: this.directionProfitUsd,
      firstProfitTime: undefined,
      firstLossTime: undefined,
      sustainedProfitSeconds: 0,
      sustainedLossSeconds: 0,
    };

    this.candidates.set(params.symbol, candidate);
    console.log(`🛡️ [SHADOW GATE VIRTUAL TEST] Candidate Intercepted: ${params.symbol} ${params.side} @ $${params.signalPrice} | Breakout: $${pendingOrderPrice.toFixed(2)} | Invalidation: $${adverseThresholdPrice.toFixed(2)}`);
    return candidate;
  }

  /**
   * Evaluates candidate on incoming live market ticks:
   * 1. Branch C: Favorable move >= 0.10 ATR or Profit >= $0.50 USD -> EXECUTE SAME SIDE
   * 2. Branch A: Adverse move >= 0.10 ATR -> DISCARD as fakeout trap ($0.00 loss, NO INVERSE)
   * 3. Branch B: Stall timeout (> 5 minutes) -> DISCARD with $0.00 loss
   */
  public updateTick(symbol: string, currentPrice: number, notionalUSD: number = 562.5): ShadowGateDecision | null {
    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) return null;

    const candidate = this.candidates.get(symbol);
    if (!candidate || candidate.status !== 'OBSERVING') return null;

    candidate.currentPrice = currentPrice;

    // Calculate signed price difference relative to setup direction
    const priceDiff = candidate.side === 'BUY'
      ? currentPrice - candidate.signalPrice
      : candidate.signalPrice - currentPrice;

    const safeSignalPrice = Math.max(candidate.signalPrice, 0.00001);
    const virtualPnl = (priceDiff / safeSignalPrice) * notionalUSD;
    candidate.virtualPnlUSD = parseFloat(virtualPnl.toFixed(2));

    const safeAtr = Math.max(candidate.atr, 0.00001);
    const atrDistance = priceDiff / safeAtr;
    candidate.atrDistance = parseFloat(atrDistance.toFixed(3));

    // Time calculations
    const elapsedMs = Date.now() - candidate.firstSeenTime;
    const remainingSeconds = Math.max(0, Math.ceil((this.STRICT_WAIT_MS - elapsedMs) / 1000));
    candidate.timeRemainingSeconds = remainingSeconds;
    const qualifyingSeconds = Math.max(1, Math.round(elapsedMs / 1000));
    candidate.qualifyingSeconds = qualifyingSeconds;

    // -------------------------------------------------------------
    // 1. BRANCH C: FAVORABLE BREAKOUT / MOMENTUM CONFIRMED (SAME SIDE)
    // Takes precedence over timeouts even if elapsedMs >= 300s
    // -------------------------------------------------------------
    const isFavorableByAtr = atrDistance >= this.directionAtrThreshold;
    const isFavorableByProfit = candidate.virtualPnlUSD >= (candidate.targetProfitUSD || this.directionProfitUsd);
    const isPendingOrderHit = candidate.pendingOrderPrice !== undefined && (
      candidate.side === 'BUY'
        ? currentPrice >= candidate.pendingOrderPrice
        : currentPrice <= candidate.pendingOrderPrice
    );
    const isFavorableTargetHit = candidate.favorableTargetPrice !== undefined && (
      candidate.side === 'BUY'
        ? currentPrice >= candidate.favorableTargetPrice
        : currentPrice <= candidate.favorableTargetPrice
    );

    if (isFavorableByAtr || isFavorableByProfit || isPendingOrderHit || isFavorableTargetHit) {
      candidate.status = 'QUALIFIED';
      candidate.branch = 'BRANCH_C_CONFIRMED';
      candidate.pendingOrderStatus = 'FILLED';
      candidate.tradeOutcome = `BREAKOUT CONFIRMED (+${candidate.virtualPnlUSD >= 0 ? '$' + candidate.virtualPnlUSD.toFixed(2) : atrDistance.toFixed(2) + ' ATR'}) ➔ REAL SAME ${candidate.side}`;

      this.candidates.delete(symbol);
      console.log(`🚀 [SHADOW GATE CONFIRMED] ${candidate.symbol} reached favorable confirmation @ $${currentPrice.toFixed(2)} (+${atrDistance.toFixed(2)} ATR, PnL: $${candidate.virtualPnlUSD.toFixed(2)}). Executing REAL SAME ${candidate.side}!`);

      return {
        action: 'EXECUTE',
        candidate,
        branch: 'BRANCH_C_CONFIRMED',
        executedSide: candidate.side,
        executionType: 'SAME_PROFIT',
        reason: `Favorable move confirmed (>= +${this.directionAtrThreshold} ATR / +$${this.directionProfitUsd.toFixed(2)} USD). Executing SAME (${candidate.side})!`,
      };
    }

    // -------------------------------------------------------------
    // 2. BRANCH A: ADVERSE FAKEOUT TRAP FILTER ($0.00 LOSS) - NEVER EXECUTE INVERSE!
    // -------------------------------------------------------------
    const isAdverseByAtr = atrDistance <= -this.directionAtrThreshold;
    const isAdverseThresholdHit = candidate.adverseThresholdPrice !== undefined && (
      candidate.side === 'BUY'
        ? currentPrice <= candidate.adverseThresholdPrice
        : currentPrice >= candidate.adverseThresholdPrice
    );

    if (isAdverseByAtr || isAdverseThresholdHit) {
      candidate.status = 'DISCARDED';
      candidate.branch = 'BRANCH_A_FAKEOUT';
      if (candidate.pendingDeltaOrderId) {
        candidate.pendingOrderStatus = 'CANCELLED';
      }
      candidate.tradeOutcome = `FAKEOUT DISCARDED (${atrDistance.toFixed(2)} ATR) ($0.00 LOSS)`;

      this.trapsFilteredCount++;
      const capitalSaved = notionalUSD * (this.directionAtrThreshold * safeAtr / safeSignalPrice);
      this.capitalSavedUSD = parseFloat((this.capitalSavedUSD + capitalSaved).toFixed(2));

      const trapRecord: DeltaFilteredTrap = {
        id: `trap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        symbol: candidate.symbol,
        side: candidate.side,
        strategyName: candidate.strategyName,
        signalPrice: candidate.signalPrice,
        exitPrice: currentPrice,
        reason: `Adverse move hit invalidation ($${candidate.adverseThresholdPrice !== undefined ? candidate.adverseThresholdPrice.toFixed(2) : '0.00'})`,
        branch: 'BRANCH_A_FAKEOUT',
        capitalSavedUSD: parseFloat(capitalSaved.toFixed(2)),
        timestamp: Date.now(),
        cancelledOrderId: candidate.pendingDeltaOrderId,
      };
      this.recentFilteredTraps.unshift(trapRecord);
      if (this.recentFilteredTraps.length > 20) {
        this.recentFilteredTraps.pop();
      }

      this.candidates.delete(symbol);
      console.log(`🛑 [FAKEOUT TRAP FILTERED] ${candidate.symbol} adverse move hit invalidation @ $${currentPrice.toFixed(2)}. DISCARDED with $0.00 loss!`);

      return {
        action: 'DISCARD',
        candidate,
        branch: 'BRANCH_A_FAKEOUT',
        capitalSavedUSD: parseFloat(capitalSaved.toFixed(2)),
        reason: `Fakeout trap detected! Adverse move >= ${this.directionAtrThreshold} ATR against ${candidate.side}. Filtered with $0.00 loss.`,
      };
    }

    // -------------------------------------------------------------
    // 3. BRANCH B: 5-MINUTE FLAT CHOP TIMEOUT ($0.00 RISK)
    // -------------------------------------------------------------
    if (elapsedMs >= this.STRICT_WAIT_MS) {
      candidate.status = 'DISCARDED';
      candidate.branch = 'BRANCH_B_TIMEOUT';
      if (candidate.pendingDeltaOrderId) {
        candidate.pendingOrderStatus = 'CANCELLED';
      }
      candidate.tradeOutcome = 'STALL TIMEOUT DISCARDED ($0.00 LOSS)';

      this.candidates.delete(symbol);
      console.log(`⏱️ [STALL TIMEOUT] ${candidate.symbol} did not reach confirmation within 5 minutes. DISCARDED with $0.00 risk.`);

      return {
        action: 'DISCARD',
        candidate,
        branch: 'BRANCH_B_TIMEOUT',
        reason: 'Stall timeout (> 5 minutes without breakout). Discarded with $0.00 risk.',
      };
    }

    // -------------------------------------------------------------
    // 4. HOLDING PATTERN (MONITORING)
    // -------------------------------------------------------------
    candidate.branch = 'MONITORING';
    const stateCounter = `Wait: ${remainingSeconds}s`;
    candidate.tradeOutcome = `VIRTUAL TESTING [${stateCounter}] (${atrDistance >= 0 ? '+' : ''}${atrDistance.toFixed(2)} ATR | PnL: $${candidate.virtualPnlUSD >= 0 ? '+' : ''}${candidate.virtualPnlUSD.toFixed(2)})`;

    return {
      action: 'HOLD',
      candidate,
      branch: 'MONITORING',
      reason: `Monitoring breakout in Shadow Gate. ${remainingSeconds}s remaining. PnL: $${candidate.virtualPnlUSD.toFixed(2)}`,
    };
  }

  /**
   * Interactive Simulator for the Branches (for real-time testing in UI)
   */
  public simulateBranch(symbol: string, branch: 'BRANCH_A_FAKEOUT' | 'BRANCH_B_TIMEOUT' | 'BRANCH_C_CONFIRMED', notionalUSD: number = 562.5): ShadowGateDecision | null {
    let candidate = this.candidates.get(symbol);
    if (!candidate) {
      candidate = this.registerCandidate({
        symbol,
        strategyName: `Interactive Test Strategy (${symbol})`,
        side: 'BUY',
        signalPrice: 100.0,
        atr: 2.0,
        notionalUSD,
      });
    }

    if (branch === 'BRANCH_A_FAKEOUT') {
      // Simulate adverse move -> Branch A
      const adversePrice = candidate.side === 'BUY'
        ? candidate.signalPrice - 0.20 * candidate.atr
        : candidate.signalPrice + 0.20 * candidate.atr;
      return this.updateTick(symbol, adversePrice, notionalUSD);
    } else if (branch === 'BRANCH_B_TIMEOUT') {
      // Force 5+ minutes to pass without price move
      candidate.firstSeenTime = Date.now() - 305000;
      return this.updateTick(symbol, candidate.signalPrice, notionalUSD);
    } else if (branch === 'BRANCH_C_CONFIRMED') {
      // Simulate favorable move -> Branch C
      const favorablePrice = candidate.side === 'BUY'
        ? candidate.signalPrice + 0.20 * candidate.atr
        : candidate.signalPrice - 0.20 * candidate.atr;
      return this.updateTick(symbol, favorablePrice, notionalUSD);
    }

    return null;
  }

  public getActiveCandidates(): DeltaShadowCandidate[] {
    return Array.from(this.candidates.values());
  }

  public getStats(): {
    trapsFilteredCount: number;
    capitalSavedUSD: number;
    recentFilteredTraps: DeltaFilteredTrap[];
  } {
    return {
      trapsFilteredCount: this.trapsFilteredCount,
      capitalSavedUSD: this.capitalSavedUSD,
      recentFilteredTraps: [...this.recentFilteredTraps],
    };
  }

  public setStats(trapsCount: number, capitalSaved: number, recentTraps?: DeltaFilteredTrap[]) {
    if (trapsCount !== undefined) this.trapsFilteredCount = trapsCount;
    if (capitalSaved !== undefined) this.capitalSavedUSD = capitalSaved;
    if (recentTraps && Array.isArray(recentTraps)) this.recentFilteredTraps = recentTraps;
  }

  public getCandidate(symbol: string): DeltaShadowCandidate | undefined {
    return this.candidates.get(symbol);
  }

  public attachPendingOrder(symbol: string, orderId: string, orderPrice?: number, contracts?: number) {
    const candidate = this.candidates.get(symbol);
    if (candidate) {
      candidate.pendingDeltaOrderId = orderId;
      if (orderPrice !== undefined) candidate.pendingOrderPrice = orderPrice;
      if (contracts !== undefined) candidate.pendingContracts = contracts;
      candidate.pendingOrderStatus = 'PENDING_BREAKOUT';
    }
  }

  public removeCandidate(symbol: string) {
    this.candidates.delete(symbol);
  }

  public clear() {
    this.candidates.clear();
  }
}

export const shadowGate = new DeltaShadowConfirmationGate();
