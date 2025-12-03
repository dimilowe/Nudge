import { storage } from '../storage';

export async function seedNudgeData() {
  console.log('🌱 Seeding Nudge data...');

  try {
    // Check if data already exists
    const existingPages = await storage.getNudgPageBySlug('demo');
    if (existingPages) {
      console.log('✓ Seed data already exists, skipping...');
      return {
        creatorId: 'creator-1',
        pageId: 'page-1',
        slug: 'demo',
      };
    }

    // Create demo creator with fixed ID
    const creator = await storage.createCreator({
      userId: 'user-1',
      name: 'Demo Creator',
      bio: 'A creator demonstrating Nudge',
      avatar: null,
      brandColor: '#3b82f6',
    });

    console.log('✓ Created demo creator:', creator.id);

    // Create demo page
    const page = await storage.createNudgPage({
      creatorId: creator.id,
      slug: 'demo',
      title: 'Welcome to My Page',
      description: 'The best offers curated just for you',
      theme: null,
      defaultOfferId: null,
      isPublished: true,
    });

    console.log('✓ Created demo page:', page.slug);

    // Create offers
    const freebie = await storage.createOffer({
      pageId: page.id,
      type: 'freebie',
      title: 'Free Starter Guide',
      description: 'Get my comprehensive starter guide absolutely free',
      cta: 'Download Free Guide',
      href: 'https://example.com/freebie',
      imageUrl: null,
      price: null,
      funnelStage: 'lead_capture',
      displayOrder: 0,
      isActive: true,
    });

    const digitalProduct = await storage.createOffer({
      pageId: page.id,
      type: 'digital_product',
      title: 'Complete Course Bundle',
      description: 'Master everything with my complete course bundle',
      cta: 'Get the Bundle',
      href: 'https://example.com/course',
      imageUrl: null,
      price: 9900,
      funnelStage: 'core',
      displayOrder: 1,
      isActive: true,
    });

    const coaching = await storage.createOffer({
      pageId: page.id,
      type: 'coaching',
      title: '1-on-1 Coaching',
      description: 'Get personalized coaching to achieve your goals faster',
      cta: 'Book a Session',
      href: 'https://example.com/coaching',
      imageUrl: null,
      price: 29900,
      funnelStage: 'premium',
      displayOrder: 2,
      isActive: true,
    });

    console.log('✓ Created 3 offers');

    // Update page with default offer
    await storage.updateNudgPage(page.id, {
      defaultOfferId: digitalProduct.id,
    });

    // Create routing rules
    await storage.createRoutingRule({
      pageId: page.id,
      priority: 100,
      offerId: freebie.id,
      conditions: {
        trafficSource: ['tiktok', 'instagram'],
        intentLevel: ['low', 'medium'],
      },
      isFallback: false,
      isActive: true,
    });

    await storage.createRoutingRule({
      pageId: page.id,
      priority: 90,
      offerId: coaching.id,
      conditions: {
        intentLevel: ['high', 'buyer'],
      },
      isFallback: false,
      isActive: true,
    });

    await storage.createRoutingRule({
      pageId: page.id,
      priority: 0,
      offerId: digitalProduct.id,
      conditions: {},
      isFallback: true,
      isActive: true,
    });

    console.log('✓ Created 3 routing rules');

    // Create automations
    await storage.createAutomation({
      pageId: page.id,
      name: 'Exit Intent Offer',
      triggerType: 'exit_intent',
      triggerConfig: {},
      offerId: freebie.id,
      overlayTemplate: 'popup',
      overlayContent: {
        headline: 'Wait! Before you go...',
        description: 'Grab our free starter guide before you leave!',
      },
      isActive: true,
    });

    await storage.createAutomation({
      pageId: page.id,
      name: '50% Scroll Nudge',
      triggerType: 'scroll_depth',
      triggerConfig: { scrollPercent: 50 },
      offerId: digitalProduct.id,
      overlayTemplate: 'slide_in',
      overlayContent: {
        headline: "You're halfway there!",
        description: 'Ready to take the next step?',
      },
      isActive: true,
    });

    await storage.createAutomation({
      pageId: page.id,
      name: '30 Second Engagement',
      triggerType: 'time_on_page',
      triggerConfig: { seconds: 30 },
      offerId: coaching.id,
      overlayTemplate: 'banner',
      overlayContent: {
        headline: 'Loving what you see?',
        description: "Let's work together personally!",
      },
      isActive: true,
    });

    console.log('✓ Created 3 automations');

    // Use the correct ID from the creator we just created
    return {
      creatorId: creator.id,
      pageId: page.id,
      slug: page.slug,
    };

  } catch (error) {
    console.error('Failed to seed Nudge data:', error);
    throw error;
  }
}
