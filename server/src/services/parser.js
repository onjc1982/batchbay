import { readFile, unlink } from 'fs/promises';
import * as XLSX from 'xlsx';

/**
 * Parse an uploaded CSV or Excel file
 * @param {string} filePath - Path to the uploaded file
 * @param {string} ext - File extension (csv, xlsx, xls)
 * @returns {Promise<{rows: Object[], columns: string[]}>}
 */
export async function parseUploadedFile(filePath, ext) {
  let rows = [];
  let columns = [];

  if (ext === 'csv') {
    const result = await parseCSV(filePath);
    rows = result.rows;
    columns = result.columns;
  } else if (ext === 'xlsx' || ext === 'xls') {
    const result = await parseExcel(filePath);
    rows = result.rows;
    columns = result.columns;
  }

  // Clean up temp file
  try {
    await unlink(filePath);
  } catch (e) {
    // Ignore cleanup errors
  }

  return { rows, columns };
}

/**
 * Parse a CSV file
 */
async function parseCSV(filePath) {
  // Read the file and parse manually for simplicity
  const content = await readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    return { rows: [], columns: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  const columns = headers.map(h => h.trim());

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });
    rows.push(row);
  }

  return { rows, columns };
}

/**
 * Parse a single CSV line respecting quoted values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse an Excel file
 */
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], columns: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (data.length === 0) {
    return { rows: [], columns: [] };
  }

  const columns = Object.keys(data[0]);
  const rows = data.map(row => {
    const cleanRow = {};
    columns.forEach(col => {
      cleanRow[col] = row[col] !== undefined ? String(row[col]) : '';
    });
    return cleanRow;
  });

  return { rows, columns };
}