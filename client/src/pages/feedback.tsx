import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Bug, Lightbulb, Star, Send } from "lucide-react";

export default function FeedbackPage() {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [priority, setPriority] = useState("medium");

  const feedbackTypes = [
    { value: "bug", label: "Bug Report", icon: Bug },
    { value: "feature", label: "Feature Request", icon: Star },
    { value: "improvement", label: "Improvement Suggestion", icon: Lightbulb },
    { value: "general", label: "General Feedback", icon: MessageSquare },
  ];

  const handleSubmit = () => {
    if (!feedbackType || !subject || !message) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Here you would send the feedback to your backend
    console.log({ feedbackType, subject, message, email, priority });
    
    toast({
      title: "Feedback submitted!",
      description: "Thank you for your feedback. We'll review it shortly.",
    });

    // Reset form
    setFeedbackType("");
    setSubject("");
    setMessage("");
    setEmail("");
    setPriority("medium");
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-3">Feedback Form</h1>
          <p className="text-muted-foreground">
            Help us improve Nudge by sharing your thoughts and suggestions
          </p>
        </div>

        <Card className="glass-card p-8">
          <div className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                What type of feedback is this? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setFeedbackType(type.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        feedbackType === type.value
                          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                          : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                      }`}
                      data-testid={`button-feedback-${type.value}`}
                    >
                      <Icon className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Subject <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Brief description of your feedback"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background/50 border-border"
                data-testid="input-feedback-subject"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Please provide detailed information about your feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background/50 border-border min-h-[150px]"
                data-testid="textarea-feedback-message"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Email (for follow-up)
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border"
                data-testid="input-feedback-email"
              />
            </div>

            {/* Priority Level */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Priority Level
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-background/50 border-border" data-testid="select-feedback-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - General feedback</SelectItem>
                  <SelectItem value="medium">Medium - Standard feedback</SelectItem>
                  <SelectItem value="high">High - Important issue</SelectItem>
                  <SelectItem value="critical">Critical - Blocking issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full gradient-primary text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
              size="lg"
              data-testid="button-submit-feedback"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
