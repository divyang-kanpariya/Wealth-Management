// Debug script to help identify CSV import issues
const fs = require('fs');

// Function to parse CSV line (same as in the app)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

// Function to test date parsing (same logic as in validation)
function testDateParsing(dateString) {
  const trimmedVal = dateString.trim();
  if (!trimmedVal) {
    throw new Error('Buy date is required');
  }
  
  // Check if this looks like a large number (likely totalValue misplaced)
  if (/^\d{6,}$/.test(trimmedVal)) {
    throw new Error(`Invalid date format: "${trimmedVal}" appears to be a large number. Check if your CSV columns are properly aligned.`);
  }
  
  let date;
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedVal)) {
    date = new Date(trimmedVal + 'T00:00:00.000Z');
  }
  // Try DD/MM/YYYY format
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedVal)) {
    const [day, month, year] = trimmedVal.split('/');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try DD-MM-YYYY format  
  else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmedVal)) {
    const [day, month, year] = trimmedVal.split('-');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try YYYY/MM/DD format
  else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmedVal)) {
    const [year, month, day] = trimmedVal.split('/');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Default to Date constructor
  else {
    date = new Date(trimmedVal);
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: "${trimmedVal}". Please use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY format`);
  }
  
  return date;
}

// Function to normalize account names
function normalizeAccountName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Expected CSV structure
const expectedHeaders = [
  'type', 'name', 'symbol', 'units', 'buyPrice', 'totalValue', 'buyDate', 'goalName', 'accountName', 'notes'
];

console.log('=== CSV Import Debugger ===\n');

// Check if a CSV file exists to debug
const csvFiles = ['test-import.csv', 'corrected-test-import.csv', 'your-file.csv'];
let csvFile = null;

for (const file of csvFiles) {
  if (fs.existsSync(file)) {
    csvFile = file;
    break;
  }
}

if (!csvFile) {
  console.log('No CSV file found. Please create one of these files to debug:');
  csvFiles.forEach(file => console.log(`  - ${file}`));
  console.log('\nCreating a sample CSV for testing...');
  
  // Create a sample CSV with common issues
  const sampleCSV = `type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes
STOCK,"Reliance Industries",RELIANCE,10,2500.50,,15/01/2024,"Long Term Growth",Zerodha,"Blue chip stock"
MUTUAL_FUND,"SBI Fund",SBI_FUND,100,85.25,,2024-02-01,"Retirement",SBI Bank,"Monthly investment"
REAL_ESTATE,"Mumbai Apartment",,,,,5000000,2023-12-01,"Property","HDFC Bank","Real estate"`;
  
  fs.writeFileSync('test-import.csv', sampleCSV);
  csvFile = 'test-import.csv';
  console.log('Created test-import.csv');
}

console.log(`\nDebugging file: ${csvFile}\n`);

// Read and parse the CSV
const csvContent = fs.readFileSync(csvFile, 'utf8');
const lines = csvContent.trim().split(/\r?\n/);

if (lines.length < 2) {
  console.log('❌ Error: CSV must have at least a header row and one data row');
  process.exit(1);
}

// Parse headers
const headers = parseCSVLine(lines[0]);
console.log('📋 Headers found:', headers);
console.log('📋 Expected headers:', expectedHeaders);

// Check header alignment
const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
const extraHeaders = headers.filter(h => !expectedHeaders.includes(h));

if (missingHeaders.length > 0) {
  console.log('⚠️  Missing headers:', missingHeaders);
}
if (extraHeaders.length > 0) {
  console.log('⚠️  Extra headers:', extraHeaders);
}

console.log('\n=== Row Analysis ===');

// Sample account names for testing (you should replace these with your actual account names)
const sampleAccounts = ['zerodha', 'sbi bank', 'hdfc bank', 'icici direct', 'axis bank'];
const sampleGoals = ['long term growth', 'retirement fund', 'real estate portfolio', 'emergency fund'];

// Parse each data row
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  console.log(`\n--- Row ${i} ---`);
  console.log(`Raw line: "${line}"`);
  
  try {
    const values = parseCSVLine(line);
    console.log(`Parsed values (${values.length}):`, values);
    
    if (values.length !== headers.length) {
      console.log(`❌ Column count mismatch: got ${values.length}, expected ${headers.length}`);
      continue;
    }
    
    // Create row object
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Analyze each field
    console.log('\nField Analysis:');
    
    // Type
    const type = row.type;
    const validTypes = ['STOCK', 'MUTUAL_FUND', 'GOLD', 'JEWELRY', 'REAL_ESTATE', 'FD', 'CRYPTO', 'OTHER'];
    if (validTypes.includes(type)) {
      console.log(`  ✅ Type: "${type}" (valid)`);
    } else {
      console.log(`  ❌ Type: "${type}" (invalid, must be one of: ${validTypes.join(', ')})`);
    }
    
    // Name
    const name = row.name;
    if (name && name.trim()) {
      console.log(`  ✅ Name: "${name}" (valid)`);
    } else {
      console.log(`  ❌ Name: "${name}" (required)`);
    }
    
    // Units and prices (for unit-based investments)
    if (['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(type)) {
      const units = row.units;
      const buyPrice = row.buyPrice;
      
      if (units && !isNaN(parseFloat(units)) && parseFloat(units) > 0) {
        console.log(`  ✅ Units: "${units}" (valid for ${type})`);
      } else {
        console.log(`  ❌ Units: "${units}" (required for ${type})`);
      }
      
      if (buyPrice && !isNaN(parseFloat(buyPrice)) && parseFloat(buyPrice) > 0) {
        console.log(`  ✅ Buy Price: "${buyPrice}" (valid for ${type})`);
      } else {
        console.log(`  ❌ Buy Price: "${buyPrice}" (required for ${type})`);
      }
    }
    
    // Total value (for value-based investments)
    if (['REAL_ESTATE', 'JEWELRY', 'GOLD', 'FD', 'OTHER'].includes(type)) {
      const totalValue = row.totalValue;
      if (totalValue && !isNaN(parseFloat(totalValue)) && parseFloat(totalValue) > 0) {
        console.log(`  ✅ Total Value: "${totalValue}" (valid for ${type})`);
      } else {
        console.log(`  ❌ Total Value: "${totalValue}" (required for ${type})`);
      }
    }
    
    // Date
    const buyDate = row.buyDate;
    try {
      const parsedDate = testDateParsing(buyDate);
      console.log(`  ✅ Buy Date: "${buyDate}" -> ${parsedDate.toISOString().split('T')[0]} (valid)`);
    } catch (error) {
      console.log(`  ❌ Buy Date: "${buyDate}" -> ${error.message}`);
    }
    
    // Account
    const accountName = row.accountName;
    if (accountName && accountName.trim()) {
      const normalized = normalizeAccountName(accountName);
      const found = sampleAccounts.includes(normalized);
      console.log(`  ${found ? '✅' : '⚠️'} Account: "${accountName}" -> normalized: "${normalized}" ${found ? '(found in sample accounts)' : '(not in sample accounts)'}`);
      if (!found) {
        console.log(`    Available sample accounts: ${sampleAccounts.join(', ')}`);
      }
    } else {
      console.log(`  ❌ Account: "${accountName}" (required)`);
    }
    
    // Goal (optional)
    const goalName = row.goalName;
    if (goalName && goalName.trim()) {
      const normalized = normalizeAccountName(goalName);
      const found = sampleGoals.includes(normalized);
      console.log(`  ${found ? '✅' : '⚠️'} Goal: "${goalName}" -> normalized: "${normalized}" ${found ? '(found in sample goals)' : '(not in sample goals)'}`);
    } else {
      console.log(`  ℹ️  Goal: "${goalName}" (optional, empty)`);
    }
    
  } catch (error) {
    console.log(`❌ Parse error: ${error.message}`);
  }
}

console.log('\n=== Recommendations ===');
console.log('1. Ensure your CSV has exactly these headers in this order:');
console.log('   type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes');
console.log('2. Use YYYY-MM-DD format for dates (e.g., 2024-01-15)');
console.log('3. For STOCK/MUTUAL_FUND/CRYPTO: provide units and buyPrice, leave totalValue empty');
console.log('4. For REAL_ESTATE/JEWELRY/GOLD/FD/OTHER: provide totalValue, leave units and buyPrice empty');
console.log('5. Account names must match exactly (case-insensitive) with existing accounts in your system');
console.log('6. Goal names are optional but must match existing goals if provided');

console.log('\n=== Sample Corrected CSV ===');
const correctedSample = `type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes
STOCK,Reliance Industries,RELIANCE,10,2500.50,,2024-01-15,Long Term Growth,Zerodha,Blue chip stock
MUTUAL_FUND,SBI Bluechip Fund,SBI_BLUECHIP,100,85.25,,2024-02-01,Retirement Fund,SBI Bank,Monthly SIP
REAL_ESTATE,Mumbai Apartment,,,,,5000000,2023-12-01,Real Estate Portfolio,HDFC Bank,Primary residence`;

console.log(correctedSample);

// Write corrected sample
fs.writeFileSync('corrected-sample.csv', correctedSample);
console.log('\n✅ Saved corrected sample as: corrected-sample.csv');