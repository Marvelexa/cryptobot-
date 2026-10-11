# Delta AutoTrader Synced Pine Script Indicators

This folder contains the official TradingView Pine Script (v5) code mathematically synchronized 1:1 with the TypeScript strategy formulas in `lib/cryptoDedicatedStrategyEngine.ts`.

## Strategies Included:
1. **BTC & SOL**: Trend Pullback Wave (100 EMA Guard + Wave Oscillator Curl)
2. **ETH, AVAX & SUI**: Bollinger Band Mean Reversion Sniper (20-period BB $\pm 2.0\sigma$ with 5-period RSI $<40$)
3. **XRP & DOGE**: Ribbon Momentum (20, 50, 100 EMA expansion)
4. **ADA**: Wave Oscillator + ATR Channel with 80 EMA anchor
5. **Anti-Chop Shield**: Choppiness Index (CHOP > 58.0 blocks all entries)
6. **Institutional Candle Filter**: Bullish Engulfing, Hammer, or Power Bar (body $\ge 45\%$)
