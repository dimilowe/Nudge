import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, ExternalLink, Zap, Clock, MousePointer, ArrowDown, BarChart3, Eye, TrendingUp } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { NudgePageFormData, OfferFormData } from '@shared/schema';
import { nudgePageFormSchema, offerFormSchema, automationFormSchema } from '@shared/schema';
import type { z } from 'zod';
import useEmblaCarousel from 'embla-carousel-react';

const NONE_VALUE = '__none__'; // Sentinel for optional offerId

export default function PageBuilderPage() {
  const { toast } = useToast();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [showNewOfferForm, setShowNewOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
  const [showRoutingRuleDialog, setShowRoutingRuleDialog] = useState(false);
  const [editingRoutingRule, setEditingRoutingRule] = useState<any | null>(null);
  
  // Content editor state
  const [contentHeadline, setContentHeadline] = useState('Your Amazing Headline');
  const [contentSubheadline, setContentSubheadline] = useState('Supporting text that explains your offer');
  const [contentCtaText, setContentCtaText] = useState('Get Started');
  const [contentCtaHref, setContentCtaHref] = useState('');
  const [contentBgStyle, setContentBgStyle] = useState('gradient');
  const [heroImage, setHeroImage] = useState<string | undefined>(undefined);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  
  // Offer image state
  const [offerImage, setOfferImage] = useState<string | undefined>(undefined);

  // Fetch demo data (creator + page)
  const { data: demoData } = useQuery({
    queryKey: ['/api/demo'],
    queryFn: async () => {
      const res = await fetch('/api/demo');
      return res.json();
    },
  });

  const creator = demoData?.creator;

  // Fetch pages
  const { data: pagesData } = useQuery({
    queryKey: ['/api/pages', creator?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pages?creatorId=${creator.id}`);
      return res.json();
    },
    enabled: !!creator?.id,
  });

  const pages = pagesData?.pages || [];
  const selectedPage = pages.find((p: any) => p.id === selectedPageId);

  // Fetch offers for selected page (including hidden offers for admin)
  const { data: offersData } = useQuery({
    queryKey: ['/api/offers', selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return { offers: [] };
      const res = await fetch(`/api/offers?pageId=${selectedPageId}&includeHidden=true`);
      return res.json();
    },
    enabled: !!selectedPageId,
  });

  const offers = offersData?.offers || [];

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async (data: NudgePageFormData & { creatorId: string }) => {
      return await apiRequest('POST', '/api/pages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages', creator?.id] });
      setShowNewPageForm(false);
      toast({ title: 'Page created successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to create page', variant: 'destructive' });
    },
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: OfferFormData) => {
      return await apiRequest('POST', '/api/offers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', selectedPageId] });
      setShowNewOfferForm(false);
      setOfferImage(undefined);
      toast({ title: 'Offer created successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to create offer', variant: 'destructive' });
    },
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OfferFormData> }) => {
      return await apiRequest('PUT', `/api/offers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', selectedPageId] });
      setEditingOffer(null);
      setOfferImage(undefined);
      toast({ title: 'Offer updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to update offer', variant: 'destructive' });
    },
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      return await apiRequest('DELETE', `/api/offers/${offerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers', selectedPageId] });
      toast({ title: 'Offer deleted successfully!' });
    },
  });

  // Fetch automations for selected page
  const { data: automationsData } = useQuery({
    queryKey: ['/api/automations', selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return { automations: [] };
      const res = await fetch(`/api/automations?pageId=${selectedPageId}`);
      return res.json();
    },
    enabled: !!selectedPageId,
  });

  const automations = automationsData?.automations || [];

  // Fetch offer analytics for selected page
  const { data: offerAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/offers', selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return null;
      const res = await fetch(`/api/analytics/offers/${selectedPageId}`);
      return res.json();
    },
    enabled: !!selectedPageId,
  });

  // Create automation mutation
  const createAutomationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/automations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations', selectedPageId] });
      toast({ title: 'Automation created successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to create automation', variant: 'destructive' });
    },
  });

  // Update automation mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/automations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations', selectedPageId] });
      toast({ title: 'Automation updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to update automation', variant: 'destructive' });
    },
  });

  // Delete automation mutation
  const deleteAutomationMutation = useMutation({
    mutationFn: async (automationId: string) => {
      return await apiRequest('DELETE', `/api/automations/${automationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations', selectedPageId] });
      toast({ title: 'Automation deleted successfully!' });
    },
  });

  // Fetch routing rules for selected page
  const { data: routingRulesData } = useQuery({
    queryKey: ['/api/routing-rules', selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return { rules: [] };
      const res = await fetch(`/api/routing-rules?pageId=${selectedPageId}`);
      return res.json();
    },
    enabled: !!selectedPageId,
  });

  const routingRules = routingRulesData?.rules || [];

  // Create routing rule mutation
  const createRoutingRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/routing-rules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routing-rules', selectedPageId] });
      setShowRoutingRuleDialog(false);
      setEditingRoutingRule(null);
      toast({ title: 'Routing rule created successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to create routing rule', variant: 'destructive' });
    },
  });

  // Update routing rule mutation
  const updateRoutingRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/routing-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routing-rules', selectedPageId] });
      setShowRoutingRuleDialog(false);
      setEditingRoutingRule(null);
      toast({ title: 'Routing rule updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to update routing rule', variant: 'destructive' });
    },
  });

  // Delete routing rule mutation
  const deleteRoutingRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return await apiRequest('DELETE', `/api/routing-rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routing-rules', selectedPageId] });
      toast({ title: 'Routing rule deleted successfully!' });
    },
  });
  
  // Update page content mutation
  const updateContentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/pages/${selectedPageId}/content`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages', creator?.id] });
      toast({ title: 'Content saved successfully!' });
    },
    onError: () => {
      toast({ title: 'Failed to save content', variant: 'destructive' });
    },
  });

  // New page form
  const pageForm = useForm<NudgePageFormData & { creatorId: string }>({
    resolver: zodResolver(nudgePageFormSchema.extend({ creatorId: nudgePageFormSchema.shape.creatorId })),
    defaultValues: {
      creatorId: '',
      title: '',
      description: '',
      slug: '',
    },
  });

  // Set creatorId when creator loads
  useEffect(() => {
    if (creator?.id) {
      pageForm.setValue('creatorId', creator.id, { 
        shouldDirty: true, 
        shouldValidate: true 
      });
    }
  }, [creator?.id, pageForm]);
  
  // Load content when page is selected
  useEffect(() => {
    if (selectedPage) {
      const content = selectedPage.content as any;
      const heroSection = content?.sections?.[0];
      
      if (heroSection && heroSection.type === 'hero') {
        setContentHeadline(heroSection.headline || 'Your Amazing Headline');
        setContentSubheadline(heroSection.subheadline || 'Supporting text that explains your offer');
        setContentCtaText(heroSection.ctaText || 'Get Started');
        setContentCtaHref(heroSection.ctaHref || '');
        setContentBgStyle(heroSection.backgroundColor || 'gradient');
        setHeroImage(heroSection.heroImage);
        setBackgroundImage(heroSection.backgroundImage);
      } else {
        // Reset to defaults for new pages
        setContentHeadline('Your Amazing Headline');
        setContentSubheadline('Supporting text that explains your offer');
        setContentCtaText('Get Started');
        setContentCtaHref('');
        setContentBgStyle('gradient');
        setHeroImage(undefined);
        setBackgroundImage(undefined);
      }
    }
  }, [selectedPage]);

  // New offer form
  const offerForm = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      pageId: selectedPageId || '',
      type: 'digital_product',
      title: '',
      description: '',
      cta: '',
      href: '',
      imageUrl: '',
      funnelStage: 'core',
    },
  });

  const onCreatePage = (data: NudgePageFormData & { creatorId: string }) => {
    if (!creator?.id) {
      toast({ title: 'Error: Creator not loaded', variant: 'destructive' });
      return;
    }
    createPageMutation.mutate({ ...data, creatorId: creator.id });
  };

  const onCreateOffer = (data: OfferFormData) => {
    createOfferMutation.mutate({ ...data, pageId: selectedPageId!, imageUrl: offerImage });
  };

  const onUpdateOffer = (data: OfferFormData) => {
    if (!editingOffer) return;
    updateOfferMutation.mutate({ 
      id: editingOffer.id, 
      data: { ...data, imageUrl: offerImage } 
    });
  };

  const handleEditOffer = (offer: any) => {
    setEditingOffer(offer);
    setOfferImage(offer.imageUrl);
    offerForm.reset({
      pageId: offer.pageId,
      type: offer.type,
      title: offer.title,
      description: offer.description || '',
      cta: offer.cta,
      href: offer.href,
      imageUrl: offer.imageUrl || '',
      price: offer.price || undefined,
      funnelStage: offer.funnelStage,
      displayOrder: offer.displayOrder || 0,
      isActive: offer.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingOffer(null);
    setOfferImage(undefined);
    offerForm.reset({
      pageId: selectedPageId || '',
      type: 'digital_product',
      title: '',
      description: '',
      cta: '',
      href: '',
      imageUrl: '',
      price: undefined,
      funnelStage: 'entry',
      displayOrder: 0,
      isActive: true,
    });
  };

  // Automation form
  type AutomationFormData = z.infer<typeof automationFormSchema>;
  const automationForm = useForm<AutomationFormData>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: {
      pageId: selectedPageId || '',
      name: '',
      triggerType: 'scroll_depth',
      offerId: undefined,
      overlayTemplate: 'popup',
      triggerConfig: {
        scrollPercent: 50,
      },
    },
  });

  // Watch trigger type to show/hide conditional inputs
  const triggerType = automationForm.watch('triggerType');

  // Reset triggerConfig defaults when trigger type changes
  useEffect(() => {
    if (!showAutomationDialog) return; // Only reset when dialog is open

    const currentConfig = automationForm.getValues('triggerConfig');
    let newConfig = { ...currentConfig };

    switch (triggerType) {
      case 'scroll_depth':
        if (!newConfig.scrollPercent) {
          newConfig = { scrollPercent: 50 };
        }
        break;
      case 'time_on_page':
        if (!newConfig.seconds) {
          newConfig = { seconds: 30 };
        }
        break;
      case 'user_hesitation':
        if (!newConfig.hesitationSeconds) {
          newConfig = { hesitationSeconds: 3 };
        }
        break;
      case 'bottom_proximity':
        if (!newConfig.scrollPercent) {
          newConfig = { scrollPercent: 80 };
        }
        break;
    }

    automationForm.setValue('triggerConfig', newConfig);
  }, [triggerType, showAutomationDialog, automationForm]);

  // Open automation dialog for creating or editing
  const openAutomationDialog = (automation?: any) => {
    if (automation) {
      setEditingAutomation(automation);
      
      // Merge stored config with trigger type defaults to ensure required fields exist
      const existingConfig = automation.triggerConfig || {};
      let mergedConfig = { ...existingConfig };
      
      switch (automation.triggerType) {
        case 'scroll_depth':
          mergedConfig = { scrollPercent: 50, ...existingConfig };
          break;
        case 'time_on_page':
          mergedConfig = { seconds: 30, ...existingConfig };
          break;
        case 'user_hesitation':
          mergedConfig = { hesitationSeconds: 3, ...existingConfig };
          break;
        case 'bottom_proximity':
          mergedConfig = { scrollPercent: 80, ...existingConfig };
          break;
      }
      
      automationForm.reset({
        pageId: automation.pageId,
        name: automation.name,
        triggerType: automation.triggerType,
        offerId: automation.offerId || undefined,
        overlayTemplate: automation.overlayTemplate || 'popup',
        triggerConfig: mergedConfig,
      });
    } else {
      setEditingAutomation(null);
      automationForm.reset({
        pageId: selectedPageId || '',
        name: '',
        triggerType: 'scroll_depth',
        offerId: undefined,
        overlayTemplate: 'popup',
        triggerConfig: {
          scrollPercent: 50,
        },
      });
    }
    setShowAutomationDialog(true);
  };

  const onSubmitAutomation = (data: AutomationFormData) => {
    if (editingAutomation) {
      updateAutomationMutation.mutate({ id: editingAutomation.id, data });
    } else {
      createAutomationMutation.mutate({ ...data, pageId: selectedPageId! });
    }
    setShowAutomationDialog(false);
    setEditingAutomation(null);
  };
  
  const handleSaveContent = () => {
    if (!selectedPageId) {
      toast({ title: 'No page selected', variant: 'destructive' });
      return;
    }
    
    const contentData = {
      content: {
        version: 1,
        sections: [
          {
            type: 'hero' as const,
            headline: contentHeadline,
            subheadline: contentSubheadline,
            ctaText: contentCtaText,
            ctaHref: contentCtaHref,
            backgroundColor: contentBgStyle,
            heroImage: heroImage,
            backgroundImage: backgroundImage,
          }
        ]
      }
    };
    
    updateContentMutation.mutate(contentData);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-page-builder">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3 text-gradient" data-testid="text-page-title">Page Builder</h1>
        <p className="text-lg text-muted-foreground" data-testid="text-page-description">
          Create and manage your Nudge pages and offers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pages List */}
        <Card className="glass-card p-6 lg:col-span-1 hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gradient">Your Pages</h3>
            <Button 
              className="gradient-primary text-white shadow-lg shadow-purple-500/30"
              size="sm" 
              onClick={() => setShowNewPageForm(!showNewPageForm)}
              data-testid="button-new-page"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>

          {showNewPageForm && (
            <Card className="p-4 mb-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200/50">
              <h4 className="font-bold mb-4 text-gradient">Create New Page</h4>
              <Form {...pageForm}>
                <form onSubmit={pageForm.handleSubmit(onCreatePage)} className="space-y-3">
                  <FormField
                    control={pageForm.control}
                    name="creatorId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pageForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-page-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pageForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="my-page" data-testid="input-page-slug" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={!creator?.id || createPageMutation.isPending}
                      className="gradient-primary text-white"
                      data-testid="button-create-page"
                    >
                      {createPageMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewPageForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          )}

          <div className="space-y-3">
            {pages.map((page: any) => (
              <div
                key={page.id}
                className={`relative group rounded-xl transition-all ${
                  selectedPageId === page.id
                    ? 'gradient-primary text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 hover:shadow-md'
                }`}
              >
                <button
                  onClick={() => setSelectedPageId(page.id)}
                  className="w-full text-left p-4 font-medium"
                  data-testid={`button-page-${page.slug}`}
                >
                  <div className="font-bold">{page.title}</div>
                  <div className="text-sm mt-1 opacity-90">/{page.slug}</div>
                </button>
                <a
                  href={`/n/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-3 right-3 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                    selectedPageId === page.id
                      ? 'hover:bg-white/20'
                      : 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
                  }`}
                  title="View live page"
                  data-testid={`link-view-live-${page.slug}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
            {pages.length === 0 && !showNewPageForm && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pages yet. Create your first one!
              </p>
            )}
          </div>
        </Card>

        {/* Page Editor */}
        <Card className="glass-card p-6 lg:col-span-2 hover:shadow-2xl transition-shadow">
          {selectedPage ? (
            <Tabs defaultValue="content" className="w-full">
              <TabsList>
                <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                <TabsTrigger value="offers" data-testid="tab-offers">Offers</TabsTrigger>
                <TabsTrigger value="rules" data-testid="tab-rules">Routing Rules</TabsTrigger>
                <TabsTrigger value="automations" data-testid="tab-automations">Automations</TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gradient mb-2">Landing Page Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Design your page's hero section that visitors will see first
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Content Editor */}
                    <Card className="p-5 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 border-purple-200/50">
                      <h4 className="font-bold mb-4 text-gradient">Edit Content</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Headline</label>
                          <Input 
                            value={contentHeadline}
                            onChange={(e) => setContentHeadline(e.target.value)}
                            placeholder="Your Amazing Headline" 
                            className="mt-1.5"
                            data-testid="input-content-headline"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Subheadline</label>
                          <Input 
                            value={contentSubheadline}
                            onChange={(e) => setContentSubheadline(e.target.value)}
                            placeholder="Supporting text that explains your offer" 
                            className="mt-1.5"
                            data-testid="input-content-subheadline"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">CTA Button Text</label>
                          <Input 
                            value={contentCtaText}
                            onChange={(e) => setContentCtaText(e.target.value)}
                            placeholder="Get Started" 
                            className="mt-1.5"
                            data-testid="input-content-cta-text"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">CTA Button Link</label>
                          <Input 
                            value={contentCtaHref}
                            onChange={(e) => setContentCtaHref(e.target.value)}
                            placeholder="https://..." 
                            className="mt-1.5"
                            data-testid="input-content-cta-href"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Background Style</label>
                          <Select value={contentBgStyle} onValueChange={setContentBgStyle}>
                            <SelectTrigger className="mt-1.5" data-testid="select-background-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gradient">Purple/Blue Gradient</SelectItem>
                              <SelectItem value="solid">Solid Color</SelectItem>
                              <SelectItem value="image">Background Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Hero Image Upload */}
                        <ImageUpload
                          label="Hero Image"
                          value={heroImage}
                          onChange={setHeroImage}
                          aspectRatio="aspect-square"
                        />
                        
                        {/* Background Image Upload - Only shown when image style is selected */}
                        {contentBgStyle === 'image' && (
                          <ImageUpload
                            label="Background Image"
                            value={backgroundImage}
                            onChange={setBackgroundImage}
                            aspectRatio="aspect-video"
                          />
                        )}
                        
                        <Button 
                          onClick={handleSaveContent}
                          disabled={updateContentMutation.isPending}
                          className="w-full gradient-primary text-white" 
                          data-testid="button-save-content"
                        >
                          {updateContentMutation.isPending ? 'Saving...' : 'Save Content'}
                        </Button>
                      </div>
                    </Card>

                    {/* Live Preview - Link-in-bio Style */}
                    <Card 
                      className="p-0 text-white relative overflow-hidden border-purple-500"
                      style={
                        contentBgStyle === 'image' && backgroundImage && backgroundImage.trim()
                          ? {
                              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : undefined
                      }
                    >
                      <div 
                        className={`relative z-10 p-8 flex flex-col items-center text-center min-h-[500px] ${
                          contentBgStyle === 'solid'
                            ? 'bg-slate-900'
                            : contentBgStyle === 'gradient'
                            ? 'bg-gradient-to-br from-purple-600 to-blue-600'
                            : contentBgStyle === 'image' && backgroundImage && backgroundImage.trim()
                            ? ''
                            : 'bg-gradient-to-br from-purple-600 to-blue-600'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-6 opacity-75 uppercase tracking-wider">LIVE PREVIEW</div>
                        
                        {/* Hero Image Card */}
                        <div className="w-full max-w-md mb-8">
                          <div className="bg-white rounded-3xl p-8 shadow-2xl">
                            {heroImage ? (
                              <img 
                                src={heroImage} 
                                alt="Hero" 
                                className="aspect-square w-full rounded-2xl object-cover"
                              />
                            ) : (
                              <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                                <div className="text-6xl">📸</div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Hero Text */}
                        <div className="mb-8 w-full max-w-md">
                          <h1 className="text-5xl font-black mb-3 tracking-tight">{contentHeadline}</h1>
                          <p className="text-lg opacity-90 font-light">{contentSubheadline}</p>
                        </div>
                        
                        {/* Top 10 Link Slots Preview */}
                        {offers.length > 0 && (
                          <>
                            <div className="w-full max-w-md mb-8">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                                <span className="text-xs font-semibold px-3 opacity-75">
                                  🎯 Smart Picks For You
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                              </div>
                              
                              <div className="space-y-2">
                                {offers
                                  .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                  .filter((offer: any) => offer.isActive)
                                  .slice(0, 10)
                                  .map((offer: any, index: number) => (
                                    <div
                                      key={offer.id}
                                      className={`w-full bg-white/10 backdrop-blur-sm p-4 rounded-2xl border transition-all ${
                                        index === 0 
                                          ? 'border-yellow-400/50 bg-white/15' 
                                          : 'border-white/10'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1 text-left">
                                          <div className="font-bold text-sm flex items-center gap-2">
                                            {index === 0 && <span className="text-yellow-400">⭐</span>}
                                            {offer.title}
                                          </div>
                                          {offer.description && (
                                            <div className="text-xs opacity-75 mt-1 line-clamp-1">{offer.description}</div>
                                          )}
                                        </div>
                                        <div className="ml-3 text-lg opacity-60">→</div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Offers Carousel Preview */}
                            <div className="w-full max-w-md">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                                <span className="text-xs font-semibold px-3 opacity-75">
                                  Explore All →
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                              </div>
                              <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                                {offers
                                  .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                  .filter((offer: any) => offer.isActive)
                                  .map((offer: any) => (
                                    <div 
                                      key={offer.id}
                                      className="flex-[0_0_75%] snap-start"
                                    >
                                      <div className="bg-white/10 backdrop-blur-sm p-5 rounded-3xl border border-white/20 shadow-xl">
                                        <div className="text-left">
                                          <div className="font-bold text-lg mb-2">{offer.title}</div>
                                          {offer.description && (
                                            <div className="text-sm opacity-75 mb-3 line-clamp-2">{offer.description}</div>
                                          )}
                                          <div className="flex items-center justify-between">
                                            <Badge className="bg-white/20 text-white text-xs border-white/30">
                                              {offer.type.replace('_', ' ')}
                                            </Badge>
                                            <div className="text-xl opacity-75">
                                              →
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                              <p className="text-xs opacity-60 text-center mt-2">← Swipe to see more →</p>
                            </div>
                          </>
                        )}
                        
                        {offers.length === 0 && (
                          <div className="w-full max-w-md">
                            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-dashed border-white/20">
                              <p className="text-sm opacity-60">
                                No links yet. Add offers in the Offers tab to see them here.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg border border-purple-200/50">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      💡
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pro Tip: Test your headline with different traffic sources</p>
                      <p className="text-xs text-muted-foreground">Different visitors from TikTok vs YouTube may respond to different messaging</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="offers" className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Offers</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNewOfferForm(!showNewOfferForm)}
                    data-testid="button-new-offer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Offer
                  </Button>
                </div>

                {showNewOfferForm && (
                  <Card className="p-4 mb-4 bg-muted">
                    <h4 className="font-semibold mb-3">Create New Offer</h4>
                    <Form {...offerForm}>
                      <form onSubmit={offerForm.handleSubmit(onCreateOffer)} className="space-y-3">
                        <FormField
                          control={offerForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-offer-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="freebie">Freebie</SelectItem>
                                  <SelectItem value="digital_product">Digital Product</SelectItem>
                                  <SelectItem value="coaching">Coaching</SelectItem>
                                  <SelectItem value="bundle">Bundle</SelectItem>
                                  <SelectItem value="affiliate">Affiliate</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-offer-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="cta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Call to Action</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Get it now" data-testid="input-offer-cta" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="href"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link</FormLabel>
                              <FormControl>
                                <Input {...field} type="url" data-testid="input-offer-href" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Offer Image Upload */}
                        <ImageUpload
                          label="Offer Image (Optional)"
                          value={offerImage}
                          onChange={setOfferImage}
                          aspectRatio="aspect-square"
                        />
                        
                        <FormField
                          control={offerForm.control}
                          name="funnelStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Funnel Stage</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-funnel-stage">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="lead_capture">Lead Capture</SelectItem>
                                  <SelectItem value="entry">Entry</SelectItem>
                                  <SelectItem value="core">Core</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="upsell">Upsell</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="isHidden"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-offer-hidden"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Hidden Offer
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Hide from landing page (only show via behavioral triggers or routing rules)
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" data-testid="button-create-offer">
                            Create Offer
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowNewOfferForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </Card>
                )}

                {/* Edit Offer Form */}
                {editingOffer && (
                  <Card className="p-4 mb-4 bg-muted border-primary">
                    <h4 className="font-semibold mb-3">Edit Offer</h4>
                    <Form {...offerForm}>
                      <form onSubmit={offerForm.handleSubmit(onUpdateOffer)} className="space-y-3">
                        <FormField
                          control={offerForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-offer-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="freebie">Freebie</SelectItem>
                                  <SelectItem value="digital_product">Digital Product</SelectItem>
                                  <SelectItem value="coaching">Coaching</SelectItem>
                                  <SelectItem value="bundle">Bundle</SelectItem>
                                  <SelectItem value="affiliate">Affiliate</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-offer-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="cta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Call to Action</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Get it now" data-testid="input-edit-offer-cta" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="href"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link</FormLabel>
                              <FormControl>
                                <Input {...field} type="url" data-testid="input-edit-offer-href" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Offer Image Upload */}
                        <ImageUpload
                          label="Offer Image (Optional)"
                          value={offerImage}
                          onChange={setOfferImage}
                          aspectRatio="aspect-square"
                        />
                        
                        <FormField
                          control={offerForm.control}
                          name="funnelStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Funnel Stage</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-funnel-stage">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="lead_capture">Lead Capture</SelectItem>
                                  <SelectItem value="entry">Entry</SelectItem>
                                  <SelectItem value="core">Core</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="upsell">Upsell</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={offerForm.control}
                          name="isHidden"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-edit-offer-hidden"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Hidden Offer
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Hide from landing page (only show via behavioral triggers or routing rules)
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" data-testid="button-update-offer">
                            Update Offer
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </Card>
                )}

                <div className="space-y-3">
                  {offers.map((offer: any, index: number) => (
                    <Card key={offer.id} className="p-4" data-testid={`card-offer-${index}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                          {/* Offer Image Thumbnail */}
                          {offer.imageUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={offer.imageUrl} 
                                alt={offer.title}
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold" data-testid={`text-offer-title-${index}`}>
                                {offer.title}
                              </h4>
                              <Badge variant="outline">{offer.type}</Badge>
                              <Badge variant="secondary">{offer.funnelStage}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{offer.cta}</p>
                            <a 
                              href={offer.href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {offer.href}
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOffer(offer)}
                            data-testid={`button-edit-offer-${index}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOfferMutation.mutate(offer.id)}
                            data-testid={`button-delete-offer-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {offers.length === 0 && !showNewOfferForm && (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No offers yet. Create your first one to start converting visitors!
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">Smart Routing Rules</h3>
                    <p className="text-sm text-muted-foreground">
                      Show different offers based on traffic source, device, and behavior
                    </p>
                  </div>
                  <Dialog open={showRoutingRuleDialog} onOpenChange={setShowRoutingRuleDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingRoutingRule(null);
                        setShowRoutingRuleDialog(true);
                      }} data-testid="button-create-routing-rule">
                        <Plus className="h-4 w-4 mr-2" />
                        New Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRoutingRule ? 'Edit Routing Rule' : 'Create Routing Rule'}
                        </DialogTitle>
                        <DialogDescription>
                          Define conditions to show specific offers to targeted visitors
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Target Offer *</label>
                          <Select
                            value={editingRoutingRule?.offerId || ''}
                            onValueChange={(val) => setEditingRoutingRule({ ...editingRoutingRule, offerId: val })}
                          >
                            <SelectTrigger data-testid="select-rule-offer">
                              <SelectValue placeholder="Select an offer" />
                            </SelectTrigger>
                            <SelectContent>
                              {offers.map((offer: any) => (
                                <SelectItem key={offer.id} value={offer.id}>
                                  {offer.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Priority</label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editingRoutingRule?.priority || 0}
                            onChange={(e) => setEditingRoutingRule({ ...editingRoutingRule, priority: Number(e.target.value) })}
                            data-testid="input-rule-priority"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Higher priority rules are evaluated first</p>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                          <h4 className="font-medium text-sm">Conditions (all optional)</h4>
                          
                          <div>
                            <label className="text-sm font-medium">Traffic Source</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {['instagram', 'tiktok', 'youtube', 'pinterest', 'email', 'direct'].map((source) => (
                                <label key={source} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editingRoutingRule?.conditions?.trafficSource?.includes(source) || false}
                                    onChange={(e) => {
                                      const current = editingRoutingRule?.conditions?.trafficSource || [];
                                      const updated = e.target.checked
                                        ? [...current, source]
                                        : current.filter((s: string) => s !== source);
                                      setEditingRoutingRule({
                                        ...editingRoutingRule,
                                        conditions: { ...editingRoutingRule?.conditions, trafficSource: updated.length > 0 ? updated : undefined }
                                      });
                                    }}
                                  />
                                  {source}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Device Type</label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {['mobile', 'desktop', 'tablet'].map((device) => (
                                <label key={device} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editingRoutingRule?.conditions?.device?.includes(device) || false}
                                    onChange={(e) => {
                                      const current = editingRoutingRule?.conditions?.device || [];
                                      const updated = e.target.checked
                                        ? [...current, device]
                                        : current.filter((d: string) => d !== device);
                                      setEditingRoutingRule({
                                        ...editingRoutingRule,
                                        conditions: { ...editingRoutingRule?.conditions, device: updated.length > 0 ? updated : undefined }
                                      });
                                    }}
                                  />
                                  {device}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Intent Level</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {['low', 'medium', 'high', 'buyer'].map((intent) => (
                                <label key={intent} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editingRoutingRule?.conditions?.intentLevel?.includes(intent) || false}
                                    onChange={(e) => {
                                      const current = editingRoutingRule?.conditions?.intentLevel || [];
                                      const updated = e.target.checked
                                        ? [...current, intent]
                                        : current.filter((i: string) => i !== intent);
                                      setEditingRoutingRule({
                                        ...editingRoutingRule,
                                        conditions: { ...editingRoutingRule?.conditions, intentLevel: updated.length > 0 ? updated : undefined }
                                      });
                                    }}
                                  />
                                  {intent}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={editingRoutingRule?.conditions?.returning === true}
                                onChange={(e) => {
                                  setEditingRoutingRule({
                                    ...editingRoutingRule,
                                    conditions: {
                                      ...editingRoutingRule?.conditions,
                                      returning: e.target.checked ? true : undefined
                                    }
                                  });
                                }}
                              />
                              Returning Visitors Only
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => {
                              if (!editingRoutingRule?.offerId) {
                                toast({ title: 'Please select an offer', variant: 'destructive' });
                                return;
                              }
                              const ruleData = {
                                pageId: selectedPageId,
                                offerId: editingRoutingRule.offerId,
                                priority: editingRoutingRule.priority || 0,
                                conditions: editingRoutingRule.conditions || {},
                                isFallback: false,
                                isActive: true,
                              };
                              if (editingRoutingRule.id) {
                                updateRoutingRuleMutation.mutate({ id: editingRoutingRule.id, data: ruleData });
                              } else {
                                createRoutingRuleMutation.mutate(ruleData);
                              }
                            }}
                            data-testid="button-save-routing-rule"
                          >
                            {editingRoutingRule?.id ? 'Update Rule' : 'Create Rule'}
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setShowRoutingRuleDialog(false);
                            setEditingRoutingRule(null);
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {routingRules.map((rule: any, index: number) => {
                    const ruleOffer = offers.find((o: any) => o.id === rule.offerId);
                    const conditions = rule.conditions || {};
                    const hasConditions = conditions.trafficSource || conditions.device || conditions.intentLevel || conditions.returning;
                    
                    return (
                      <Card key={rule.id} className="p-4" data-testid={`card-routing-rule-${index}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Priority: {rule.priority}</Badge>
                              {rule.isFallback && <Badge>Fallback</Badge>}
                              {!rule.isActive && <Badge variant="destructive">Inactive</Badge>}
                            </div>
                            <h4 className="font-semibold mb-1">
                              Show: {ruleOffer?.title || 'Unknown Offer'}
                            </h4>
                            {hasConditions && (
                              <div className="text-sm text-muted-foreground space-y-1">
                                {conditions.trafficSource && (
                                  <p>📱 Traffic: {conditions.trafficSource.join(', ')}</p>
                                )}
                                {conditions.device && (
                                  <p>💻 Devices: {conditions.device.join(', ')}</p>
                                )}
                                {conditions.intentLevel && (
                                  <p>🎯 Intent: {conditions.intentLevel.join(', ')}</p>
                                )}
                                {conditions.returning && (
                                  <p>🔄 Returning visitors only</p>
                                )}
                              </div>
                            )}
                            {!hasConditions && (
                              <p className="text-sm text-muted-foreground">No conditions (matches all visitors)</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRoutingRule(rule);
                                setShowRoutingRuleDialog(true);
                              }}
                              data-testid={`button-edit-routing-rule-${index}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRoutingRuleMutation.mutate(rule.id)}
                              data-testid={`button-delete-routing-rule-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {routingRules.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No routing rules yet. Create your first rule to show targeted offers!
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="automations" className="mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">Behavior Automations</h3>
                    <p className="text-sm text-muted-foreground">
                      Trigger offers based on visitor behavior
                    </p>
                  </div>
                  <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openAutomationDialog()} data-testid="button-create-automation">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Automation
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAutomation ? 'Edit Automation' : 'Create Automation'}
                        </DialogTitle>
                        <DialogDescription>
                          Set up behavioral triggers to show offers at the perfect moment
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...automationForm}>
                        <form onSubmit={automationForm.handleSubmit(onSubmitAutomation)} className="space-y-4">
                          <FormField
                            control={automationForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Automation Name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g., 50% Scroll Newsletter Offer"
                                    data-testid="input-automation-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={automationForm.control}
                            name="triggerType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-trigger-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="scroll_depth">Scroll Depth</SelectItem>
                                    <SelectItem value="time_on_page">Time on Page</SelectItem>
                                    <SelectItem value="user_hesitation">User Hesitation</SelectItem>
                                    <SelectItem value="bottom_proximity">Bottom Proximity</SelectItem>
                                    <SelectItem value="offer_repeat_view">Offer Repeat View</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={automationForm.control}
                            name="offerId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Target Offer</FormLabel>
                                <Select
                                  value={field.value ?? NONE_VALUE}
                                  onValueChange={(val) => field.onChange(val === NONE_VALUE ? undefined : val)}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-offer">
                                      <SelectValue placeholder="No linked offer" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value={NONE_VALUE}>No linked offer</SelectItem>
                                    {offers.map((offer: any) => (
                                      <SelectItem key={offer.id} value={offer.id}>
                                        {offer.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={automationForm.control}
                            name="overlayTemplate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Style</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-overlay-template">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="popup">Popup</SelectItem>
                                    <SelectItem value="slide_in">Slide In</SelectItem>
                                    <SelectItem value="banner">Banner</SelectItem>
                                    <SelectItem value="toast">Toast</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Scroll depth config */}
                          {triggerType === 'scroll_depth' && (
                            <FormField
                              control={automationForm.control}
                              name="triggerConfig.scrollPercent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Scroll Percentage (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                      data-testid="input-scroll-percent"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Time on page config */}
                          {triggerType === 'time_on_page' && (
                            <FormField
                              control={automationForm.control}
                              name="triggerConfig.seconds"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Seconds on Page</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                      data-testid="input-seconds"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* User hesitation config */}
                          {triggerType === 'user_hesitation' && (
                            <FormField
                              control={automationForm.control}
                              name="triggerConfig.hesitationSeconds"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hesitation Duration (seconds)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="3"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                      data-testid="input-hesitation-seconds"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Bottom proximity config */}
                          {triggerType === 'bottom_proximity' && (
                            <FormField
                              control={automationForm.control}
                              name="triggerConfig.scrollPercent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Scroll Threshold (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="80"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                      data-testid="input-bottom-scroll-percent"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {/* Offer repeat view config */}
                          {triggerType === 'offer_repeat_view' && (
                            <>
                              <FormField
                                control={automationForm.control}
                                name="triggerConfig.targetOfferId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Offer to Track</FormLabel>
                                    <Select 
                                      onValueChange={(value) => field.onChange(value === NONE_VALUE ? undefined : value)} 
                                      value={field.value || NONE_VALUE}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-target-offer">
                                          <SelectValue placeholder="Select offer to track" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value={NONE_VALUE}>None</SelectItem>
                                        {offers.map((offer: any) => (
                                          <SelectItem key={offer.id} value={offer.id}>
                                            {offer.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={automationForm.control}
                                name="triggerConfig.minViews"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Minimum Views Required</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        placeholder="3"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        data-testid="input-min-views"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Number of times user must view the target offer
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={automationForm.control}
                                name="triggerConfig.timeframeSeconds"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Timeframe (seconds)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        placeholder="60"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        data-testid="input-timeframe-seconds"
                                      />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                      Views must occur within this time window
                                    </p>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          <div className="flex gap-2 pt-4">
                            <Button type="submit" data-testid="button-submit-automation">
                              {editingAutomation ? 'Update' : 'Create'} Automation
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAutomationDialog(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {automations.map((automation: any, index: number) => {
                    const targetOffer = offers.find((o: any) => o.id === automation.offerId);
                    const getTriggerIcon = () => {
                      switch (automation.triggerType) {
                        case 'scroll_depth': return <ArrowDown className="h-4 w-4" />;
                        case 'time_on_page': return <Clock className="h-4 w-4" />;
                        case 'user_hesitation': return <MousePointer className="h-4 w-4" />;
                        case 'bottom_proximity': return <ArrowDown className="h-4 w-4" />;
                        default: return <Zap className="h-4 w-4" />;
                      }
                    };
                    const getTriggerLabel = () => {
                      const config = automation.triggerConfig || {};
                      switch (automation.triggerType) {
                        case 'scroll_depth':
                          return `${config.scrollPercent || 50}% scroll`;
                        case 'time_on_page':
                          return `${config.seconds || 30}s on page`;
                        case 'user_hesitation':
                          return `${config.hesitationSeconds || 3}s pause`;
                        case 'bottom_proximity':
                          return `${config.scrollPercent || 80}% near bottom`;
                        default:
                          return automation.triggerType;
                      }
                    };

                    return (
                      <Card key={automation.id} className="p-4" data-testid={`card-automation-${index}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getTriggerIcon()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold" data-testid={`text-automation-trigger-${index}`}>
                                  {getTriggerLabel()}
                                </h4>
                                <Badge variant="outline">{automation.triggerType}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Shows: <span className="font-medium">{targetOffer?.title || 'Unknown offer'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAutomationDialog(automation)}
                              data-testid={`button-edit-automation-${index}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAutomationMutation.mutate(automation.id)}
                              data-testid={`button-delete-automation-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {automations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No automations yet. Create your first one to start using behavioral triggers!
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Offer Performance</h3>
                    <p className="text-sm text-muted-foreground">
                      Track which offers get the most views, clicks, and engagement
                    </p>
                  </div>

                  {analyticsLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading analytics...</p>
                    </div>
                  ) : offerAnalytics?.offers && offerAnalytics.offers.length > 0 ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Sessions</p>
                              <p className="text-2xl font-bold mt-1">{offerAnalytics.totalSessions}</p>
                            </div>
                            <Eye className="h-8 w-8 text-muted-foreground opacity-50" />
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Views</p>
                              <p className="text-2xl font-bold mt-1">
                                {offerAnalytics.offers.reduce((sum: number, o: any) => sum + o.views, 0)}
                              </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-muted-foreground opacity-50" />
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Clicks</p>
                              <p className="text-2xl font-bold mt-1">
                                {offerAnalytics.offers.reduce((sum: number, o: any) => sum + o.clicks, 0)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
                          </div>
                        </Card>
                      </div>

                      {/* Offer Performance Table */}
                      <div className="space-y-3">
                        {offerAnalytics.offers.map((offer: any, index: number) => (
                          <Card key={offer.offerId} className="p-4" data-testid={`card-offer-analytics-${index}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{offer.title}</h4>
                                  <Badge variant="outline">{offer.type}</Badge>
                                  {offer.neverTouched && (
                                    <Badge variant="destructive" className="text-xs">Never Viewed</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Views</p>
                                    <p className="font-bold text-lg">{offer.views}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Clicks</p>
                                    <p className="font-bold text-lg">{offer.clicks}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">CTR</p>
                                    <p className="font-bold text-lg">{offer.ctr}%</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Avg View Time</p>
                                    <p className="font-bold text-lg">{offer.avgViewDuration}s</p>
                                  </div>
                                </div>
                                
                                {offer.swipes > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs text-muted-foreground">
                                      Swiped {offer.swipes} times
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                      <p className="text-muted-foreground mb-2">No analytics data yet</p>
                      <p className="text-sm text-muted-foreground">
                        Visit your public page to start collecting data
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-24">
              <p className="text-muted-foreground mb-2">No page selected</p>
              <p className="text-sm text-muted-foreground">
                Select a page from the left or create a new one to get started
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
