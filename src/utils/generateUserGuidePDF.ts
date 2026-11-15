import { jsPDF } from 'jspdf';

export function generateUserGuidePDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [37, 99, 235]; // Blue
  const darkColor = [15, 23, 42]; // Slate 900
  const grayColor = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50

  let y = 20;

  // Header Banner Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PRO PDF DATA EXTRACTOR', 15, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Official User Guide & Manual (دليل الاستخدام الرسمي)', 15, 28);

  y = 45;

  // Section 1: Welcome & Overview
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('1. Welcome & Overview', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const overviewText = doc.splitTextToSize(
    'Pro PDF Data Extractor is a powerful web application designed to extract text lines, keywords, and structured tables from PDF files quickly and accurately. Whether you are dealing with invoices, financial reports, or multi-page documents, this tool automates your data extraction workflow.',
    180
  );
  doc.text(overviewText, 15, y);
  y += overviewText.length * 5 + 10;

  // Section 2: Key Features
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('2. Core Features & Extraction Modes', 15, y);
  y += 7;

  const features = [
    {
      title: '• Line Numbers Extraction:',
      desc: 'Extract specific line numbers across one or multiple PDF files (e.g., lines 1, 3, 5-8).',
    },
    {
      title: '• Keywords / Labels Search:',
      desc: 'Search for specific keywords (e.g., Invoice, Date, Total) with robust Arabic & English normalization (handling tashkeel and alef variants).',
    },
    {
      title: '• Combined Mode:',
      desc: 'Extract both specific line numbers and keyword matches into a single unified row per file.',
    },
    {
      title: '• Table Auto-Detect (Spatial Clustering):',
      desc: 'Automatically detect multi-column table structures, headers, and aligned columns using 1D spatial coordinate analysis without requiring manual line numbers or keywords.',
    },
    {
      title: '• Instant Excel Export:',
      desc: 'Download all extracted results instantly as a formatted Excel spreadsheet (.xlsx).',
    },
  ];

  doc.setFontSize(10);
  for (const feat of features) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(feat.title, 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const descLines = doc.splitTextToSize(feat.desc, 175);
    doc.text(descLines, 20, y);
    y += descLines.length * 5 + 4;
  }

  y += 5;

  // Section 3: Step-by-Step Instructions
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('3. Step-by-Step Usage Guide', 15, y);
  y += 7;

  const steps = [
    'Step 1: Upload your PDF files via drag & drop, file picker, or by pasting direct PDF URLs.',
    'Step 2: Choose your scan scope: Scan "First Page Only" or "All Pages" of each document.',
    'Step 3: Select your Extraction Mode (Line Numbers, Keywords, Combined, or Table Auto-Detect).',
    'Step 4: Enter your target line numbers or keywords in the configuration settings.',
    'Step 5: Click "Run Extraction" and wait for the process to complete in real-time.',
    'Step 6: Review extracted data in the interactive preview table, search records, or click "Export to Excel" to download your report.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const step of steps) {
    const stepLines = doc.splitTextToSize(step, 180);
    doc.text(stepLines, 15, y);
    y += stepLines.length * 5 + 4;
  }

  // Footer
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 280, 195, 280);

  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Pro PDF Data Extractor © 2026 - All Rights Reserved', 15, 285);
  doc.text('Page 1 of 1', 180, 285, { align: 'right' });

  // Save PDF
  doc.save('Pro_PDF_Data_Extractor_User_Guide.pdf');
}
