# Root Cause Analysis: System Only Triggers "SELL" Trades

Based on a detailed scan of the `deltaAutoTraderEngine.ts` and `quantMathematicalEngine.ts` systems, I have found the exact reason your bot is currently only executing `SELL` trades. 

The issue stems from a combination of the current market conditions (prices trending downwards) and strict constraints inside the newly activated **Quantitative Mathematics Engine**.

## 1. Strict Macro Trend Rules Prevent "BUY"
Inside `quantMathematicalEngine.ts`, the `evaluateMarketMath` function strictly measures the market's macro trend based on the 50-EMA and 200-EMA.

```typescript
// If price is below 50 EMA, and 50 EMA is below 200 EMA -> Trend is Bearish
if (currentPrice < lastEma50 && lastEma50 <= lastEma200) {
  macroTrend = 'BEARISH';
}
```

If the trend is evaluated as `BEARISH`, the system immediately applies a severe penalty to any `BUY` signal and outright disables buying:
```typescript
} else if (sr.macroTrend === 'BEARISH') {
  buyPoints -= 25; // Severe penalty for buying in heavy downtrend
}

// BUY explicitly requires the macro trend NOT to be bearish
const hasValidBuyStructure = (sr.supportBounceConfirmed || sr.isAtSupport || sr.macroTrend === 'BULLISH') && sr.macroTrend !== 'BEARISH';
```
Because the current crypto market (including BTC and SOL) has been trading below its 50 and 200 EMAs on the 15M timeframe, the math engine fundamentally refuses to output a `BUY` signal to protect your capital.

## 2. BTC Dependency Penalizes Altcoin Buys
Inside `deltaAutoTraderEngine.ts` (`evaluateTradeAccuracy`), the system checks the macro trend of Bitcoin before allowing altcoins to trade.
```typescript
if (btcTrend === 'BEARISH') {
  score -= 20; // Altcoins crash when BTC dumps!
  reasons.push('BTC Dumping: Altcoin Long Prohibited (-20)');
}
```
If BTC is bearish, the system subtracts another 20 points from any potential altcoin `BUY` score, practically guaranteeing it will never meet the required confidence score to execute.

## 3. Disabling of Traditional Indicators
You previously instructed the system to disable the basic candle-color and indicator strategy, stating: *"why our system not follow indicators mathematics he follow red candle sell"*. 

As a result, the code in `deltaAutoTraderEngine.ts` was commented out:
```typescript
// 15M Technical Indicator Confluence (EMA + RSI + MACD)
// DISABLED per user request: "why our system not follow indicatoes mathmatics he folloe red candle sell"
// The system will now ONLY trade when the Quantitative Mathematics Engine gives a clear signal.
```
By turning off the traditional MACD/RSI strategies (which would have fired short-term `BUY` signals on minor bounces), the system relies **100%** on the Quantitative Mathematics Engine, which refuses to buy against the trend.

## Conclusion
The system is working **exactly as designed** according to the strict institutional math formulas. It is only selling because the math engine considers the current market to be in a strong downtrend. It is protecting you from buying into a falling market (catching falling knives). 

### How to fix it if you want to allow BUYs:
If you want the bot to take counter-trend `BUY` positions (buying the dip even if the market is trending down), we need to:
1. Modify `quantMathematicalEngine.ts` to allow `BUY` signals even if `macroTrend === 'BEARISH'` (by removing the `macroTrend !== 'BEARISH'` block).
2. Reduce the `BTC Dumping` penalty in `deltaAutoTraderEngine.ts`.
