-- Check for existing investment data
SELECT COUNT(*) as total_investments FROM investments;

-- Check for investments in zerodha-divyang account
SELECT COUNT(*) as zerodha_investments FROM investments WHERE accountId = 'zerodha-divyang';

-- Check for any investments with the same stock names
SELECT name, COUNT(*) as count FROM investments GROUP BY name HAVING count > 1;

-- Clear existing data if needed (uncomment if you want to start fresh)
-- DELETE FROM investments WHERE accountId = 'zerodha-divyang'; 