import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PlayCircle, PauseCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  category: string;
  budget: number;
  spent: number;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
}

const DEMO_ADVERTISER_ID = "demo-advertiser-123";

const categoryIcons: Record<string, string> = {
  shopping: "🛍️",
  food: "🍽️",
  jobs: "💼",
  saas: "💻",
  travel: "✈️",
  creator: "🎬"
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  active: "bg-green-500",
  paused: "bg-yellow-500",
  completed: "bg-blue-500"
};

export default function CampaignsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [category, setCategory] = useState("shopping");
  const [budget, setBudget] = useState("");

  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; campaigns: Campaign[] }>({
    queryKey: ["/api/campaigns/advertiser", DEMO_ADVERTISER_ID],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; budget: number }) => {
      const res = await apiRequest("POST", "/api/campaigns", {
        advertiserId: DEMO_ADVERTISER_ID,
        name: data.name,
        category: data.category,
        budget: data.budget,
        spent: 0,
        status: "draft"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/advertiser", DEMO_ADVERTISER_ID] });
      toast({ title: "Campaign created successfully" });
      setIsCreateOpen(false);
      setCampaignName("");
      setBudget("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create campaign",
        variant: "destructive"
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/campaigns/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/advertiser", DEMO_ADVERTISER_ID] });
      toast({ title: "Campaign status updated" });
    },
  });

  const handleCreate = () => {
    const budgetCents = Math.round(parseFloat(budget) * 100);
    if (campaignName && budgetCents >= 100) {
      createMutation.mutate({
        name: campaignName,
        category,
        budget: budgetCents
      });
    }
  };

  const campaigns = campaignsData?.campaigns || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Loading campaigns...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-campaigns-title">My Campaigns</h1>
          <p className="text-muted-foreground mt-2">Manage your advertising campaigns</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new advertising campaign to promote your help cards
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  data-testid="input-campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
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
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input
                  id="budget"
                  data-testid="input-budget"
                  type="number"
                  step="0.01"
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="100.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !campaignName || !budget}
                data-testid="button-save-campaign"
              >
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No campaigns yet. Create your first campaign to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-campaigns-list">
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>View and manage your advertising campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <span className="text-2xl mr-2">{categoryIcons[campaign.category]}</span>
                      <span className="capitalize">{campaign.category}</span>
                    </TableCell>
                    <TableCell>${(campaign.budget / 100).toFixed(2)}</TableCell>
                    <TableCell>${(campaign.spent / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[campaign.status]} data-testid={`status-${campaign.id}`}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {campaign.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "active" })}
                            data-testid={`button-activate-${campaign.id}`}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "paused" })}
                            data-testid={`button-pause-${campaign.id}`}
                          >
                            <PauseCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === "paused" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "active" })}
                            data-testid={`button-resume-${campaign.id}`}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
