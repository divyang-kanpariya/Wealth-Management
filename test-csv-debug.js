// Debug script to test CSV import with common issues
const fs = require('fs');

// Test the improved date parsing logic
function testDateParsing(dateString) {
  const trimmedVal = dateString.trim();
  if (!trimmedVal) {
    throw new Error('Buy date is required');
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
  // Try MM/DD/YYYY format
  else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmedVal)) {
    const [month, day, year] = trimmedVal.split('-');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try DD-MM-YYYY format
  else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmedVal)) {
    const [day, month, year] = trimmedVal.split('-');
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

// Test various date formats
const testDates = [
  '2024-01-15',    // ISO format
  '15/01/2024',    // DD/MM/YYYY
  '01/15/2024',    // MM/DD/YYYY (ambiguous)
  '15-01-2024',    // DD-MM-YYYY
  '01-15-2024',    // MM-DD-YYYY
  '2024/01/15',    // YYYY/MM/DD
  'invalid-date',  // Invalid
  '32/13/2024',    // Invalid date values
];

console.log('Testing date parsing:');
testDates.forEach(dateStr => {
  try {
    const parsed = testDateParsing(dateStr);
    console.log(`✓ "${dateStr}" -> ${parsed.toISOString().split('T')[0]}`);
  } catch (error) {
    console.log(`✗ "${dateStr}" -> ${error.message}`);
  }
});

// Test account name normalization
function normalizeAccountName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

const testAccounts = [
  'Zerodha',
  'zerodha',
  'ZERODHA',
  'Zerodha ',      // trailing space
  ' Zerodha',      // leading space
  'Zerodha  Bank', // multiple spaces
  'SBI Bank',
  'sbi bank',
  'SBI  Bank',
];

console.log('\nTesting account name normalization:');
testAccounts.forEach(account => {
  const normalized = normalizeAccountName(account);
  console.log(`"${account}" -> "${normalized}"`);
});

// Create a corrected test CSV
const correctedCSV = `type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes
STOCK,"Reliance Industries Ltd",RELIANCE,10,2500.50,,2024-01-15,"Long Term Growth",Zerodha,"Blue chip stock"
MUTUAL_FUND,"SBI Bluechip Fund",SBI_BLUECHIP,100,85.25,,2024-02-01,"Retirement Fund","SBI Bank","Monthly SIP"
REAL_ESTATE,"Apartment in Mumbai",,,,,5000000,2023-12-01,"Real Estate Portfolio","HDFC Bank","Primary residence"
STOCK,"HDFC Bank",HDFC,5,1650.75,,2024-01-20,"Long Term Growth",Zerodha,"Banking stock"`;

fs.writeFileSync('corrected-test-import.csv', correctedCSV);

console.log('\nCorrected CSV created: corrected-test-import.csv');
console.log('Key fixes:');
console.log('1. Standardized date format to YYYY-MM-DD');
console.log('2. Consistent account names');
console.log('3. Proper empty field handling');
console.log('4. Consistent quote usage');

// Test CSV parsing
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

console.log('\nTesting corrected CSV parsing:');
const lines = correctedCSV.split('\n');
const headers = parseCSVLine(lines[0]);
console.log('Headers:', headers);

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  console.log(`\nRow ${i}:`);
  console.log(`  Type: "${values[0]}"`);
  console.log(`  Name: "${values[1]}"`);
  console.log(`  Units: "${values[3]}"`);
  console.log(`  Buy Price: "${values[4]}"`);
  console.log(`  Total Value: "${values[5]}"`);
  console.log(`  Buy Date: "${values[6]}"`);
  console.log(`  Account: "${values[8]}"`);
  
  // Test date parsing for this row
  try {
    const parsedDate = testDateParsing(values[6]);
    console.log(`  ✓ Date parsed: ${parsedDate.toISOString().split('T')[0]}`);
  } catch (error) {
    console.log(`  ✗ Date error: ${error.message}`);
  }
}