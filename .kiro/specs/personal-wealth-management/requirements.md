# Requirements Document

## Introduction

This document outlines the requirements for a personal wealth management application that allows users to track investments across multiple asset types, link them to financial goals and accounts, and monitor their portfolio performance. The application will be built using Next.js with client-side rendering, Prisma ORM with PostgreSQL, and will integrate with external APIs for real-time pricing data.

## Requirements

### Requirement 1

**User Story:** As an investor, I want to manually add investments across different asset types, so that I can track my entire portfolio in one place.

#### Acceptance Criteria

1. WHEN a user accesses the investment form THEN the system SHALL display fields for investment type, name, units, buy price, quantity, total value, buy date, goal, account, and notes
2. WHEN a user selects an investment type THEN the system SHALL dynamically show/hide relevant fields based on the asset type (STOCK, MUTUAL_FUND, GOLD, JEWELRY, REAL_ESTATE, FD, CRYPTO, OTHER)
3. WHEN a user submits a valid investment form THEN the system SHALL save the investment to the database with all provided details
4. WHEN a user provides invalid data THEN the system SHALL display appropriate validation errors

### Requirement 2

**User Story:** As an investor, I want to edit and delete my existing investments, so that I can keep my portfolio data accurate and up-to-date.

#### Acceptance Criteria

1. WHEN a user views the investments list THEN the system SHALL display edit and delete options for each investment
2. WHEN a user clicks edit on an investment THEN the system SHALL populate the form with existing investment data
3. WHEN a user updates an investment THEN the system SHALL save the changes and reflect them immediately in the portfolio
4. WHEN a user deletes an investment THEN the system SHALL remove it from the database and update all related calculations

### Requirement 3

**User Story:** As an investor, I want to link each investment to a specific goal and account, so that I can track progress toward my financial objectives and know which platform I used.

#### Acceptance Criteria

1. WHEN a user adds an investment THEN the system SHALL require selection of a goal and account from dropdown lists
2. WHEN a user creates a new goal THEN the system SHALL allow linking of existing investments to that goal
3. WHEN a user views goal details THEN the system SHALL display all investments linked to that goal
4. WHEN a user views account details THEN the system SHALL display all investments made through that account

### Requirement 4

**User Story:** As an investor, I want to see current values, gains/losses, and percentage returns for my investments, so that I can evaluate my portfolio performance.

#### Acceptance Criteria

1. WHEN the system displays investments THEN it SHALL show current value, absolute gain/loss, and percentage return for each investment
2. WHEN current market prices are available THEN the system SHALL calculate values using real-time data
3. WHEN market prices are unavailable THEN the system SHALL use the last known price or indicate data unavailability
4. WHEN displaying portfolio totals THEN the system SHALL aggregate all individual investment values

### Requirement 5

**User Story:** As an investor, I want a comprehensive dashboard showing my total portfolio value, asset allocation, and goal progress, so that I can get a quick overview of my financial status.

#### Acceptance Criteria

1. WHEN a user accesses the dashboard THEN the system SHALL display total portfolio value, asset allocation breakdown, and account-wise distribution
2. WHEN displaying asset allocation THEN the system SHALL show percentages and values for each asset type (stocks, mutual funds, gold, etc.)
3. WHEN showing goal progress THEN the system SHALL display current value vs target amount and time remaining for each goal
4. WHEN displaying top performers THEN the system SHALL show top gainers and losers by absolute and percentage values

### Requirement 6

**User Story:** As an investor, I want to manage my financial goals with target amounts and dates, so that I can track my progress toward specific objectives.

#### Acceptance Criteria

1. WHEN a user creates a goal THEN the system SHALL require name, target amount, target date, and optionally priority and description
2. WHEN displaying goals THEN the system SHALL show current progress, remaining amount needed, and time to target date
3. WHEN a user edits a goal THEN the system SHALL update all related calculations and progress indicators
4. WHEN a user deletes a goal THEN the system SHALL handle the unlinking of associated investments appropriately

### Requirement 7

**User Story:** As an investor, I want to manage my investment accounts (brokers, banks, etc.), so that I can track which platform each investment was made through.

#### Acceptance Criteria

1. WHEN a user creates an account THEN the system SHALL require name and type (Broker, Demat, Bank) and optionally notes
2. WHEN displaying accounts THEN the system SHALL show total value of investments in each account
3. WHEN a user edits an account THEN the system SHALL update the information without affecting linked investments
4. WHEN a user attempts to delete an account with linked investments THEN the system SHALL prevent deletion or require reassignment

### Requirement 8

**User Story:** As an investor, I want automatic price fetching for stocks and mutual funds, so that my portfolio values stay current without manual updates.

#### Acceptance Criteria

1. WHEN the system needs stock prices THEN it SHALL fetch data from NSE API using the format https://www.nseindia.com/api/quote-equity?symbol=XXXX
2. WHEN the system needs mutual fund NAV THEN it SHALL fetch and parse data from AMFI using https://www.amfiindia.com/spages/NAVAll.txt
3. WHEN price data is fetched THEN the system SHALL cache the results to minimize API calls
4. WHEN cached data expires or is unavailable THEN the system SHALL fetch fresh data from the respective APIs

### Requirement 9

**User Story:** As a system administrator, I want the application to handle different investment types appropriately, so that the interface adapts to the specific needs of each asset class.

#### Acceptance Criteria

1. WHEN an investment type requires units (stocks, mutual funds) THEN the system SHALL show units and price per unit fields
2. WHEN an investment type uses total value (real estate, jewelry) THEN the system SHALL show total value field instead of units
3. WHEN displaying investment lists THEN the system SHALL show relevant columns based on the investment types present
4. WHEN calculating returns THEN the system SHALL use appropriate formulas for unit-based vs total-value investments

### Requirement 10

**User Story:** As an investor, I want a responsive and intuitive interface, so that I can manage my investments efficiently on any device.

#### Acceptance Criteria

1. WHEN a user accesses the application on any device THEN the system SHALL display a responsive interface that works on desktop, tablet, and mobile
2. WHEN a user navigates between pages THEN the system SHALL provide clear navigation and maintain consistent styling
3. WHEN forms are displayed THEN the system SHALL provide clear labels, validation feedback, and intuitive field organization
4. WHEN data is loading THEN the system SHALL provide appropriate loading indicators and error handling