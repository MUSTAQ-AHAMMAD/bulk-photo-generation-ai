import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 50, price: 999, priceId: 'price_starter' },
  { id: 'pro', name: 'Pro', credits: 200, price: 2999, priceId: 'price_pro' },
  { id: 'enterprise', name: 'Enterprise', credits: 1000, price: 9999, priceId: 'price_enterprise' },
];

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  getCreditPackages() {
    return CREDIT_PACKAGES;
  }

  async createCheckoutSession(userId: string, packageId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new BadRequestException('Invalid package');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${pkg.name} Credits (${pkg.credits})` },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${this.config.get('FRONTEND_URL')}/dashboard?payment=success`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/dashboard?payment=cancelled`,
      metadata: { userId, packageId, credits: String(pkg.credits) },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) return;

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.CheckoutSession;
      const { userId, packageId, credits } = session.metadata;
      const creditsNum = parseInt(credits, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsNum } },
      });

      await this.prisma.creditLedger.create({
        data: {
          userId,
          amount: creditsNum,
          type: 'PURCHASE',
          description: `Purchased ${packageId} package`,
        },
      });

      await this.prisma.billingRecord.create({
        data: {
          userId,
          amount: session.amount_total / 100,
          currency: session.currency,
          credits: creditsNum,
          stripeId: session.id,
          description: `${packageId} credits purchase`,
        },
      });

      this.logger.log(`Added ${creditsNum} credits to user ${userId}`);
    }
  }

  async getUserBilling(userId: string) {
    const [records, ledger, user] = await Promise.all([
      this.prisma.billingRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    ]);
    return { records, ledger, currentCredits: user?.credits };
  }
}
