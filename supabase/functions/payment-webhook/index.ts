// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 

    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    const externalId = payload.external_id || payload.reference_id

    let newStatus = 'PENDING'
    const xenditStatus = payload.status?.toUpperCase()

    if (['ACTIVE', 'COMPLETED', 'PAID', 'SUCCEEDED'].includes(xenditStatus)) {
       newStatus = 'SUCCESS'
    } else if (['EXPIRED', 'FAILED'].includes(xenditStatus)) {
       newStatus = 'FAILED'
    }

    const { data: trx, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_id', externalId)
      .single()

    if (fetchError || !trx) {
      console.log(`Transaction with ID ${externalId} not found. This is normal for Xendit Test probes.`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Transaction not found in database' 
      }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      })
    }

    if (newStatus === 'SUCCESS') {
      if (Number(payload.amount) !== Number(trx.amount)) {
        console.error(`UNDERPAYMENT DETECTED for ${externalId}! Expected: ${trx.amount}, Received: ${payload.amount}`)
        // Tolak status SUCCESS, ubah menjadi penanda error
        newStatus = 'AMOUNT_MISMATCH'
      }
    }

    await supabase
      .from('transaction_logs')
      .insert({
        transaction_id: trx.id,
        raw_payload: payload,
        status_before: trx.status,
        status_after: newStatus
      })

    const { error: updateError } = await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', trx.id)

    if (updateError) throw updateError

    if (newStatus === 'AMOUNT_MISMATCH') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook received, but underpayment detected. Transaction locked.' 
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

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