// Debug script to test CSV import functionality
const fs = require('fs');

// Create a test CSV file with common issues
const testCSV = `type,name,symbol,units,buyPrice,totalValue,buyDate,goalName,accountName,notes
STOCK,"Reliance Industries Ltd",RELIANCE,10,2500.50,,15/01/2024,"Long Term Growth","Zerodha","Blue chip stock"
MUTUAL_FUND,"SBI Bluechip Fund",SBI_BLUECHIP,100,85.25,,01-02-2024,"Retirement Fund","SBI Bank","Monthly SIP"
REAL_ESTATE,"Apartment in Mumbai",,,,,5000000,2023-12-01,"Real Estate Portfolio","HDFC Bank","Primary residence"
STOCK,"HDFC Bank",HDFC,5,1650.75,,2024/01/20,"Long Term Growth","Zerodha ","Banking stock"`;

// Write test CSV
fs.writeFileSync('test-import.csv', testCSV);

console.log('Test CSV created: test-import.csv');
console.log('Contents:');
console.log(testCSV);

console.log('\nNote the following potential issues in this CSV:');
console.log('1. Different date formats: 15/01/2024, 01-02-2024, 2023-12-01, 2024/01/20');
console.log('2. Account name with trailing space: "Zerodha "');
console.log('3. Mixed quote usage');
console.log('4. Empty fields for different investment types');

// Test the parsing logic
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

console.log('\nTesting CSV parsing:');
const lines = testCSV.split('\n');
const headers = parseCSVLine(lines[0]);
console.log('Headers:', headers);

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  console.log(`\nRow ${i}:`, values);
  console.log(`Account name: "${values[8]}" (length: ${values[8].length})`);
  console.log(`Buy date: "${values[6]}"`);
}