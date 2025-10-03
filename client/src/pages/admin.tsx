import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TestTube2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface HelpCard {
  id: string;
  intentPhrases: string[];
  category: string;
  sponsored: {
    title: string;
    subtitle?: string;
    cta: string;
    href: string;
    brand: string;
  } | null;
  organic: {
    title: string;
    subtitle?: string;
    cta: string;
    href: string;
    source: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CardFormData {
  id: string;
  intentPhrases: string;
  category: string;
  sponsoredTitle: string;
  sponsoredSubtitle: string;
  sponsoredCta: string;
  sponsoredHref: string;
  sponsoredBrand: string;
  organicTitle: string;
  organicSubtitle: string;
  organicCta: string;
  organicHref: string;
  organicSource: string;
}

const categoryIcons: Record<string, string> = {
  shopping: "🛍️",
  food: "🍽️",
  jobs: "💼",
  saas: "💻",
  travel: "✈️",
  creator: "🎬"
};

export default function AdminPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<HelpCard | null>(null);
  const [testIntent, setTestIntent] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const { data: cardsData, isLoading } = useQuery<{ success: boolean; cards: HelpCard[] }>({
    queryKey: ["/api/cards"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest("DELETE", `/api/cards/${cardId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({ title: "Card deleted successfully" });
    },
  });

  const testMatchMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/match", {
        text,
        url: "http://test.com",
        ts: Date.now()
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
  });

  const handleDelete = (cardId: string) => {
    if (confirm("Are you sure you want to delete this help card?")) {
      deleteMutation.mutate(cardId);
    }
  };

  const handleEdit = (card: HelpCard) => {
    setEditingCard(card);
    setIsEditOpen(true);
  };

  const handleTest = () => {
    if (testIntent.trim()) {
      testMatchMutation.mutate(testIntent);
    }
  };

  const cards = cardsData?.cards || [];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage help cards and test matching</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-test-match">
                <TestTube2 className="h-4 w-4 mr-2" />
                Test Match
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Intent Matching</DialogTitle>
                <DialogDescription>
                  Enter text to test which help card would match
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="test-intent">Intent Text</Label>
                  <Textarea
                    id="test-intent"
                    placeholder="E.g., I need timberland boots for hiking"
                    value={testIntent}
                    onChange={(e) => setTestIntent(e.target.value)}
                    data-testid="input-test-intent"
                  />
                </div>
                <Button 
                  onClick={handleTest} 
                  disabled={testMatchMutation.isPending}
                  data-testid="button-run-test"
                >
                  {testMatchMutation.isPending ? "Testing..." : "Test Match"}
                </Button>

                {testResult && (
                  <div className="mt-4 p-4 border rounded-lg" data-testid="test-result">
                    {testResult.matched ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Match Found</Badge>
                          <span className="text-sm font-medium">Score: {testResult.score?.toFixed(2)}</span>
                        </div>
                        <p className="text-sm"><strong>Card ID:</strong> {testResult.cardId}</p>
                        {testResult.sponsored && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">SPONSORED</p>
                            <p className="text-sm">{testResult.sponsored.title}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">ORGANIC</p>
                          <p className="text-sm">{testResult.organic.title}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No match found</p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-card">
                <Plus className="h-4 w-4 mr-2" />
                Create Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardForm
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <div className="animate-pulse h-6 bg-muted rounded w-32" />
          </CardHeader>
        </Card>
      ) : (
        <Card data-testid="card-help-cards">
          <CardHeader>
            <CardTitle>Help Cards ({cards.length})</CardTitle>
            <CardDescription>All available help cards in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Intent Phrases</TableHead>
                  <TableHead>Sponsored</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id} data-testid={`row-card-${card.id}`}>
                    <TableCell className="font-mono text-sm">{card.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{categoryIcons[card.category]}</span>
                        <span className="capitalize">{card.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {card.intentPhrases.join(", ")}
                    </TableCell>
                    <TableCell>
                      {card.sponsored ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(card)}
                          data-testid={`button-edit-${card.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(card.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${card.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editingCard && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardForm
              card={editingCard}
              onClose={() => {
                setIsEditOpen(false);
                setEditingCard(null);
              }}
              onSuccess={() => {
                setIsEditOpen(false);
                setEditingCard(null);
                queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CardForm({ card, onClose, onSuccess }: { card?: HelpCard; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CardFormData>({
    id: card?.id || "",
    intentPhrases: card?.intentPhrases.join(", ") || "",
    category: card?.category || "shopping",
    sponsoredTitle: card?.sponsored?.title || "",
    sponsoredSubtitle: card?.sponsored?.subtitle || "",
    sponsoredCta: card?.sponsored?.cta || "",
    sponsoredHref: card?.sponsored?.href || "",
    sponsoredBrand: card?.sponsored?.brand || "",
    organicTitle: card?.organic.title || "",
    organicSubtitle: card?.organic.subtitle || "",
    organicCta: card?.organic.cta || "",
    organicHref: card?.organic.href || "",
    organicSource: card?.organic.source || "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CardFormData) => {
      const payload = {
        id: data.id.trim(),
        intentPhrases: data.intentPhrases.split(",").map(p => p.trim()).filter(Boolean),
        category: data.category,
        sponsored: data.sponsoredTitle ? {
          title: data.sponsoredTitle,
          subtitle: data.sponsoredSubtitle || undefined,
          cta: data.sponsoredCta,
          href: data.sponsoredHref,
          brand: data.sponsoredBrand,
        } : null,
        organic: {
          title: data.organicTitle,
          subtitle: data.organicSubtitle || undefined,
          cta: data.organicCta,
          href: data.organicHref,
          source: data.organicSource,
        },
      };

      if (card) {
        const res = await apiRequest("PUT", `/api/cards/${card.id}`, payload);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/cards", payload);
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({ title: card ? "Card updated successfully" : "Card created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save card", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{card ? "Edit Help Card" : "Create Help Card"}</DialogTitle>
        <DialogDescription>
          {card ? "Update the help card details" : "Add a new help card to the system"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="id">Card ID</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="e.g., timberland-boots"
              required
              disabled={!!card}
              data-testid="input-card-id"
            />
          </div>

          <div>
            <Label htmlFor="intentPhrases">Intent Phrases (comma-separated)</Label>
            <Textarea
              id="intentPhrases"
              value={formData.intentPhrases}
              onChange={(e) => setFormData({ ...formData, intentPhrases: e.target.value })}
              placeholder="e.g., timberland boots, hiking boots, work boots"
              required
              data-testid="input-intent-phrases"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                <SelectItem value="food">🍽️ Food</SelectItem>
                <SelectItem value="jobs">💼 Jobs</SelectItem>
                <SelectItem value="saas">💻 SaaS</SelectItem>
                <SelectItem value="travel">✈️ Travel</SelectItem>
                <SelectItem value="creator">🎬 Creator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Sponsored Content (Optional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sponsoredTitle">Title</Label>
              <Input
                id="sponsoredTitle"
                value={formData.sponsoredTitle}
                onChange={(e) => setFormData({ ...formData, sponsoredTitle: e.target.value })}
                placeholder="e.g., Kohl's - 20% Off"
                data-testid="input-sponsored-title"
              />
            </div>
            <div>
              <Label htmlFor="sponsoredBrand">Brand</Label>
              <Input
                id="sponsoredBrand"
                value={formData.sponsoredBrand}
                onChange={(e) => setFormData({ ...formData, sponsoredBrand: e.target.value })}
                placeholder="e.g., Kohl's"
                data-testid="input-sponsored-brand"
              />
            </div>
            <div>
              <Label htmlFor="sponsoredCta">CTA</Label>
              <Input
                id="sponsoredCta"
                value={formData.sponsoredCta}
                onChange={(e) => setFormData({ ...formData, sponsoredCta: e.target.value })}
                placeholder="e.g., Shop Now"
                data-testid="input-sponsored-cta"
              />
            </div>
            <div>
              <Label htmlFor="sponsoredHref">URL</Label>
              <Input
                id="sponsoredHref"
                type="url"
                value={formData.sponsoredHref}
                onChange={(e) => setFormData({ ...formData, sponsoredHref: e.target.value })}
                placeholder="https://..."
                data-testid="input-sponsored-href"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="sponsoredSubtitle">Subtitle (Optional)</Label>
              <Input
                id="sponsoredSubtitle"
                value={formData.sponsoredSubtitle}
                onChange={(e) => setFormData({ ...formData, sponsoredSubtitle: e.target.value })}
                placeholder="e.g., Exclusive coupon today only"
                data-testid="input-sponsored-subtitle"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Organic Content (Required)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organicTitle">Title</Label>
              <Input
                id="organicTitle"
                value={formData.organicTitle}
                onChange={(e) => setFormData({ ...formData, organicTitle: e.target.value })}
                placeholder="e.g., How to Clean Timberland Boots"
                required
                data-testid="input-organic-title"
              />
            </div>
            <div>
              <Label htmlFor="organicSource">Source</Label>
              <Input
                id="organicSource"
                value={formData.organicSource}
                onChange={(e) => setFormData({ ...formData, organicSource: e.target.value })}
                placeholder="e.g., Timberland"
                required
                data-testid="input-organic-source"
              />
            </div>
            <div>
              <Label htmlFor="organicCta">CTA</Label>
              <Input
                id="organicCta"
                value={formData.organicCta}
                onChange={(e) => setFormData({ ...formData, organicCta: e.target.value })}
                placeholder="e.g., Read Guide"
                required
                data-testid="input-organic-cta"
              />
            </div>
            <div>
              <Label htmlFor="organicHref">URL</Label>
              <Input
                id="organicHref"
                type="url"
                value={formData.organicHref}
                onChange={(e) => setFormData({ ...formData, organicHref: e.target.value })}
                placeholder="https://..."
                required
                data-testid="input-organic-href"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="organicSubtitle">Subtitle (Optional)</Label>
              <Input
                id="organicSubtitle"
                value={formData.organicSubtitle}
                onChange={(e) => setFormData({ ...formData, organicSubtitle: e.target.value })}
                placeholder="e.g., Step-by-step care guide"
                data-testid="input-organic-subtitle"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-card">
            {saveMutation.isPending ? "Saving..." : card ? "Update Card" : "Create Card"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
