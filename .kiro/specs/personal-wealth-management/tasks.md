# Implementation Plan

- [x] 1. Set up project foundation and database schema

  - Initialize Next.js project with TypeScript and Tailwind CSS
  - Configure Prisma with MySQL connection (as per design document)
  - Create and run initial database migration with all models (Investment, Goal, Account, PriceCache)
  - Set up environment variables and configuration files
  - _Requirements: All requirements depend on this foundation_

- [x] 2. Implement core data models and validation

  - Create TypeScript interfaces and types for all entities
  - Implement Zod validation schemas for Investment, Goal, and Account models
  - Create Prisma client configuration and connection utilities
  - Write unit tests for data model validations
  - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1_

- [x] 3. Build basic API infrastructure

  - Create API error handling middleware and utilities
  - Implement base CRUD operations for investments endpoint
  - Implement base CRUD operations for goals endpoint
  - Implement base CRUD operations for accounts endpoint
  - Write integration tests for basic API operations
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 6.1, 6.3, 7.1, 7.3_

- [x] 4. Implement investment calculation logic

  - Create portfolio calculation utilities for gains/losses and percentages
  - Implement logic to handle unit-based vs total-value investments
  - Create functions to aggregate portfolio totals and asset allocation
  - Write unit tests for all calculation functions
  - _Requirements: 4.1, 4.2, 4.4, 5.2, 9.4_

- [x] 5. Build external price fetching system

  - Implement NSE stock price fetching utility
  - Create AMFI mutual fund NAV parsing utility
  - Build price caching system with in-memory and database storage
  - Create API endpoints for stock and mutual fund price retrieval
  - Write unit tests for price fetching and caching logic
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6. Create reusable UI components

  - Build base UI components (Button, Input, Select, Modal) with Tailwind CSS
  - Create layout components (Header, Navigation, Layout)
  - Implement loading states and error handling components
  - Write unit tests for UI components
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 7. Implement dynamic investment form

  - Create InvestmentForm component with dynamic field rendering
  - Implement field visibility logic based on investment type selection
  - Add form validation and error display
  - Create investment type-specific field components
  - Write unit tests for form behavior and validation
  - _Requirements: 1.1, 1.2, 1.4, 9.1, 9.2, 10.3_

-

- [x] 8. Build investment management interface

  - Create InvestmentList component with edit/delete functionality
  - Implement InvestmentCard component for displaying individual investments
  - Add investment details view with current value calculations
  - Integrate price fetching for real-time value updates
  - Write integration tests for investment CRUD operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.3, 9.3_

- [x] 9. Implement goal management system































































  - Create GoalForm component for adding/editing goals
  - Build GoalList component with progress indicators
  - Implement goal progress calculation and display
  - Add goal-investment linking functionality
  - Write unit tests for goal management components
  - _Requirements: 3.1, 3.2, 3.3, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 10. Build account management interface





  - Create AccountForm component for adding/editing accounts
  - Implement AccountList component with investment totals
  - Add account-investment relationship management
  - Implement account deletion protection for linked investments
  - Write unit tests for account management functionality
  - _Requirements: 3.1, 3.4, 7.1, 7.2, 7.3, 7.4_

- [x] 11. Create comprehensive dashboard





  - Build PortfolioSummary component showing total values
  - Implement AssetAllocation component with percentage breakdowns
  - Create GoalProgress component for dashboard goal tracking
  - Build TopPerformers component showing gainers/losers
  - Add dashboard summary API endpoint with aggregated data
  - Write integration tests for dashboard data accuracy
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 12. Implement responsive navigation and routing






  - Set up Next.js routing for all main pages (dashboard, investments, goals, accounts)
  - Create responsive navigation component with mobile support
  - Implement page layouts and consistent styling
  - Add breadcrumb navigation and page titles
  - Test responsive behavior across different screen sizes
  - _Requirements: 10.1, 10.2_


- [x] 13. Add advanced portfolio features































  - Implement investment search and filtering functionality
  - Create investment sorting options (by value, gain/loss, date)
  - Add bulk operations for investment management
  - Implement data export functionality for portfolio reports
  - Write unit tests for advanced features
  - _Requirements: 4.4, 9.3, 10.3_


- [x] 14. Enhance price data management

















  - Implement automatic price refresh scheduling
  - Add manual price refresh functionality
  - Create price history tracking for trend analysis
  - Implement fallback mechanisms for API failures
  - Write integration tests for price data reliability
  - _Requirements: 4.2, 4.3, 8.3, 8.4_

- [x] 15. Implement comprehensive error handling






  - Add global error boundary for React components
  - Implement API error handling with user-friendly messages
  - Create network error handling and retry logic
  - Add form validation error display improvements
  - Write tests for error scenarios and recovery
  - _Requirements: 1.4, 4.3, 10.4_

- [x] 16. Add data persistence and optimization





  - Implement optimistic updates for better user experience
  - Add data caching strategies for improved performance
  - Create database indexing for frequently queried fields
  - Implement pagination for large data sets
  - Write performance tests and optimization verification
  - _Requirements: 4.4, 10.1_

- [x] 17. Create comprehensive test suite





  - Write end-to-end tests for complete user workflows
  - Implement integration tests for API and database operations
  - Add component integration tests for complex interactions
  - Create test data factories and utilities
  - Set up continuous integration test pipeline
  - _Requirements: All requirements need test coverage_

- [x] 18. Implement table-based layout for investment tracking

  - Convert investment list from card-based to table-based layout for better data analysis
  - Create responsive table component with sortable columns
  - Implement table view for goals and accounts management
  - Add toggle between card and table views for user preference
  - Ensure mobile responsiveness with horizontal scrolling or collapsible columns
  - _Requirements: Enhanced UI/UX for better data readability and analysis_

- [x] 19. Fix duplicate titles and UI cleanup across all pages





  - Remove duplicate title sections on investments page (currently showing both "Investments – Manage your investment portfolio" and "My Investments – 1 of 1 investment...")
  - Keep only the dynamic title that provides useful context (count, last update time)
  - Apply consistent title structure across Goals, Accounts, and other similar pages
  - Review and standardize header component structure throughout the application
  - Ensure clean, non-redundant UI experience across all management pages
  - _Requirements: 10.2, 10.3 - Consistent navigation and intuitive interface_

- [x] 20. Implement bulk investment import functionality





  - Create CSV import feature for bulk investment data entry
  - Generate demo CSV template with all required investment fields
  - Build CSV parser with validation for different investment types
  - Implement import preview with error detection and correction
  - Add import progress tracking and success/failure reporting
  - Create import history and rollback functionality for failed imports
  - Support mapping of CSV columns to investment fields
  - _Requirements: 1.1, 1.3 - Enhanced investment data entry and management_

- [x] 21. UI Redesign: Component-Level Redesign for Minimal, Data-Rich Dashboard









  - Redesign dashboard components to display more information with less screen space
  - Create compact card components with tighter data groupings and reduced spacing
  - Redesign table components for higher data density without clutter
  - Implement minimal, clean design with functional-first approach
  - Add collapsible panels and tabbed sections for grouped data display
  - Remove redundant titles and labels across all pages
  - Use icons and subtle color cues to reduce text overload
  - Implement responsive scaling based on content rather than fixed heights
  - Add visual hierarchy using font weight, color, and size to guide attention
  - Include quick actions, tooltips, and indicators for enhanced component utility
  - Ensure mobile-friendly responsive design while maintaining desktop-first approach
  - make test test all edge cases
  - _Requirements: 10.1, 10.2, 10.3 - Enhanced UI/UX for better data density and usability_

- [x] 22. Implement SIP (Systematic Investment Plan) functionality





  - Create SIP model and database schema for recurring investments
  - Build SIP creation form with start date and frequency selection
  - Implement automated SIP transaction processing system
  - Create SIP transaction history and tracking
  - Add SIP management interface (pause, resume, modify, cancel)
  - Implement automatic NAV calculation and unit updates for SIP transactions
  - Update portfolio calculations to include SIP investments
  - _Requirements: Advanced mutual fund investment management with automated recurring transactions_

- [x] 21.1 Build SIP transaction processing engine











  - Create background job system for processing SIP transactions on scheduled dates
  - Implement NAV fetching and unit calculation for SIP dates
  - Build average NAV calculation logic considering all SIP entries
  - Create SIP transaction logging and audit trail
  - Add error handling for failed SIP transactions
  - _Requirements: Automated SIP processing with accurate NAV calculations_

- [x] 21.2 Create SIP management interface
  - Build SIP creation form integrated with investment form
  - Implement SIP list view with status indicators (active, paused, completed)
  - Add SIP modification functionality (amount, frequency changes)
  - Create SIP performance tracking and analytics
  - Implement SIP calendar view for upcoming transactions
  - _Requirements: Comprehensive SIP management and monitoring_

- [x] 23. Enhance investment form with inline goal creation





  - Modify goal dropdown to detect non-existing goals
  - Add "Create new goal" option in goal dropdown
  - Implement inline goal creation modal within investment form
  - Create seamless goal creation workflow without leaving investment form
  - Add goal validation and immediate availability in dropdown after creation
  - Update form state management to handle dynamic goal creation
  - _Requirements: Improved user experience for goal creation during investment entry_

- [x] 24. Build comprehensive goal detail view





  - Create detailed goal view page with investment breakdown
  - Implement goal-specific investment list with filtering
  - Add goal progress visualization with charts and metrics
  - Create investment allocation analysis within goal context
  - Build goal performance tracking over time
  - Add goal modification and investment reallocation features
  - Implement goal completion tracking and milestone notifications
  - _Requirements: Detailed goal analysis and investment tracking within goal context_

- [x] 25. Create goal investment analytics












  - Build investment performance analysis within goal context
  - Implement goal progress charts and trend analysis
  - Create asset allocation breakdown for goal-specific investments
  - Add goal timeline and milestone tracking
  - Implement goal risk analysis based on investment types
  - _Requirements: Advanced goal analytics and performance tracking_

- [x] 26. Implement enhanced data visualization






  - Create interactive charts for portfolio performance
  - Build SIP performance visualization and projections
  - Implement goal progress charts with timeline view
  - Add investment comparison and analysis charts
  - Create portfolio allocation pie charts and trend graphs
  - Implement responsive chart components for mobile devices
  - _Requirements: Enhanced data visualization for better investment insights_


- [ ] 28. Final integration and polish


  - Integrate all new components into cohesive application flow
  - Implement final UI/UX improvements and animations
  - Add loading states and progress indicators throughout
  - Perform cross-browser testing and compatibility fixes
  - Create deployment configuration and documentation
  - Conduct comprehensive testing of all new features
  - _Requirements: 10.1, 10.2, 10.3, 10.4, and all new enhancement requirements_
