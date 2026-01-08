"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquare, User, Users } from "lucide-react"

interface PhaseInfoDialogProps {
  open: boolean
  onOpenChange: (open?: boolean) => void
  phase: string
}

export function PhaseInfoDialog({ open, onOpenChange, phase }: PhaseInfoDialogProps) {
  const isExplanation = phase === "explanation-intro"
  const isDiscussion = phase === "discussion-intro"
  const isTurn = phase === "your-turn"

  if (!isExplanation && !isDiscussion && !isTurn) return null

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
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                isExplanation ? "bg-chart-1/10" : isDiscussion ? "bg-chart-2/10" : "bg-chart-3/10"
              }`}
            >
              {isExplanation ? (
                <MessageSquare className="h-5 w-5 text-chart-1" />
              ) : isDiscussion ? (
                <Users className="h-5 w-5 text-chart-2" />
              ) : (
                <User className="h-5 w-5 text-chart-3" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isExplanation ? "Explanation Session" : isDiscussion ? "Discussion Session" : "Your Turn"}
              </DialogTitle>
              <DialogDescription>
                {isExplanation
                  ? "Round 1 begins"
                  : isDiscussion
                    ? "Continue the investigation"
                    : "You can speak now"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isExplanation ? (
            <>
              <p className="text-sm text-muted-foreground">
                In this session, you and the AI players will each provide <strong>one sentence</strong> explaining the
                given keyword.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium">Your task:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Share your understanding of the topic</li>
                  <li>Listen carefully to other players</li>
                  <li>Try to identify who might be the liar</li>
                </ul>
              </div>
            </>
          ) : isDiscussion ? (
            <>
              <p className="text-sm text-muted-foreground">
                Discussion starts now. Share who you think the Liar is and why, and exchange opinions with others.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium">This is 1 turn.</h4>
                <p className="text-sm text-muted-foreground">
                  Briefly explain your suspicion and respond to other players' viewpoints.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                It's your turn to speak. Write your message and send it when you're ready.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium">Tip:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Keep your response concise and relevant</li>
                  <li>Try to read the room before sending</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onOpenChange}>
            {isExplanation ? "Start Explanation" : isDiscussion ? "Start Discussion" : "I'm Ready"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
