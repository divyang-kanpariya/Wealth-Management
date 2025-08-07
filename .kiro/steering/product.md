# Personal Wealth Management

A comprehensive web application for tracking investments, managing financial goals, and monitoring portfolio performance.

## Core Features

- **Investment Tracking**: Support for stocks, mutual funds, gold, jewelry, real estate, fixed deposits, crypto, and other investment types
- **Goal Management**: Set financial goals with target amounts, dates, and priorities
- **Account Management**: Organize investments across different broker, demat, bank, and other account types
- **SIP Management**: Track systematic investment plans with automated transaction recording
- **Price Tracking**: Real-time price fetching and caching with historical data
- **Portfolio Analytics**: Calculate portfolio performance, goal progress, and investment insights

## Business Logic

- Investments can be unit-based (stocks, mutual funds, crypto) requiring units and buy price
- Or value-based (real estate, jewelry, gold, FDs) requiring total value
- Goals can have multiple investments allocated to them
- SIPs support monthly, quarterly, and yearly frequencies with status tracking
- Price data is cached and updated from external sources with fallback mechanisms