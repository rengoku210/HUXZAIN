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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { submitReview } from "@/lib/marketplace/reviewService";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface ReviewModalProps {
  orderId: string;
  sellerId: string;
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ orderId, sellerId, listingId, isOpen, onClose }: ReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to leave a review.");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        orderId,
        sellerId,
        buyerId: user.id,
        listingId,
        rating,
        comment,
      });
      toast.success("Review submitted! Thank you for your feedback.");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-[#1A1A1A] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#D4AF37]">
            Leave a Review
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            How was your experience with this purchase?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="flex flex-col items-center space-y-2">
            <Label className="text-lg">Rating</Label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    className={`h-8 w-8 ${star <= rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-gray-600'}`} 
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Write your review here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-[#151515] border-[#333] min-h-[100px]"
              required
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
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
