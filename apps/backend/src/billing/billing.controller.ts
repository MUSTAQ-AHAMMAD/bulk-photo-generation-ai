import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('packages')
  @ApiOperation({ summary: 'List credit packages' })
  getPackages() {
    return this.billingService.getCreditPackages();
  }

  @Post('checkout/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  createCheckout(@Request() req, @Param('packageId') packageId: string) {
    return this.billingService.createCheckoutSession(req.user.sub, packageId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody, signature);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing history' })
  getBillingHistory(@Request() req) {
    return this.billingService.getUserBilling(req.user.sub);
  }
}
