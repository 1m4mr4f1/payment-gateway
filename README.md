## PAYMENT-GATEWAY

Eksekusi Kode untuk Menghasilkan File:

Set secrets pada Supabase CLI untuk Edge Functions:
Bash

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

🚀 Cara Menjalankan

    Instalasi Dependensi:
    Bash

    npm install

    Sinkronisasi Database:
    Bash

    npx prisma generate
    npx prisma db push

    Jalankan Aplikasi Lokal:
    Bash

    npm run dev

    Deploy Webhook ke Supabase:
    Bash

    npx supabase functions deploy payment-webhook --no-verify-jwt

🧪 Panduan Pengujian (Postman)
1. Inisiasi Pembayaran (Checkout)

    URL: http://localhost:3000/api/checkout

    Method: POST

    Body (JSON):
    JSON

    {
      "amount": 75000,
      "payment_method": "va_bca"
    }

2. Simulasi Webhook (Callback)

    URL: https://[PROJECT_ID].supabase.co/functions/v1/payment-webhook

    Method: POST

    Body (JSON):
    JSON

    {
      "external_id": "ID_TRANSAKSI_DARI_STEP_1",
      "status": "PAID",
      "amount": 75000
    }

📝 Catatan Arsitek

Penggunaan Supabase Edge Functions dalam proyek ini bertujuan untuk menangani trafik callback dari Xendit secara terpisah dari server utama Next.js. Hal ini memastikan skalabilitas tinggi dan keamanan data melalui penggunaan Service Role Key yang terisolasi dari sisi klien.# payment-gateway
