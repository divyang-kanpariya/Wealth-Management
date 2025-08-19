# Implementation Plan

- [x] 1. Remove caching for user data operations




























  - Disable Next.js caching for all user CRUD operations (investments, goals, SIPs, accounts)
  - Update data preparators to always fetch fresh user data from database
  - Remove cache invalidation logic from server actions for user data
  - Ensure immediate reflection of user data changes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
-



- [x] 2. Implement background price refresh service









  - Create BackgroundPriceRefreshService class for scheduled price updates every hour
  - Implement batch processing logic to handle API rate limits
  - Update existing price-fetcher to work with background refresh
  - Store all pricing data in database PriceCache table
 only
  - _Requirements: 2.1, 2.2, 2.3_

-

- [x] 3. Simplify pricing data to database-only caching





  - Remove in-memory price caching from price-fetcher
  - Use only database PriceCache table for storing pricing data
  - Update price fetching logic to check database cache first
  - Implement simple staleness check (1 hour for fresh, 24 hours for fallback)
  - _Requirements: 2.1, 2.4, 4.2_

- [x] 4. Enhance existing refresh functionality for real-time price updates





  - Update existing RefreshButton component to trigger immediate API calls
  - Improve existing handleRefreshPrices to fetch fresh prices and update database
  - Update refreshDashboard server action to force fresh price fetching
  - Add better progress feedback and error handling for refresh operations
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Implement enhanced error handling and fallbacks for pricing





  - Create graceful degradation when external APIs fail
  - Implement stale data fallback (use old prices when APIs are down)
  - Add API rate limiting and retry logic with exponential backoff
  - Create user-friendly error messages for pricing failures
  - _Requirements: 2.4, 3.4, 4.3_

- [x] 6. Update data preparators to use no-cache approach





  - Modify all data preparators to always fetch fresh user data from database
  - Update pricing data fetching to use database cache only
  - Remove all cache invalidation calls from data preparators
  - Ensure fast database queries with proper indexing
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 7. Add comprehensive testing for no-cache behavior





  - Write tests to verify user data changes are immediately visible
  - Create integration tests for background price refresh service
  - Add tests for enhanced refresh functionality and error handling
  - Test database-only pricing cache behavior
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 8. Implement price refresh scheduling and service management
  - Create service initialization for background price refresh (every 1 hour)
  - Add graceful shutdown handling for refresh operations
  - Create simple configuration for refresh intervals
  - Add service health monitoring for background refresh
  - _Requirements: 2.1, 2.3, 4.5_

-  [x] 9. Fix refresh action and database synchronization





  - Debug why refresh button’s API response is not persisting into the database
  - Ensure correct table is being used for storing refreshed data
  - Identify redundant/duplicate tables created for the same data entity
  - Remove unused tables safely after verifying no dependencies
  - Sync database schema with actual project usage (consolidate into single source of truth)
  - _Requirements: 2.2, 3.4, 5.1_

- [x] 11. Investigate and fix API rate limit errors in price fetching




  - Review `InvestmentsDataPreparator.fetchFreshData` implementation to confirm if API requests are made per investment or as a single bulk request
  - If multiple requests are being made:
    - Refactor to a single bulk API request for all investments
    - Update code to handle bulk response and update DB accordingly
  - If only one request is being made:
    - Inspect rate-limiting logic (`counts.burst.count`, `resetTime`) for incorrect calculations or resets
    - Fix conditions that trigger `APIRateLimitError` prematurely
  - Verify database sync works correctly with corrected fetch logic
  
  - [x] 10. Fix action menu placement issue in data tables





  - Investigate dynamic placement logic of action menu (three-dot menu in data tables)
  - Debug why placement works normally but breaks after page scroll
  - Ensure menu coordinates update correctly on scroll events
  - Add proper positioning handling (e.g., using relative container, viewport checks, or portal rendering)
  - Test across investment page and all other affected pages with scrolling

- [x] 12. Unify investment price fetching logic and remove unused code





  - Review existing logic for fetching prices:
    - Current mutual fund flow
    - Current stock flow
  - Keep only the stock price fetching implementation
  - Extend stock fetcher to also handle mutual funds:
    - If `investment.type == 'stock'` → use `NSE:<stockSymbol>`
    - If `investment.type == 'mutual_fund'` → use `MUTF_IN:<schemeCode>`
  - Replace existing mutual fund fetch calls with unified stock-based fetch
  - Remove unused mutual fund price fetching logic and third-party website scraping code
  - Clean up related services, helpers, and configs no longer needed
  - Test both stock and mutual fund price fetching with the new unified logic
  -remove all previouse use deprecated functions
  - _Requirements: 3.6, 4.2, 5.8_


- [x] 13. Full review and cleanup of investment and price fetching code





  - Read and verify every single line of code related to investment and price fetching
  - Identify and remove unnecessary, unused, or deprecated code (do not just comment it out, remove fully)
  - Ensure mutual fund price fetching is consistent and reliable (fix issue where it works only sometimes)
  - Consolidate logic to use unified approach (`NSE:<symbol>` for stocks, `MUTF_IN:<schemeCode>` for mutual funds)
  - Review and handle all edge cases (invalid symbols, missing scheme codes, API errors, network issues, etc.)
  - Update and refactor services, helpers, and configs to align with the new unified logic
  - Run all existing tests and update them as needed
  - Ensure every single test passes successfully after refactor
  - Finalize code cleanup by ensuring no dead/legacy code is left in the codebase

  
  - [x] 10. Fix action menu placement issue in data tables





  - Investigate dynamic placement logic of action menu (three-dot menu in data tables)
  - Debug why placement works normally but breaks after page scroll
  - Ensure menu coordinates update correctly on scroll events
  - Add proper positioning handling (e.g., using relative container, viewport checks, or portal rendering)
  - Test across investment page and all other affected pages with scrolling

  - [x] 14. Redesign action menu placement in data tables





  - Remove current dynamic calculation logic for positioning the action (three-dot) menu
  - Implement a simpler approach: open the menu directly aligned with the clicked three-dot icon
  - Ensure correct positioning without relying on manual scroll/coordinate calculations
  - Handle edge cases:
    - For the last row, ensure the menu opens upward (not hidden under the table)
    - For rows near the right edge, ensure the menu is fully visible inside the viewport
  - Apply the same solution across investment page and all other affected pages
  - Test thoroughly with scrolling, resizing, and large data sets
  - _Requirements: 3.3, 4.2, 5.6_

- [x] 15. Fix build errors and ensure successful `npm run build`





  - Run `npm run build` locally and collect all errors/warnings
  - Investigate root cause of each error (syntax issues, type errors, missing imports, unused variables, etc.)
  - Fix code issues that prevent build from completing successfully
  - Update or remove deprecated/unused dependencies that cause build failures
  - Ensure environment variables and config files are correctly set for build
  - Optimize TypeScript/ESLint configuration if necessary to align with project code
  - Verify successful build without errors or warnings
  - Test application after build to confirm runtime works correctly

  - [x] 16. Redesign SIP creation flow and calculators




  - Replace current SIP creation popup with a dedicated SIP page
  - On SIP page, add full functionality for:
    - SIP calculator
    - SWP calculator
    - Inflation adjustment option
    - Step-up annual rate of return configuration
    - Monthly breakdown of contributions and returns
  - From the calculator results, allow creating SIP and linking it directly to a goal
  - Update SIP listing UI:
    - Replace old card-style UI with data table view
    - Match design/behavior with existing Investment and Goal pages (consistent datatable usage)
  - Ensure calculations are accurate for SIP and SWP, including edge cases (0% inflation, varying step-up rates, partial months, etc.)
  - Validate linking flow: SIP → Goal association should work smoothly
  - Test thoroughly across different input ranges and scenarios
  - _Requirements: 4.1, 5.3, 6.5_

- [x] 17. Improve UI/UX for SIP create page




  - Enhance inflation adjustment:
    - Show “future goal value” vs “present value after inflation” clearly
    - Example: If goal is ₹20,00,000 after 5 years, display how much that equals in today’s money after applying inflation
  - Improve monthly breakdown view:
    - Show both monthly and yearly contribution/returns breakdown
    - Add toggle/switch for user to easily change between monthly and yearly view
  - Make data updates smooth:
    - Add small animations/transitions when recalculating values (inflation adjustment, SIP amount, step-up rate changes)
  - Improve readability and layout of calculator results (use consistent spacing, typography, and datatable-style clarity)
  - Ensure UI matches overall design system used in investments/goals pages
  - Test across different devices (desktop, mobile, tablet) for responsiveness

  - [x] 18. Implement real value inflation adjustment for SIP and Goals





  - After SIP calculation:
    - Show both the final wealth (e.g., 5X after 5 years) and the inflation-adjusted value
    - Example: “Your final wealth of 5X after 5 years will be equivalent to 3X in today’s money after inflation”
  - For Goals:
    - Show both target goal (future value) and inflation-adjusted present equivalent
    - Example: “Your goal of X in 5 years will be equivalent to 0.8X in today’s money after inflation”
  - Add toggle (Inflation Adjustment ON/OFF) for user to switch between nominal and real value views
  - Ensure inflation adjustment applies consistently to both SIP calculator and Goal linking flows
  - Update UI to clearly differentiate between:
    - Nominal value (future value without inflation)
    - Real value (present-day equivalent after inflation)
  - Add helper text or tooltip to explain inflation effect for clarity
  - Test with different inflation rates and durations to confirm accuracy
  - _Requirements: 4.7, 5.5, 6.8_

- [x] 19. Simplify and clean up UI for inflation details





  - Review current SIP/Goal pages for duplicated inflation-related UI components
  - Remove duplicate/overlapping sections showing inflation details
  - Keep only a single, clean, and simple section to display:
    - Final wealth/goal amount (nominal value)
    - Inflation-adjusted equivalent in today’s money
  - Use consistent formatting and layout for both SIP and Goal inflation info
  - Add clear labels (e.g., “Future Value” vs “Present Value after Inflation”) to avoid confusion
  - Ensure UI remains minimal, easy to understand, and not cluttered
  - Validate inflation adjustment toggle updates only one unified section
  - Test on both desktop and mobile for readability
  - _Requirements: 4.8, 5.6, 6.9_
