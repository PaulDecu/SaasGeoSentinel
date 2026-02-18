import { Controller, Post, Get, Body, Param, HttpCode, Res, Request, UseGuards } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user-role.enum';

// ─── Routes protégées par JWT ─────────────────────────────────────────────────
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @Request() req: ExpressRequest & { user: any },
  ) {
    const tenantId = req.user.tenantId;
    return this.paymentService.createPayment(dto, tenantId);
  }

  @Get(':paymentId/status')
  @Roles(UserRole.ADMIN)
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentStatus(paymentId);
  }
}

// ─── Webhook sans JWT — Mollie n'envoie pas de token ─────────────────────────
@Controller('payments')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: { id?: string }, @Res() res: Response) {
    await this.paymentService.handleWebhook(body);
    res.status(200).send('OK');
  }
}
