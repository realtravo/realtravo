import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { BookingPDFData, generateQRCodeData, downloadBookingAsPDF } from "@/lib/pdfBookingExport";
import { toast } from "sonner";

interface BookingDownloadButtonProps {
  booking: BookingPDFData;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const BookingDownloadButton = ({ 
  booking, 
  variant = "outline", 
  size = "sm",
  className 
}: BookingDownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Get QR code as data URL
      const canvas = qrRef.current;
      if (!canvas) {
        throw new Error("QR code not ready");
      }
      const qrCodeDataUrl = canvas.toDataURL("image/png");
      
      await downloadBookingAsPDF(booking, qrCodeDataUrl);
      toast.success("Booking PDF downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download booking");
    } finally {
      setIsDownloading(false);
    }
  };

  const qrData = generateQRCodeData(booking);

  return (
    <>
      {/* Hidden QR Code Canvas */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <QRCodeCanvas
          ref={qrRef}
          value={qrData}
          size={256}
          level="H"
          includeMargin
        />
      </div>
      
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isDownloading}
        className={className}
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>
    </>
  );
};
