"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquareText } from "lucide-react"

interface PostVoteInterviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  midCheckSuspect?: string | null
  finalVoteTarget?: string | null
  onSubmit: (reason: string, sameChoice: boolean | null) => Promise<void> | void
}

export function PostVoteInterviewDialog({
  open,
  onOpenChange,
  midCheckSuspect,
  finalVoteTarget,
  onSubmit,
}: PostVoteInterviewDialogProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const sameChoice = useMemo(() => {
    if (!midCheckSuspect || !finalVoteTarget) return null
    return midCheckSuspect === finalVoteTarget
  }, [midCheckSuspect, finalVoteTarget])

  const prompt = sameChoice === null
    ? "Tell us why you chose your final suspect."
    : sameChoice
      ? "You chose the same suspect as mid-check. Why did you keep the same choice?"
      : "You chose a different suspect from mid-check. Why did you change your choice?"

  const handleSubmit = async () => {
    const trimmed = reason.trim()
    if (!trimmed) return
    try {
      setSubmitting(true)
      await onSubmit(trimmed, sameChoice)
      onOpenChange(false)
      setReason("")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <DialogTitle>Quick Interview</DialogTitle>
              <DialogDescription>One short answer before results</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-xs text-muted-foreground">
            Mid-check: {midCheckSuspect ?? "-"} · Final vote: {finalVoteTarget ?? "-"}
          </div>
          <Label className="text-sm font-medium">{prompt}</Label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Type your reason here..."
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!reason.trim() || submitting}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
