import { xenditClient } from '@/lib/xendit';
import { ChargeParams } from '@/types/payment';

export const PaymentService = {
  // Tambahkan Promise<any> di sini agar TypeScript tidak bingung di file route.ts
  async createTransaction({ orderId, amount, paymentMethod }: ChargeParams): Promise<any> {
    try {
      const { PaymentRequest } = xenditClient;

      if (paymentMethod === 'va_bca') {
        const response = await PaymentRequest.createPaymentRequest({
          data: {
            referenceId: orderId,
            currency: 'IDR',
            amount: amount,
            // Properti 'country' dihapus agar sesuai dengan skema SDK Xendit
            paymentMethod: {
              type: 'VIRTUAL_ACCOUNT',
              reusability: 'ONE_TIME_USE',
              virtualAccount: {
                channelCode: 'BCA',
                channelProperties: {
                  customerName: 'Customer Xendit',
                },
              },
            },
          },
        });
        
        return { 
          success: true, 
          data: {
            ...response,
            accountNumber: (response.paymentMethod?.virtualAccount?.channelProperties as any)?.virtualAccountNumber
          } 
        };
        
      } else if (paymentMethod === 'qris') {
        const response = await PaymentRequest.createPaymentRequest({
          data: {
            referenceId: orderId,
            currency: 'IDR',
            amount: amount,
            paymentMethod: {
              type: 'QR_CODE',
              reusability: 'ONE_TIME_USE',
              qrCode: {
                channelCode: 'QRIS',
              },
            },
          },
        });
        
        return { 
          success: true, 
          data: {
             ...response,
             qrString: (response.paymentMethod?.qrCode?.channelProperties as any)?.qrString
          } 
        };

      } else {
        throw new Error('Metode pembayaran tidak didukung');
      }

    } catch (error: any) {
      console.error('Xendit Service Error:', error);
      return { 
        success: false, 
        error: error.message || 'Gagal terhubung ke Xendit Sandbox' 
      };
    }
  },
};