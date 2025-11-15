import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Key } from "lucide-react";

interface SecondaryLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  requiredPin: string;
  requiredRegNumber: string;
  itemName: string;
}

export const SecondaryLoginDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  requiredPin,
  requiredRegNumber,
  itemName 
}: SecondaryLoginDialogProps) => {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [accessPin, setAccessPin] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registrationNumber === requiredRegNumber && accessPin === requiredPin) {
      onSuccess();
      onOpenChange(false);
      setRegistrationNumber("");
      setAccessPin("");
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid registration number or access PIN",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Access</DialogTitle>
          <DialogDescription>
            Enter the registration number and access PIN for "{itemName}" to manage it.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regNumber">Registration Number</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="regNumber"
                type="text"
                className="pl-10"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="Enter registration number"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessPin">Access PIN</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="accessPin"
                type="password"
                className="pl-10"
                value={accessPin}
                onChange={(e) => setAccessPin(e.target.value)}
                placeholder="Enter access PIN"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Verify Access
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
