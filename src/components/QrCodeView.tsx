import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Coffee,
  FileDown,
  Layers,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { generateStandeePdf, StandeePdfOptions } from '../utils/standeePdfGenerator';

interface QrCodeViewProps {
  onBackToMenu: () => void;
  isOwnerView?: boolean;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ onBackToMenu, isOwnerView = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  // PDF Configuration State
  const [pdfLayout, setPdfLayout] = useState<'standee_4x6' | 'table_tent_a4' | 'dual_a4'>('standee_4x6');
  const [pdfTheme, setPdfTheme] = useState<'luxury_dark' | 'eco_white'>('luxury_dark');
  const [tableMode, setTableMode] = useState<'general' | 'single' | 'batch'>('general');
  const [singleTableNumber, setSingleTableNumber] = useState('1');
  const [batchStart, setBatchStart] = useState(1);
  const [batchEnd, setBatchEnd] = useState(10);

  useEffect(() => {
    // Generate real public URL based on current host
    const origin = window.location.origin;
    // Base menu URL
    const url = `${origin}/#menu`;
    setPublicUrl(url);

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#1c0e07',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrPng = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'The_Chai_Den_Menu_QR.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      const options: StandeePdfOptions = {
        layout: pdfLayout,
        theme: pdfTheme,
        tableMode,
        tableNumber: singleTableNumber,
        batchStart,
        batchEnd,
        restaurantName: 'THE CHAI DEN',
        tagline: '“Sip Happiness, Live Every Moment”',
        menuUrl: publicUrl || `${window.location.origin}/#menu`,
      };

      await generateStandeePdf(options);

      const msg =
        tableMode === 'batch'
          ? `Batch standees for Tables ${batchStart} to ${batchEnd} exported to PDF!`
          : tableMode === 'single'
          ? `Table ${singleTableNumber} Standee exported to PDF!`
          : 'Tabletop Standee exported to PDF!';

      setPdfSuccessMessage(msg);
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to generate standee PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0603] text-[#f5efe6] p-4 sm:p-8 flex flex-col items-center justify-start">
      {/* Top Navigation (no-print) */}
      <div className="w-full max-w-2xl mb-6 flex items-center justify-between no-print">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e0e07] border border-[#dfb76c]/40 text-sm font-outfit text-[#dfb76c] hover:bg-[#2d160b] hover:border-[#dfb76c] transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Public Menu
        </button>

        <div className="flex items-center gap-2">
          {isOwnerView && (
            <span className="text-xs uppercase tracking-widest text-[#dfb76c]/80 bg-[#1e0e07] px-3 py-1 rounded-full border border-[#dfb76c]/30">
              Owner QR Station
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#1c0e07] bg-[#dfb76c] px-3 py-1 rounded-full shadow">
            <FileDown className="w-3.5 h-3.5" />
            PDF Standee Ready
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl space-y-6">
        {/* PDF Success Notification */}
        {pdfSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in no-print">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="font-outfit font-medium">{pdfSuccessMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-mono">PDF Saved</span>
          </div>
        )}

        {/* PRIMARY ACTIONS: PRINT STANDEE TO PDF & PRINT */}
        <div className="bg-[#160a04] border-2 border-[#dfb76c]/60 rounded-2xl p-4 sm:p-5 shadow-xl no-print">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#dfb76c]/20">
            <div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient flex items-center gap-2">
                <FileDown className="w-5 h-5 text-[#dfb76c]" />
                Print Table Standees to PDF
              </h2>
              <p className="text-xs text-[#dfb76c]/70 font-outfit mt-0.5">
                Generate high-resolution printable table standees & folding tent cards for your tables
              </p>
            </div>

            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#241108] border border-[#dfb76c]/40 text-xs font-outfit text-[#f5e29f] hover:bg-[#32170a] transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#dfb76c]" />
              <span>{showOptions ? 'Hide PDF Options' : 'PDF Settings'}</span>
              {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick PDF Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-wider font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className={`w-4 h-4 ${generatingPdf ? 'animate-bounce' : ''}`} />
              <span>
                {generatingPdf
                  ? 'Generating Standee PDF...'
                  : tableMode === 'batch'
                  ? `Download Batch Standees PDF (${batchStart}–${batchEnd})`
                  : tableMode === 'single'
                  ? `Download Table ${singleTableNumber} Standee PDF`
                  : 'Download Standee to PDF'}
              </span>
            </button>

            <button
              onClick={handlePrintBrowser}
              className="py-3 px-4 rounded-xl bg-[#281309] border border-[#dfb76c]/60 text-[#f5e29f] font-bold text-xs uppercase tracking-wider font-outfit hover:bg-[#381a0b] hover:border-[#dfb76c] shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#dfb76c]" />
              <span>Print via Browser (Save as PDF)</span>
            </button>
          </div>

          {/* Collapsible PDF Customization Options */}
          {showOptions && (
            <div className="mt-4 pt-4 border-t border-[#dfb76c]/20 space-y-4 animate-in fade-in">
              {/* Option 1: Standee Paper & Layout Format */}
              <div>
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#dfb76c]" />
                  Standee Format & Layout
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPdfLayout('standee_4x6')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      pdfLayout === 'standee_4x6'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Acrylic Standee (4" x 6")</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Standard tabletop clear acrylic sign holders
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfLayout('table_tent_a4')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      pdfLayout === 'table_tent_a4'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Foldable Table Tent (A4)</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Self-standing fold card with center fold line
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfLayout('dual_a4')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      pdfLayout === 'dual_a4'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Dual Standees (A4)</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      2 standees per page with dotted cut guide lines
                    </span>
                  </button>
                </div>
              </div>

              {/* Option 2: Table Numbering Mode */}
              <div>
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#dfb76c]" />
                  Table Numbering
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTableMode('general')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      tableMode === 'general'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">General Standee</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      No table number, universal menu card
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableMode('single')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      tableMode === 'single'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Specific Table</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Custom table label (e.g. Table 5)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableMode('batch')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      tableMode === 'batch'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Batch Print Range</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Print Tables 1 through N in one PDF!
                    </span>
                  </button>
                </div>

                {/* Sub-inputs for Specific or Batch mode */}
                {tableMode === 'single' && (
                  <div className="mt-3 p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 flex items-center gap-3">
                    <span className="text-xs text-[#dfb76c]/80 font-outfit whitespace-nowrap">
                      Table Number / Label:
                    </span>
                    <input
                      type="text"
                      value={singleTableNumber}
                      onChange={(e) => setSingleTableNumber(e.target.value)}
                      placeholder="e.g. 1 or VIP 2"
                      className="bg-[#120803] border border-[#dfb76c]/50 rounded-lg px-3 py-1.5 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c] w-36"
                    />
                  </div>
                )}

                {tableMode === 'batch' && (
                  <div className="mt-3 p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-[#dfb76c]/80 font-outfit">Table Range:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#dfb76c]/60">From Table:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={batchStart}
                        onChange={(e) => setBatchStart(parseInt(e.target.value) || 1)}
                        className="bg-[#120803] border border-[#dfb76c]/50 rounded-lg px-2.5 py-1 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c] w-16 text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#dfb76c]/60">To Table:</span>
                      <input
                        type="number"
                        min={batchStart}
                        max="100"
                        value={batchEnd}
                        onChange={(e) => setBatchEnd(parseInt(e.target.value) || batchStart)}
                        className="bg-[#120803] border border-[#dfb76c]/50 rounded-lg px-2.5 py-1 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c] w-16 text-center"
                      />
                    </div>
                    <span className="text-[11px] text-[#f5e29f] font-mono">
                      (Total {Math.max(1, batchEnd - batchStart + 1)} standee pages in PDF)
                    </span>
                  </div>
                )}
              </div>

              {/* Option 3: Theme Style */}
              <div>
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#dfb76c]" />
                  Color Theme for Print & PDF
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPdfTheme('luxury_dark')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      pdfTheme === 'luxury_dark'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Luxury Dark Espresso & Gold</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Signature cafe aesthetic with rich gold accents
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfTheme('eco_white')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      pdfTheme === 'eco_white'
                        ? 'bg-[#381a0b] border-[#dfb76c] text-[#f5efe6] ring-1 ring-[#dfb76c]'
                        : 'bg-[#200f07] border-[#dfb76c]/30 text-[#ded0c0] hover:border-[#dfb76c]/60'
                    }`}
                  >
                    <span className="font-bold block text-[#dfb76c]">Clean Print-Friendly White</span>
                    <span className="text-[10px] text-[#dfb76c]/70 block mt-0.5">
                      Toner-saving crisp white background with gold borders
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE PREVIEW: TABLETOP STANDEE / QR CARD */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-3 no-print">
            <span className="text-xs uppercase tracking-widest text-[#dfb76c]/80 font-outfit">
              Printable Standee Live Preview
            </span>
          </div>

          <div
            id="printable-standee-card"
            className={`w-full max-w-md border-[3px] border-[#dfb76c] rounded-2xl p-6 sm:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(223,183,108,0.2)] text-center relative overflow-hidden transition-colors ${
              pdfTheme === 'eco_white' ? 'bg-white text-black' : 'bg-[#160a04] text-[#f5efe6]'
            } print:border-4 print:border-black print:bg-white print:text-black`}
          >
            {/* Corner Filigree Borders */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#dfb76c] pointer-events-none" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#dfb76c] pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#dfb76c] pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#dfb76c] pointer-events-none" />

            {/* Cafe branding header */}
            <div className="mb-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#dfb76c] p-0.5 flex items-center justify-center shadow mb-2">
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center ${
                    pdfTheme === 'eco_white' ? 'bg-white' : 'bg-[#160a04]'
                  } print:bg-white`}
                >
                  <Coffee
                    className={`w-6 h-6 ${pdfTheme === 'eco_white' ? 'text-black' : 'text-[#dfb76c]'} print:text-black`}
                  />
                </div>
              </div>
              <h2
                className={`font-cinzel text-2xl sm:text-3xl font-extrabold tracking-widest ${
                  pdfTheme === 'eco_white' ? 'text-black' : 'text-gold-gradient'
                } print:text-black`}
              >
                THE CHAI DEN
              </h2>
              <p
                className={`font-outfit text-[11px] tracking-[0.3em] uppercase ${
                  pdfTheme === 'eco_white' ? 'text-gray-700' : 'text-[#dfb76c]/80'
                } print:text-gray-700`}
              >
                PREMIUM CAFE
              </p>
              <p
                className={`font-cormorant italic text-sm ${
                  pdfTheme === 'eco_white' ? 'text-gray-800' : 'text-[#eadbc8]'
                } print:text-gray-800 mt-1`}
              >
                “Sip Happiness, Live Every Moment”
              </p>

              {/* Dynamic Table Badge (if table mode selected) */}
              {tableMode === 'single' && (
                <div className="mt-2.5 inline-block px-3 py-0.5 rounded-full bg-[#dfb76c] text-[#1c0e07] font-bold text-xs font-outfit uppercase tracking-wider shadow">
                  Table {singleTableNumber}
                </div>
              )}
              {tableMode === 'batch' && (
                <div className="mt-2.5 inline-block px-3 py-0.5 rounded-full bg-[#dfb76c] text-[#1c0e07] font-bold text-xs font-outfit uppercase tracking-wider shadow">
                  Batch: Tables {batchStart} to {batchEnd}
                </div>
              )}
            </div>

            {/* QR Frame */}
            <div className="my-4 p-3 sm:p-4 bg-white rounded-xl inline-block shadow-inner border-2 border-[#dfb76c] print:border-black">
              <canvas ref={canvasRef} className="rounded mx-auto block max-w-full h-auto" />
            </div>

            {/* Customer instruction */}
            <div className="space-y-1">
              <h3
                className={`font-cinzel text-base sm:text-lg font-bold ${
                  pdfTheme === 'eco_white' ? 'text-black' : 'text-[#f5e29f]'
                } print:text-black tracking-wide`}
              >
                SCAN TO VIEW DIGITAL MENU
              </h3>
              <p
                className={`font-outfit text-xs ${
                  pdfTheme === 'eco_white' ? 'text-gray-600' : 'text-[#dfb76c]/80'
                } print:text-gray-600`}
              >
                Open camera on any smartphone to view live prices & drinks
              </p>
            </div>

            <div
              className={`mt-4 pt-3 border-t ${
                pdfTheme === 'eco_white' ? 'border-gray-300 text-gray-600' : 'border-[#dfb76c]/30 text-[#dfb76c]/60'
              } text-[10px] print:text-gray-600 font-mono truncate`}
            >
              {publicUrl}
            </div>
          </div>
        </div>

        {/* SECONDARY UTILITIES: DOWNLOAD PNG, COPY LINK, TEST LINK (no-print) */}
        <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-2.5 no-print pt-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#1c0e07] border border-[#dfb76c]/40 hover:border-[#dfb76c] hover:bg-[#2d160b] transition-all text-xs font-outfit text-[#f5efe6] cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#dfb76c]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Menu Link'}</span>
          </button>

          <button
            onClick={handleDownloadQrPng}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#1c0e07] border border-[#dfb76c]/40 hover:border-[#dfb76c] hover:bg-[#2d160b] transition-all text-xs font-outfit text-[#f5efe6] cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#dfb76c]" />
            <span>Download QR (PNG)</span>
          </button>
        </div>

        {/* Live Test Link (no-print) */}
        <div className="no-print text-center pt-1 pb-6">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#dfb76c]/80 hover:text-[#dfb76c] underline"
          >
            <span>Test Public Menu Link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
