import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface StandeePdfOptions {
  layout: 'standee_4x6' | 'table_tent_a4' | 'dual_a4';
  theme: 'luxury_dark' | 'eco_white';
  tableMode: 'general' | 'single' | 'batch';
  tableNumber?: string;
  batchStart?: number;
  batchEnd?: number;
  restaurantName?: string;
  tagline?: string;
  menuUrl: string;
}

// Generates high-res QR code data URL (PNG)
async function generateHighResQr(url: string, isDarkTheme: boolean): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    color: {
      dark: '#1c0e07',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Draws a single standee face onto a jsPDF document
 */
function drawStandeeCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  qrDataUrl: string,
  tableLabel: string | null,
  options: StandeePdfOptions
) {
  const isDark = options.theme === 'luxury_dark';

  // Background
  if (isDark) {
    doc.setFillColor(22, 10, 4); // #160a04 rich dark espresso
    doc.rect(x, y, width, height, 'F');
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, width, height, 'F');
  }

  // Outer Gold Border
  doc.setDrawColor(223, 183, 108); // #dfb76c gold
  doc.setLineWidth(1.2);
  doc.roundedRect(x + 3, y + 3, width - 6, height - 6, 4, 4, 'D');

  // Inner Subtle Border
  doc.setLineWidth(0.4);
  doc.roundedRect(x + 5, y + 5, width - 10, height - 10, 3, 3, 'D');

  // Ornate Corner Accents
  const cornerSize = 4;
  const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
    doc.setLineWidth(0.8);
    doc.line(cx, cy, cx + dx * cornerSize, cy);
    doc.line(cx, cy, cx, cy + dy * cornerSize);
  };
  drawCorner(x + 7, y + 7, 1, 1);
  drawCorner(x + width - 7, y + 7, -1, 1);
  drawCorner(x + 7, y + height - 7, 1, -1);
  drawCorner(x + width - 7, y + height - 7, -1, -1);

  // Brand Name
  const centerX = x + width / 2;
  let currentY = y + 14;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  if (isDark) {
    doc.setTextColor(245, 226, 159); // bright gold #f5e29f
  } else {
    doc.setTextColor(32, 15, 7); // deep roast
  }
  doc.text(options.restaurantName || 'THE CHAI DEN', centerX, currentY, { align: 'center' });

  // Subtitle
  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(197, 155, 65); // gold accent
  doc.text('PREMIUM CAFE & ARTISAN BREWS', centerX, currentY, { align: 'center' });

  // Tagline
  currentY += 3.5;
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  if (isDark) {
    doc.setTextColor(234, 219, 200);
  } else {
    doc.setTextColor(100, 70, 50);
  }
  doc.text(options.tagline || '“Sip Happiness, Live Every Moment”', centerX, currentY, { align: 'center' });

  // Table Label Banner (if table number provided)
  if (tableLabel) {
    currentY += 4.5;
    const badgeW = 32;
    const badgeH = 5.5;
    doc.setFillColor(223, 183, 108);
    doc.roundedRect(centerX - badgeW / 2, currentY, badgeW, badgeH, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 10, 4);
    doc.text(tableLabel.toUpperCase(), centerX, currentY + 4, { align: 'center' });
    currentY += badgeH + 2;
  } else {
    currentY += 3;
  }

  // QR Code Frame & Image
  const qrBoxSize = width * 0.52; // scaled to standee width
  const qrBoxX = centerX - qrBoxSize / 2;
  const qrBoxY = currentY;

  // White backing for QR code
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(223, 183, 108);
  doc.setLineWidth(0.8);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 2, 2, 'FD');

  // Embed QR Image inside box with 2mm inner padding
  const qrInnerPad = 2;
  doc.addImage(
    qrDataUrl,
    'PNG',
    qrBoxX + qrInnerPad,
    qrBoxY + qrInnerPad,
    qrBoxSize - qrInnerPad * 2,
    qrBoxSize - qrInnerPad * 2
  );

  currentY = qrBoxY + qrBoxSize + 6;

  // Customer Instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  if (isDark) {
    doc.setTextColor(245, 226, 159);
  } else {
    doc.setTextColor(22, 10, 4);
  }
  doc.text('SCAN TO VIEW DIGITAL MENU', centerX, currentY, { align: 'center' });

  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  if (isDark) {
    doc.setTextColor(223, 183, 108);
  } else {
    doc.setTextColor(110, 90, 70);
  }
  doc.text('Point smartphone camera to view live prices & specialties', centerX, currentY, { align: 'center' });

  // Divider line
  currentY += 3;
  doc.setDrawColor(223, 183, 108);
  doc.setLineWidth(0.3);
  doc.line(centerX - 24, currentY, centerX + 24, currentY);

  // Footer URL & Wi-Fi note
  currentY += 3.5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.5);
  if (isDark) {
    doc.setTextColor(180, 160, 140);
  } else {
    doc.setTextColor(120, 100, 80);
  }
  doc.text('Free Guest Wi-Fi • Contactless Order', centerX, currentY, { align: 'center' });

  currentY += 2.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(options.menuUrl, centerX, currentY, { align: 'center' });
}

/**
 * Builds and downloads the Standee PDF according to specified options
 */
export async function generateStandeePdf(options: StandeePdfOptions): Promise<void> {
  const tableList: (string | null)[] = [];

  if (options.tableMode === 'batch') {
    const start = Math.max(1, options.batchStart || 1);
    const end = Math.max(start, options.batchEnd || 10);
    for (let i = start; i <= end; i++) {
      tableList.push(`Table ${i}`);
    }
  } else if (options.tableMode === 'single') {
    tableList.push(options.tableNumber ? `Table ${options.tableNumber}` : 'Table 1');
  } else {
    tableList.push(null); // General table standee
  }

  // 1. Layout: 4x6 inch standard acrylic standee (101.6mm x 152.4mm)
  if (options.layout === 'standee_4x6') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [101.6, 152.4], // 4x6 inches
    });

    for (let idx = 0; idx < tableList.length; idx++) {
      if (idx > 0) doc.addPage([101.6, 152.4], 'portrait');

      const tableLabel = tableList[idx];
      const targetUrl = tableLabel
        ? `${options.menuUrl}${options.menuUrl.includes('?') ? '&' : '?'}table=${encodeURIComponent(tableLabel)}`
        : options.menuUrl;

      const qr = await generateHighResQr(targetUrl, options.theme === 'luxury_dark');
      drawStandeeCard(doc, 0, 0, 101.6, 152.4, qr, tableLabel, options);
    }

    const filename =
      options.tableMode === 'batch'
        ? `The_Chai_Den_Standees_Batch_${options.batchStart || 1}_to_${options.batchEnd || 10}.pdf`
        : tableList[0]
        ? `The_Chai_Den_Standee_${tableList[0].replace(/\s+/g, '_')}.pdf`
        : 'The_Chai_Den_Table_Standee.pdf';

    doc.save(filename);
    return;
  }

  // 2. Layout: Foldable Table Tent (A4: 210mm x 297mm)
  // Has two symmetrical standee faces and a center dashed fold line
  if (options.layout === 'table_tent_a4') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const cardWidth = 130;
    const cardHeight = 125;
    const cardX = (pageWidth - cardWidth) / 2;

    for (let idx = 0; idx < tableList.length; idx++) {
      if (idx > 0) doc.addPage('a4', 'portrait');

      const tableLabel = tableList[idx];
      const targetUrl = tableLabel
        ? `${options.menuUrl}${options.menuUrl.includes('?') ? '&' : '?'}table=${encodeURIComponent(tableLabel)}`
        : options.menuUrl;

      const qr = await generateHighResQr(targetUrl, options.theme === 'luxury_dark');

      // Top Face
      drawStandeeCard(doc, cardX, 15, cardWidth, cardHeight, qr, tableLabel, options);

      // Center fold guide
      const foldY = pageHeight / 2;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, foldY, pageWidth - 10, foldY);
      doc.setLineDashPattern([], 0); // reset

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text('✂ FOLD LINE (FOLD DOWNWARD TO CREATE STANDING TABLE TENT) ✂', pageWidth / 2, foldY - 1.5, {
        align: 'center',
      });

      // Bottom Face
      drawStandeeCard(doc, cardX, foldY + 8, cardWidth, cardHeight, qr, tableLabel, options);
    }

    const filename =
      options.tableMode === 'batch'
        ? `The_Chai_Den_Table_Tents_Batch_${options.batchStart || 1}_to_${options.batchEnd || 10}.pdf`
        : tableList[0]
        ? `The_Chai_Den_Table_Tent_${tableList[0].replace(/\s+/g, '_')}.pdf`
        : 'The_Chai_Den_Table_Tent_Card.pdf';

    doc.save(filename);
    return;
  }

  // 3. Layout: Dual Standees on single A4 sheet (2 cards side-by-side or stacked with cut guide)
  if (options.layout === 'dual_a4') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const cardWidth = 100;
    const cardHeight = 135;
    const cardX = (pageWidth - cardWidth) / 2;

    // Chunk tables in pairs of 2 per sheet
    for (let i = 0; i < tableList.length; i += 2) {
      if (i > 0) doc.addPage('a4', 'portrait');

      // Top Card
      const tableLabel1 = tableList[i];
      const targetUrl1 = tableLabel1
        ? `${options.menuUrl}${options.menuUrl.includes('?') ? '&' : '?'}table=${encodeURIComponent(tableLabel1)}`
        : options.menuUrl;
      const qr1 = await generateHighResQr(targetUrl1, options.theme === 'luxury_dark');
      drawStandeeCard(doc, cardX, 10, cardWidth, cardHeight, qr1, tableLabel1, options);

      // Cut separator line
      const cutY = pageHeight / 2;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, cutY, pageWidth - 10, cutY);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text('✂ CUT ALONG DOTTED LINE FOR 2 SEPARATE STAND CARDS ✂', pageWidth / 2, cutY - 1.5, {
        align: 'center',
      });

      // Bottom Card (if available)
      if (i + 1 < tableList.length) {
        const tableLabel2 = tableList[i + 1];
        const targetUrl2 = tableLabel2
          ? `${options.menuUrl}${options.menuUrl.includes('?') ? '&' : '?'}table=${encodeURIComponent(tableLabel2)}`
          : options.menuUrl;
        const qr2 = await generateHighResQr(targetUrl2, options.theme === 'luxury_dark');
        drawStandeeCard(doc, cardX, cutY + 7, cardWidth, cardHeight, qr2, tableLabel2, options);
      }
    }

    const filename =
      options.tableMode === 'batch'
        ? `The_Chai_Den_Dual_Standees_Batch_${options.batchStart || 1}_to_${options.batchEnd || 10}.pdf`
        : 'The_Chai_Den_Dual_Standee_Sheet.pdf';

    doc.save(filename);
  }
}
