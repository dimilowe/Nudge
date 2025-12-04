import { getUncachableStripeClient } from '../stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Nudg subscription products...');

  // Check if products already exist
  const existingProducts = await stripe.products.list({ limit: 100 });
  const starterExists = existingProducts.data.find(p => p.name === 'Starter');
  const proExists = existingProducts.data.find(p => p.name === 'Pro');
  const eliteExists = existingProducts.data.find(p => p.name === 'Elite');

  // Create Starter plan
  if (!starterExists) {
    const starter = await stripe.products.create({
      name: 'Starter',
      description: 'Perfect for getting started - 1 Nudg page, up to 10 offers, basic analytics',
      metadata: {
        tier: 'starter',
        pages: '1',
        offers: '10',
        automations: '5',
      },
    });

    await stripe.prices.create({
      product: starter.id,
      unit_amount: 800, // $8.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('Created Starter product:', starter.id);
  } else {
    console.log('Starter product already exists');
  }

  // Create Pro plan
  if (!proExists) {
    const pro = await stripe.products.create({
      name: 'Pro',
      description: 'For growing creators - 5 Nudg pages, unlimited offers, A/B/C testing',
      metadata: {
        tier: 'pro',
        pages: '5',
        offers: 'unlimited',
        automations: 'unlimited',
        abTesting: 'true',
      },
    });

    await stripe.prices.create({
      product: pro.id,
      unit_amount: 1500, // $15.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('Created Pro product:', pro.id);
  } else {
    console.log('Pro product already exists');
  }

  // Create Elite plan
  if (!eliteExists) {
    const elite = await stripe.products.create({
      name: 'Elite',
      description: 'For power users - Unlimited pages, white-label, API access, custom integrations',
      metadata: {
        tier: 'elite',
        pages: 'unlimited',
        offers: 'unlimited',
        automations: 'unlimited',
        abTesting: 'true',
        whiteLabel: 'true',
        apiAccess: 'true',
      },
    });

    await stripe.prices.create({
      product: elite.id,
      unit_amount: 3500, // $35.00
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('Created Elite product:', elite.id);
  } else {
    console.log('Elite product already exists');
  }

  console.log('Done creating products!');
}

createProducts().catch(console.error);
