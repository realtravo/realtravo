import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Smartphone, CreditCard, ExternalLink } from "lucide-react";

export type PaymentStatus = 'idle' | 'waiting' | 'processing' | 'success' | 'failed';

interface PaymentStatusDialogProps {
  open: boolean;
  status: PaymentStatus;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
  paymentMethod?: 'mpesa' | 'card';
}

export const PaymentStatusDialog = ({
  open,
  status,
  errorMessage,
  onClose,
  onRetry,
  paymentMethod = 'mpesa',
}: PaymentStatusDialogProps) => {
  const getContent = () => {
    switch (status) {
      case 'waiting':
        if (paymentMethod === 'card') {
          return {
            icon: <CreditCard className="h-16 w-16 text-primary animate-pulse" />,
            title: "Redirecting to Card Payment",
            message: "You are being redirected to Paystack's secure checkout page. Please complete your card payment in the new window.",
            showClose: true,
          };
        }
        return {
          icon: <Smartphone className="h-16 w-16 text-primary animate-pulse" />,
          title: "Check Your Phone",
          message: "An M-Pesa prompt has been sent to your phone. Please enter your PIN to complete the payment.",
          showClose: false,
        };
      case 'processing':
        if (paymentMethod === 'card') {
          return {
            icon: <ExternalLink className="h-16 w-16 text-primary animate-pulse" />,
            title: "Processing Card Payment",
            message: "Please complete your payment in the Paystack checkout window. This page will update automatically once confirmed.",
            showClose: true,
          };
        }
        return {
          icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
          title: "Processing Payment",
          message: "Please wait while we confirm your payment...",
          showClose: false,
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Payment Successful!",
          message: "Your booking has been confirmed. You will receive a confirmation email shortly.",
          showClose: true,
        };
      case 'failed':
        return {
          icon: <XCircle className="h-16 w-16 text-destructive" />,
          title: "Payment Failed",
          message: errorMessage || "The payment could not be completed. Please try again.",
          showClose: true,
          showRetry: true,
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={content.showClose ? onClose : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !content.showClose && e.preventDefault()}>
        <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
          {content.icon}
          <h2 className="text-xl font-bold">{content.title}</h2>
          <p className="text-muted-foreground">{content.message}</p>
          
          {content.showClose && (
            <div className="flex gap-3 mt-4">
              {content.showRetry && onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              <Button onClick={onClose}>
                {status === 'success' ? 'Done' : 'Close'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
