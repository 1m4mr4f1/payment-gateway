import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PaymentService } from '@/services/payment.service';

export async function POST(request: Request) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { amount, payment_method } = body;

    const externalId = `INV-${Date.now()}`;

    const xenditResponse = await PaymentService.createTransaction({
      orderId: externalId,
      amount: amount,
      paymentMethod: payment_method,
    });

    if (!xenditResponse.success) {
      throw new Error(xenditResponse.error);
    }

    let paymentCode = null;
    let paymentUrl = null;

    // Gunakan (as any) untuk menenangkan TypeScript
    if (payment_method === 'va_bca') {
      paymentCode = (xenditResponse.data as any).accountNumber;
    } else if (payment_method === 'qris') {
      paymentCode = (xenditResponse.data as any).qrString;
    }

    const { data: trxData, error: dbError } = await supabase
      .from('transactions')
      .insert([
        { 
          external_id: externalId,
          amount: amount, 
          payment_method_code: payment_method,
          payment_code: paymentCode,
          payment_url: paymentUrl,
          status: 'PENDING',
          metadata: xenditResponse.data 
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      data: trxData 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}