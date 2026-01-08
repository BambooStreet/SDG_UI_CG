"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Vote } from "lucide-react"

interface AIPlayer {
  id: string
  name: string
}

interface FinalVoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMinimize?: () => void
  aiPlayers: AIPlayer[]
  onSubmit: (targetName: string, confidence: number) => Promise<void> | void
}

export function FinalVoteDialog({ open, onOpenChange, onMinimize, aiPlayers, onSubmit }: FinalVoteDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [confidence, setConfidence] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedPlayer || !confidence) return
    try {
      setSubmitting(true)
      await onSubmit(selectedPlayer, Number.parseInt(confidence))
      onOpenChange(false)
      setSelectedPlayer("")
      setConfidence("")
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = selectedPlayer && confidence

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
            <div className="h-10 w-10 rounded-full bg-chart-1/10 flex items-center justify-center">
              <Vote className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <DialogTitle>Final Vote</DialogTitle>
              <DialogDescription>Discussion session complete</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Player Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Who is the liar?</Label>
            <RadioGroup value={selectedPlayer} onValueChange={setSelectedPlayer}>
              {aiPlayers.map((player) => (
                <div key={player.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={player.id} id={`final-${player.id}`} />
                  <Label htmlFor={`final-${player.id}`} className="font-normal cursor-pointer">
                    {player.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Confidence Scale */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How confident are you?</Label>
            <RadioGroup value={confidence} onValueChange={setConfidence}>
              <div className="grid grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                  <div key={score} className="flex flex-col items-center gap-1">
                    <RadioGroupItem value={score.toString()} id={`final-conf-${score}`} />
                    <Label htmlFor={`final-conf-${score}`} className="text-xs cursor-pointer text-muted-foreground">
                      {score}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Not confident</span>
                <span>Very confident</span>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => onMinimize?.()} disabled={submitting}>
            Minimize
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            Submit Final Vote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
