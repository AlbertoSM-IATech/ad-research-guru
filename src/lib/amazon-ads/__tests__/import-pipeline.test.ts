import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { detectSheets } from '@/lib/amazon-ads/sheet-detector';
import { autoMapColumns } from '@/lib/amazon-ads/column-mapper';
import { parseRow } from '@/lib/amazon-ads/row-parser';
import { normalizeNumber, normalizeDate } from '@/lib/amazon-ads/normalizers';

// Helper: create a fake Amazon Ads xlsx workbook
function createTestWorkbook() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sponsored Products report (English headers)
  const spData = [
    ['Date', 'Campaign Name', 'Campaign Id', 'Ad Group Name', 'Targeting', 'Match Type', 'Impressions', 'Clicks', 'Spend', '7 Day Total Sales', '7 Day Total Orders (#)', '7 Day Total Units (#)'],
    ['2025-01-15', 'SP - Meditacion', 'C001', 'AG - General', 'meditacion para principiantes', 'BROAD', 1500, 25, 12.50, 45.00, 3, 3],
    ['2025-01-15', 'SP - Meditacion', 'C001', 'AG - General', 'mindfulness libro', 'PHRASE', 800, 10, 5.00, 15.00, 1, 1],
    ['2025-01-16', 'SP - Meditacion', 'C001', 'AG - General', 'meditacion para principiantes', 'BROAD', 1200, 20, 10.00, 30.00, 2, 2],
    ['2025-01-16', 'SP - Yoga', 'C002', 'AG - Yoga', 'yoga para principiantes', 'EXACT', 500, 8, 4.00, 0, 0, 0],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(spData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Sponsored Products');

  // Sheet 2: Search Term report (Spanish headers)
  const stData = [
    ['Fecha', 'Nombre de campaña', 'Término de búsqueda', 'Impresiones', 'Clics', 'Gasto', 'Ventas', 'Pedidos'],
    ['15/01/2025', 'SP - Meditacion', 'meditacion guiada', 300, 5, '2,50', '0,00', 0],
    ['15/01/2025', 'SP - Meditacion', 'libro meditacion', 200, 3, '1,50', '15,00', 1],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(stData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Search Terms');

  // Sheet 3: Irrelevant sheet
  const miscData = [
    ['Notes', 'Comments'],
    ['This is a notes sheet', 'Ignore this'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(miscData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Notes');

  return wb;
}

describe('Amazon Ads Import Pipeline', () => {
  describe('normalizers', () => {
    it('should normalize European-format numbers', () => {
      expect(normalizeNumber('1.234,56')).toBe(1234.56);
      expect(normalizeNumber('2,50')).toBe(2.50);
      expect(normalizeNumber('0,00')).toBe(0);
    });

    it('should normalize US-format numbers', () => {
      expect(normalizeNumber('1,234.56')).toBe(1234.56);
      expect(normalizeNumber('12.50')).toBe(12.50);
    });

    it('should normalize dates', () => {
      expect(normalizeDate('2025-01-15')).toBe('2025-01-15');
      expect(normalizeDate('15/01/2025')).toBe('2025-01-15');
      expect(normalizeDate('01/15/2025')).toBe('2025-01-15');
    });

    it('should handle currency symbols', () => {
      expect(normalizeNumber('$12.50')).toBe(12.50);
      expect(normalizeNumber('€2,50')).toBe(2.50);
    });
  });

  describe('sheet-detector', () => {
    it('should detect sheets and rank them by confidence', () => {
      const wb = createTestWorkbook();
      const sheets = detectSheets(wb);

      expect(sheets.length).toBeGreaterThanOrEqual(2);

      // The SP sheet should be detected with high confidence
      const spSheet = sheets.find(s => s.name === 'Sponsored Products');
      expect(spSheet).toBeDefined();
      expect(spSheet!.headers.length).toBeGreaterThan(5);

      // Notes sheet should have low confidence
      const notesSheet = sheets.find(s => s.name === 'Notes');
      expect(notesSheet).toBeDefined();
      expect(notesSheet!.confidence).toBe('low');
    });
  });

  describe('column-mapper', () => {
    it('should auto-map English headers', () => {
      const headers = ['Date', 'Campaign Name', 'Impressions', 'Clicks', 'Spend', '7 Day Total Sales', '7 Day Total Orders (#)'];
      const mappings = autoMapColumns(headers);

      const mapped = new Map(mappings.map(m => [m.internalField, m]));

      expect(mapped.has('date')).toBe(true);
      expect(mapped.has('campaignName')).toBe(true);
      expect(mapped.has('impressions')).toBe(true);
      expect(mapped.has('clicks')).toBe(true);
      expect(mapped.has('spend')).toBe(true);
      expect(mapped.has('sales')).toBe(true);
    });

    it('should auto-map Spanish headers', () => {
      const headers = ['Fecha', 'Nombre de campaña', 'Impresiones', 'Clics', 'Gasto', 'Ventas', 'Pedidos'];
      const mappings = autoMapColumns(headers);

      const mapped = new Map(mappings.map(m => [m.internalField, m]));

      expect(mapped.has('date')).toBe(true);
      expect(mapped.has('campaignName')).toBe(true);
      expect(mapped.has('impressions')).toBe(true);
      expect(mapped.has('clicks')).toBe(true);
      expect(mapped.has('spend')).toBe(true);
    });
  });

  describe('row-parser', () => {
    it('should parse a row with English headers', () => {
      const mappings = autoMapColumns([
        'Date', 'Campaign Name', 'Campaign Id', 'Ad Group Name',
        'Targeting', 'Match Type', 'Impressions', 'Clicks',
        'Spend', '7 Day Total Sales', '7 Day Total Orders (#)', '7 Day Total Units (#)',
      ]);
      const rawRow: Record<string, unknown> = {
        'Date': '2025-01-15',
        'Campaign Name': 'SP - Meditacion',
        'Campaign Id': 'C001',
        'Ad Group Name': 'AG - General',
        'Targeting': 'meditacion para principiantes',
        'Match Type': 'BROAD',
        'Impressions': 1500,
        'Clicks': 25,
        'Spend': 12.50,
        '7 Day Total Sales': 45.00,
        '7 Day Total Orders (#)': 3,
        '7 Day Total Units (#)': 3,
      };

      const parsed = parseRow(rawRow, mappings);

      expect(parsed.errors).toHaveLength(0);
      expect(parsed.campaignName).toBe('SP - Meditacion');
      expect(parsed.impressions).toBe(1500);
      expect(parsed.clicks).toBe(25);
      expect(parsed.spend).toBe(12.50);
      expect(parsed.sales).toBe(45.00);
      expect(parsed.orders).toBe(3);
      expect(parsed.rowHash).toBeTruthy();
    });
  });

  describe('full pipeline integration', () => {
    it('should process a workbook end-to-end', () => {
      const wb = createTestWorkbook();

      // Step 1: Detect sheets
      const sheets = detectSheets(wb);
      expect(sheets.length).toBeGreaterThanOrEqual(2);

      // Step 2: Pick best sheet
      const bestSheet = sheets.find(s => s.confidence === 'high') || sheets[0];
      expect(bestSheet).toBeDefined();

      // Step 3: Map columns
      const mappings = autoMapColumns(bestSheet.headers);
      const requiredFields = ['impressions', 'clicks', 'spend'];
      const mappedFields = new Set(mappings.map(m => m.internalField));
      for (const field of requiredFields) {
        expect(mappedFields.has(field)).toBe(true);
      }

      // Step 4: Read data and parse rows
      const ws = wb.Sheets[bestSheet.name];
      const rawRows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      expect(rawRows.length).toBeGreaterThan(0);

      const parsedRows = rawRows.map(row => parseRow(row, mappings));
      const validRows = parsedRows.filter(r => r.errors.length === 0);

      expect(validRows.length).toBeGreaterThan(0);
      expect(validRows[0].impressions).toBeGreaterThan(0);
    });
  });
});
