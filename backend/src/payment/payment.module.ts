import { Module } from '@nestjs/common';
import { PaymentController, PaymentWebhookController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentController, PaymentWebhookController], // ✅ les deux controllers
  providers: [PaymentService],
})
export class PaymentModule {}
