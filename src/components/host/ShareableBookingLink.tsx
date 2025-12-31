import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link, Check, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareableBookingLinkProps {
  itemId: string;
  itemType: string;
  itemName: string;
}

export const ShareableBookingLink = ({ itemId, itemType, itemName }: ShareableBookingLinkProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const bookingLink = `${window.location.origin}/book/${itemType}/${itemId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      toast({ title: "Copied!", description: "Booking link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Book ${itemName}`,
          text: `Book your spot at ${itemName}`,
          url: bookingLink,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl border-[#008080] text-[#008080] hover:bg-[#008080]/10"
        >
          <Link className="h-4 w-4" />
          Share Booking Form
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-tight">
            Share Booking Link
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <p className="text-sm text-slate-500">
            Share this link with guests so they can submit their booking details directly. 
            Entries will appear in your bookings as "Pending" until you confirm them.
          </p>
          
          <div className="flex gap-2">
            <Input
              value={bookingLink}
              readOnly
              className="rounded-xl bg-slate-50 text-sm"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="rounded-xl px-3"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={shareLink}
              className="flex-1 bg-[#008080] hover:bg-[#006666] rounded-xl gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Bookings submitted via this link will be marked as "Pending" 
              and won't count against availability until you confirm them.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
