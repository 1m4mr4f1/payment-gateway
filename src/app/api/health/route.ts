import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_methods')
      .select('id')
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      data: data
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      detail: error.message
    }, { status: 500 });
  }
}