// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Inisialisasi Supabase menggunakan variabel default yang sudah disediakan oleh platform
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Gunakan Service Role agar bisa bypass RLS

    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Ambil payload dari Xendit
    const payload = await req.json()
    
    // Xendit VA menggunakan 'external_id', Xendit QRIS/PaymentRequest menggunakan 'reference_id'
    const externalId = payload.external_id || payload.reference_id

    // 3. Logika penentuan status
    let newStatus = 'PENDING'
    const xenditStatus = payload.status?.toUpperCase()

    if (['ACTIVE', 'COMPLETED', 'PAID', 'SUCCEEDED'].includes(xenditStatus)) {
       newStatus = 'SUCCESS'
    } else if (['EXPIRED', 'FAILED'].includes(xenditStatus)) {
       newStatus = 'FAILED'
    }

    // 4. Cari transaksi di database
    const { data: trx, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_id', externalId)
      .single()

    // Jika data tidak ditemukan (biasanya saat klik "Tes dan Simpan" di Xendit)
    if (fetchError || !trx) {
      console.log(`Transaction with ID ${externalId} not found. This is normal for Xendit Test probes.`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Transaction not found in database' 
      }), { 
        status: 200, // Berikan 200 agar Xendit menganggap webhook aktif
        headers: { "Content-Type": "application/json" } 
      })
    }

    // 5. Simpan log audit
    await supabase
      .from('transaction_logs')
      .insert({
        transaction_id: trx.id,
        raw_payload: payload,
        status_before: trx.status,
        status_after: newStatus
      })

    // 6. Update status transaksi utama
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', trx.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }
})