import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { submitReport, ReportReason, ReportTargetType } from "@/lib/marketplace/reportService";
import { toast } from "sonner";

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, isOpen, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("spam");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to report.");
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        reporterId: user.id,
        targetType,
        targetId,
        reason,
        note,
        screenshotFile: file ?? undefined,
      });
      toast.success("Report submitted successfully.");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-[#1A1A1A] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#D4AF37]">
            Report {targetType === 'listing' ? 'Listing' : 'Seller'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please provide details about the issue. Our staff will review it shortly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-[#151515] border-[#333] text-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-[#151515] border-[#333] text-white">
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="fraud">Fraud / Scam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="note">Details</Label>
            <Textarea
              id="note"
              placeholder="Tell us more about the issue..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-[#151515] border-[#333] min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Evidence (optional)</Label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="bg-[#151515] border-[#333] cursor-pointer"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-[#333] hover:bg-[#1A1A1A]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="bg-[#D4AF37] text-black hover:bg-[#B8962E]"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
