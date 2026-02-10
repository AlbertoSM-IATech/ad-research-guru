import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  rawRowCount: number;
  delimiter?: string;
}

/**
 * Parse delimited text (CSV, TSV) using PapaParse for robust handling
 * of quoted fields, commas inside fields, etc.
 */
export function parseDelimitedText(text: string): ParsedTable {
  const trimmed = text.trim();
  if (!trimmed) {
    return { headers: [], rows: [], rawRowCount: 0 };
  }

  // Use PapaParse for robust CSV parsing
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
    transform: (value) => value.trim(),
  });

  const headers = result.meta.fields || [];
  const rows = result.data;

  return {
    headers,
    rows,
    rawRowCount: rows.length,
    delimiter: result.meta.delimiter,
  };
}

/**
 * Parse an Excel file (.xlsx, .xls) and return the first sheet as a ParsedTable
 */
export async function parseExcelFile(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({ headers: [], rows: [], rawRowCount: 0 });
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header: 1 to get array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as (string | number | undefined)[][];
        
        if (jsonData.length === 0) {
          resolve({ headers: [], rows: [], rawRowCount: 0 });
          return;
        }
        
        // First row is headers
        const headers = jsonData[0].map(h => String(h ?? '').trim());
        
        // Rest are data rows
        const rows = jsonData.slice(1).map(row => {
          const rowObj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowObj[header] = String(row[idx] ?? '').trim();
          });
          return rowObj;
        }).filter(row => Object.values(row).some(v => v !== '')); // Filter empty rows
        
        resolve({
          headers,
          rows,
          rawRowCount: rows.length,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse any supported file (CSV, TSV, TXT, XLSX, XLS)
 */
export async function parseFile(file: File): Promise<ParsedTable> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  }
  
  // For text-based files, read as text and parse
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(parseDelimitedText(text));
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

/**
 * Detect if a string looks like a header row (vs data)
 */
export function looksLikeHeaderRow(values: string[]): boolean {
  // If all values are numeric, it's probably data
  const allNumeric = values.every(v => !isNaN(Number(v.replace(/[,$%]/g, ''))));
  if (allNumeric && values.length > 0) return false;
  
  // If values contain common header words, it's probably headers
  const headerKeywords = [
    'keyword', 'volume', 'search', 'competition', 'competitor',
    'phrase', 'cpc', 'bid', 'rank', 'results', 'products',
    'palabra', 'volumen', 'búsqueda', 'competencia'
  ];
  
  const hasHeaderWord = values.some(v => 
    headerKeywords.some(kw => v.toLowerCase().includes(kw))
  );
  
  return hasHeaderWord;
}
