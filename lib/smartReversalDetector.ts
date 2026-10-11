import { KlinePoint, SmartAdaptiveReversalResult, MarketRegime, TradeExecutionMode } from '../src/types';

export type SmartTradeBias = 'DIRECT' | 'SMART_REVERSED' | 'REJECT';

export type MarketRegimeType = 
  | 'STRONG_TREND_MOMENTUM' 
  | 'OVERBOUGHT_CLIMAX_TRAP' 
  | 'OVERSOLD_CLIMAX_TRAP' 
  | 'RANGE_MEAN_REVERSION' 
  | 'CONTRARIAN_EXHAUSTION_FADE' 
  | 'CHOP_LOW_VOLATILITY';

export interface SmartDetectionResult {
  symbol: string;
  originalSignal: 'BUY' | 'SELL';
  finalExecutedSide: 'BUY' | 'SELL';
  bias: SmartTradeBias;
  regime: MarketRegimeType;
  reversalConfidence: number; // 0 to 100
  primaryReason: string;
  isReversed: boolean;
  metrics: {
    rsi14: number;
    rvol: number;
    ema20: number;
    ema50: number;
    ema200: number;
    bollingerPercentB: number;
    atrExtensionMultiplier: number;
    upperWickRatio: number;
    lowerWickRatio: number;
  };
}

export class SmartReversalDetector {
  /**
   * Helper: Calculate Exponential Moving Average
   */
  public static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  /**
   * Helper: Calculate Relative Strength Index (14)
   */
  public static calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Helper: Calculate Bollinger Bands (20-period, 2 std dev)
   */
  public static calculateBollingerBands(closes: number[], period: number = 20, multiplier: number = 2): {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
  } {
    if (closes.length < period) {
      const last = closes[closes.length - 1] || 1;
      return { upper: last * 1.02, middle: last, lower: last * 0.98, percentB: 0.5 };
    }
    const slice = closes.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = middle + (multiplier * stdDev);
    const lower = middle - (multiplier * stdDev);
    const lastPrice = closes[closes.length - 1];
    const bandwidth = upper - lower;
    const percentB = bandwidth > 0 ? (lastPrice - lower) / bandwidth : 0.5;

    return { upper, middle, lower, percentB };
  }

  /**
   * Helper: Calculate Relative Volume (RVOL)
   */
  public static calculateRVOL(volumes: number[], period: number = 20): number {
    if (volumes.length < period + 1) return 1.0;
    const past = volumes.slice(-(period + 1), -1);
    const avg = past.reduce((a, b) => a + b, 0) / (past.length || 1);
    const current = volumes[volumes.length - 1] || 0;
    return avg > 0 ? current / avg : 1.0;
  }

  /**
   * Master Detector: Analyzes market regime and determines whether to trade DIRECT,
   * SMART_REVERSED (fade the exhaustion move), or REJECT.
   */
  public static evaluateTrade(
    symbol: string,
    originalSignal: 'BUY' | 'SELL',
    candles: KlinePoint[],
    currentPrice: number,
    atr: number
  ): SmartDetectionResult {
    if (!candles || candles.length < 15) {
      return {
        symbol,
        originalSignal,
        finalExecutedSide: originalSignal,
        bias: 'DIRECT',
        regime: 'STRONG_TREND_MOMENTUM',
        reversalConfidence: 0,
        primaryReason: 'Insufficient candle history for smart detector; maintaining direct execution',
        isReversed: false,
        metrics: {
          rsi14: 50,
          rvol: 1.0,
          ema20: currentPrice,
          ema50: currentPrice,
          ema200: currentPrice,
          bollingerPercentB: 0.5,
          atrExtensionMultiplier: 0,
          upperWickRatio: 0,
          lowerWickRatio: 0,
        }
      };
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const lastBar = candles[candles.length - 1];

    const rsi14 = this.calculateRSI(closes, 14);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, 200);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const rvol = this.calculateRVOL(volumes, 20);

    const candleRange = Math.max(lastBar.high - lastBar.low, 0.000001);
    const upperWick = lastBar.high - Math.max(lastBar.open, lastBar.close);
    const lowerWick = Math.min(lastBar.open, lastBar.close) - lastBar.low;
    const upperWickRatio = upperWick / candleRange;
    const lowerWickRatio = lowerWick / candleRange;

    const safeAtr = atr > 0 ? atr : currentPrice * 0.015;
    const distFromEma50 = Math.abs(currentPrice - ema50);
    const atrExtensionMultiplier = distFromEma50 / safeAtr;

    const isEmaBullStack = currentPrice > ema20 && ema20 > ema50;
    const isEmaBearStack = currentPrice < ema20 && ema20 < ema50;

    // -------------------------------------------------------------
    // REGIME 1: OVERBOUGHT CLIMAX TRAP (FILTER / REJECT BUY)
    // -------------------------------------------------------------
    // Case: Incoming signal is BUY, but market is overextended at resistance / blow-off top:
    // - RSI > 72 (Overbought)
    // - Price outside or at extreme upper Bollinger Band (%B > 0.98)
    // - Upper rejection wick > 35% OR volume exhaustion
    // - ATR extension from EMA 50 > 2.0x
    const isOverboughtClimax = 
      originalSignal === 'BUY' && (
        (rsi14 >= 72 && bb.percentB >= 0.95) ||
        (rsi14 >= 70 && upperWickRatio >= 0.38) ||
        (bb.percentB >= 1.02 && upperWickRatio >= 0.30) ||
        (atrExtensionMultiplier >= 2.5 && rsi14 >= 68 && rvol < 1.0)
      );

    if (isOverboughtClimax) {
      const confidence = Math.min(95, Math.round(60 + (rsi14 - 70) * 1.5 + (bb.percentB - 0.9) * 30 + upperWickRatio * 20));
      return {
        symbol,
        originalSignal: 'BUY',
        finalExecutedSide: 'BUY',
        bias: 'REJECT',
        regime: 'OVERBOUGHT_CLIMAX_TRAP',
        reversalConfidence: confidence,
        primaryReason: `Overbought Climax Trap detected (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}, Wick ${(upperWickRatio * 100).toFixed(0)}%). Rejecting BUY at blow-off top to avoid buying exhaustion!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // -------------------------------------------------------------
    // REGIME 2: OVERSOLD CLIMAX TRAP (FILTER / REJECT SELL)
    // -------------------------------------------------------------
    // Case: Incoming signal is SELL, but market is panic-flushed into support / capitulation:
    // - RSI < 28 (Oversold)
    // - Price outside or at extreme lower Bollinger Band (%B < 0.05)
    // - Lower bounce wick > 35% OR volume exhaustion
    // - ATR extension from EMA 50 > 2.0x
    const isOversoldClimax = 
      originalSignal === 'SELL' && (
        (rsi14 <= 28 && bb.percentB <= 0.05) ||
        (rsi14 <= 30 && lowerWickRatio >= 0.38) ||
        (bb.percentB <= -0.02 && lowerWickRatio >= 0.30) ||
        (atrExtensionMultiplier >= 2.5 && rsi14 <= 32 && rvol < 1.0)
      );

    if (isOversoldClimax) {
      const confidence = Math.min(95, Math.round(60 + (30 - rsi14) * 1.5 + (0.1 - bb.percentB) * 30 + lowerWickRatio * 20));
      return {
        symbol,
        originalSignal: 'SELL',
        finalExecutedSide: 'SELL',
        bias: 'REJECT',
        regime: 'OVERSOLD_CLIMAX_TRAP',
        reversalConfidence: confidence,
        primaryReason: `Oversold Climax Trap detected (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}, Wick ${(lowerWickRatio * 100).toFixed(0)}%). Rejecting SELL at capitulation floor to avoid shorting the bottom!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // -------------------------------------------------------------
    // REGIME 3: TREND MOMENTUM CONTINUATION (DIRECT)
    // -------------------------------------------------------------
    // ANTI-CHASING EXTREME FILTER (Never short the bottom floor, never buy the top roof)
    // -------------------------------------------------------------
    // In a downtrend, if price has dumped into the lower band (%B < 0.25):
    // If lower wick shows strong absorption bounce at the bottom, reject floor short.
    // If full bear momentum with red candle or bear stack, allow trend continuation DIRECT SHORT!
    if (originalSignal === 'SELL' && bb.percentB < 0.25) {
      if (lowerWickRatio >= 0.28 || (lastBar.close > lastBar.open && lowerWickRatio >= 0.18)) {
        return {
          symbol,
          originalSignal: 'SELL',
          finalExecutedSide: 'SELL',
          bias: 'REJECT',
          regime: 'OVERSOLD_CLIMAX_TRAP',
          reversalConfidence: 85,
          primaryReason: `Oversold Floor Filter: Rejecting bottom SELL at absorption bounce (Lower band %B ${bb.percentB.toFixed(2)}, RSI ${rsi14.toFixed(1)}, Lower Wick ${(lowerWickRatio * 100).toFixed(0)}%). Waiting for bounce exhaustion!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
      // If bear stack or downtrend below 50 EMA with red candle / bearish pressure, allow DIRECT SHORT!
      if ((isEmaBearStack || currentPrice < ema50 || currentPrice < ema200) && (lastBar.close <= lastBar.open || upperWickRatio >= 0.15)) {
        // Fall through to Strong Trend Momentum DIRECT SHORT
      } else {
        return {
          symbol,
          originalSignal: 'SELL',
          finalExecutedSide: 'SELL',
          bias: 'REJECT',
          regime: 'OVERSOLD_CLIMAX_TRAP',
          reversalConfidence: 80,
          primaryReason: `Anti-Chasing Floor Filter: Price is already stretched at the lower band (%B ${bb.percentB.toFixed(2)}, RSI ${rsi14.toFixed(1)}). Rejecting bottom short without bear trend confirmation.`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
    }

    // In an uptrend, if price has already pumped into the upper band (%B > 0.75),
    // check if it's an overbought ceiling or rejection wick to REJECT BUY (avoid buying top):
    if (originalSignal === 'BUY' && bb.percentB > 0.75) {
      if (upperWickRatio >= 0.28 || (lastBar.close < lastBar.open && upperWickRatio >= 0.18)) {
        return {
          symbol,
          originalSignal: 'BUY',
          finalExecutedSide: 'BUY',
          bias: 'REJECT',
          regime: 'OVERBOUGHT_CLIMAX_TRAP',
          reversalConfidence: 85,
          primaryReason: `Overbought Ceiling Filter: Rejecting top BUY at upper rejection wick (Upper band %B ${bb.percentB.toFixed(2)}, RSI ${rsi14.toFixed(1)}, Upper Wick ${(upperWickRatio * 100).toFixed(0)}%). Avoiding buying the top!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
      // If full bull stack momentum with strong green body within upper band, allow trend continuation below
      if (isEmaBullStack && currentPrice > ema50 && currentPrice > ema200 && bb.percentB <= 1.05 && lastBar.close > lastBar.open) {
        // Fall through to Strong Trend Momentum
      } else {
        return {
          symbol,
          originalSignal: 'BUY',
          finalExecutedSide: 'BUY',
          bias: 'REJECT',
          regime: 'OVERBOUGHT_CLIMAX_TRAP',
          reversalConfidence: 80,
          primaryReason: `Anti-Chasing Ceiling Filter: Price is already stretched at the upper band (%B ${bb.percentB.toFixed(2)}, RSI ${rsi14.toFixed(1)}). Rejecting top buy to avoid pullback drawdown. Waiting for dip!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
    }

    // Follow the primary market trend!
    // In a downtrend (below 50 EMA or 200 EMA): SELL signals MUST be executed as DIRECT SHORT!
    // In an uptrend (above 50 EMA & 200 EMA): BUY signals MUST be executed as DIRECT LONG!
    if (originalSignal === 'SELL' && (isEmaBearStack || currentPrice < ema50 || currentPrice < ema200)) {
      return {
        symbol,
        originalSignal: 'SELL',
        finalExecutedSide: 'SELL',
        bias: 'DIRECT',
        regime: 'STRONG_TREND_MOMENTUM',
        reversalConfidence: 15,
        primaryReason: `Bearish Trend Momentum: Candlestick SELL confirmed in Downtrend (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}). Executing DIRECT SHORT with the trend!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // A genuine uptrend: BUY signal confirmed with price above EMAs (matching symmetric downtrend SELL logic)
    if (originalSignal === 'BUY' && (isEmaBullStack || currentPrice > ema50 || currentPrice > ema200 || currentPrice > ema20)) {
      return {
        symbol,
        originalSignal: 'BUY',
        finalExecutedSide: 'BUY',
        bias: 'DIRECT',
        regime: 'STRONG_TREND_MOMENTUM',
        reversalConfidence: 15,
        primaryReason: `Bullish Trend Momentum: Candlestick BUY confirmed in Uptrend (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}). Executing DIRECT LONG with the trend!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // -------------------------------------------------------------
    // REGIME 4: RANGE BOUNDARY MEAN REVERSION (FILTER / REJECT)
    // -------------------------------------------------------------
    // Sideways market where price touches upper or lower band
    if (Math.abs(ema20 - ema50) / (ema50 || 1) < 0.003) {
      // Range upper fade:
      if (originalSignal === 'BUY' && bb.percentB >= 0.88 && rsi14 >= 62) {
        return {
          symbol,
          originalSignal: 'BUY',
          finalExecutedSide: 'BUY',
          bias: 'REJECT',
          regime: 'RANGE_MEAN_REVERSION',
          reversalConfidence: 75,
          primaryReason: `Range Upper Boundary Resistance (Flat EMAs, %B ${bb.percentB.toFixed(2)}). Rejecting BUY at range high!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
      // Range lower bounce:
      if (originalSignal === 'SELL' && bb.percentB <= 0.12 && rsi14 <= 38) {
        return {
          symbol,
          originalSignal: 'SELL',
          finalExecutedSide: 'SELL',
          bias: 'REJECT',
          regime: 'RANGE_MEAN_REVERSION',
          reversalConfidence: 75,
          primaryReason: `Range Lower Boundary Support (Flat EMAs, %B ${bb.percentB.toFixed(2)}). Rejecting SELL at range low!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
    }

    // -------------------------------------------------------------
    // REGIME 5: COUNTER-TREND TRAP FILTER (AVOID BULL & BEAR TRAPS)
    // -------------------------------------------------------------
    // In a Downtrend (below 50 EMA):
    // Allow confirmed Bottom Reversals at support/exhaustion; reject unconfirmed falling knives
    if (originalSignal === 'BUY' && (isEmaBearStack || currentPrice < ema50 || currentPrice < ema200)) {
      const hasBuyingPressure = lowerWickRatio >= 0.35 || (lastBar.close > lastBar.open && lowerWickRatio >= 0.15);
      const hasExhaustionOrSupport = rsi14 <= 38 || bb.percentB <= 0.25 || lowerWickRatio >= 0.30;
      if (hasBuyingPressure && hasExhaustionOrSupport) {
        return {
          symbol,
          originalSignal: 'BUY',
          finalExecutedSide: 'BUY',
          bias: 'DIRECT',
          regime: 'CONTRARIAN_EXHAUSTION_FADE',
          reversalConfidence: 85,
          primaryReason: `Bottom Reversal Long: Validated BUY at support/exhaustion below EMA 50/200 (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}). Executing DIRECT LONG to capture upward reversal!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
      return {
        symbol,
        originalSignal: 'BUY',
        finalExecutedSide: 'BUY',
        bias: 'REJECT',
        regime: 'CONTRARIAN_EXHAUSTION_FADE',
        reversalConfidence: 80,
        primaryReason: `Anti-Counter-Trend Guard: Unconfirmed BUY in Downtrend without bottom rejection pattern. Rejecting naive long to avoid falling knife!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // In an Uptrend (above 50 & 200 EMA):
    // Authentic SELL signals at resistance / overbought tops are TOP REVERSAL SHORTS!
    // NEVER flip a genuine SELL into a BUY (which caused buying tops right before market dumps)!
    if (originalSignal === 'SELL' && (isEmaBullStack || currentPrice > ema50 || currentPrice > ema200)) {
      // Confirmed top reversal with selling pressure (upper rejection wick or bearish candle) at exhaustion:
      const hasSellingPressure = upperWickRatio >= 0.35 || (lastBar.close < lastBar.open && upperWickRatio >= 0.15);
      const hasExhaustionOrResistance = rsi14 >= 62 || bb.percentB >= 0.75 || upperWickRatio >= 0.30;
      if (hasSellingPressure && hasExhaustionOrResistance) {
        return {
          symbol,
          originalSignal: 'SELL',
          finalExecutedSide: 'SELL',
          bias: 'DIRECT',
          regime: 'CONTRARIAN_EXHAUSTION_FADE',
          reversalConfidence: 85,
          primaryReason: `Top Reversal Short: Validated SELL at resistance/exhaustion above EMA 50/200 (RSI ${rsi14.toFixed(1)}, %B ${bb.percentB.toFixed(2)}). Executing DIRECT SHORT to capture the downward reversal!`,
          isReversed: false,
          metrics: {
            rsi14,
            rvol,
            ema20,
            ema50,
            ema200,
            bollingerPercentB: bb.percentB,
            atrExtensionMultiplier,
            upperWickRatio,
            lowerWickRatio,
          }
        };
      }
      // Unconfirmed naive short in bull trend: reject rather than inverting to BUY!
      return {
        symbol,
        originalSignal: 'SELL',
        finalExecutedSide: 'SELL',
        bias: 'REJECT',
        regime: 'CONTRARIAN_EXHAUSTION_FADE',
        reversalConfidence: 80,
        primaryReason: `Anti-Counter-Trend Guard: Unconfirmed SELL in Bullish Trend without rejection pattern. Rejecting naive short to avoid getting squeezed!`,
        isReversed: false,
        metrics: {
          rsi14,
          rvol,
          ema20,
          ema50,
          ema200,
          bollingerPercentB: bb.percentB,
          atrExtensionMultiplier,
          upperWickRatio,
          lowerWickRatio,
        }
      };
    }

    // -------------------------------------------------------------
    // DEFAULT: DIRECT WITH CONFLUENCE
    // -------------------------------------------------------------
    return {
      symbol,
      originalSignal,
      finalExecutedSide: originalSignal,
      bias: 'DIRECT',
      regime: 'STRONG_TREND_MOMENTUM',
      reversalConfidence: 20,
      primaryReason: `Standard Institutional Confluence aligned. Executing DIRECT ${originalSignal}.`,
      isReversed: false,
      metrics: {
        rsi14,
        rvol,
        ema20,
        ema50,
        ema200,
        bollingerPercentB: bb.percentB,
        atrExtensionMultiplier,
        upperWickRatio,
        lowerWickRatio,
      }
    };
  }

  /**
   * Converts a SmartDetectionResult to the UI/state-compatible SmartAdaptiveReversalResult
   */
  public static toAdaptiveResult(
    result: SmartDetectionResult,
    currentPrice: number,
    atr: number
  ): SmartAdaptiveReversalResult {
    let uiRegime: MarketRegime = 'STRONG_TREND_MOMENTUM';
    if (result.regime === 'OVERBOUGHT_CLIMAX_TRAP' || result.regime === 'OVERSOLD_CLIMAX_TRAP' || result.regime === 'CONTRARIAN_EXHAUSTION_FADE') {
      uiRegime = 'EXHAUSTION_CLIMAX';
    } else if (result.regime === 'CHOP_LOW_VOLATILITY') {
      uiRegime = 'CHOP_SIDEWAYS';
    }

    const executionMode: TradeExecutionMode = result.bias === 'REJECT' ? 'FILTERED_CHOP' : 'DIRECT';

    const m = result.metrics;
    const bbBasis = m.ema20;
    const bbSpread = atr * 2;
    const bbUpper = bbBasis + bbSpread;
    const bbLower = bbBasis - bbSpread;

    return {
      regime: uiRegime,
      executionMode,
      effectiveSide: result.finalExecutedSide,
      originalSide: result.originalSignal,
      confidence: result.reversalConfidence,
      reason: result.primaryReason,
      directReason: result.bias === 'DIRECT' ? result.primaryReason : undefined,
      reversalReason: undefined,
      indicators: {
        rsi14: m.rsi14,
        adx: 28.5,
        atr,
        distanceFromEma20Atr: m.atrExtensionMultiplier,
        bbUpper,
        bbLower,
        bbBasis,
        isBbPierced: m.bollingerPercentB >= 1.0 || m.bollingerPercentB <= 0.0,
        volumeRatio: m.rvol,
        isVolumeDeclining: m.rvol < 0.9,
        isEmaStackedBullish: currentPrice > m.ema20 && m.ema20 > m.ema50,
        isEmaStackedBearish: currentPrice < m.ema20 && m.ema20 < m.ema50,
        exhaustionPattern: undefined,
      }
    };
  }
}

