import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, temp_filename } = await req.json()

    // Ambil URL dan Key otomatis dari sistem Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Dapatkan URL Publik dari kedua foto
    const { data: masterPhoto } = supabase.storage.from('avatars').getPublicUrl(`face_${user_id}.jpg`)
    const { data: tempPhoto } = supabase.storage.from('temp_verifikasi').getPublicUrl(temp_filename)

    // 👇 Kredensial Face++ Anda 👇
    const FACE_API_KEY = "16e_7mA_DeRiTlKEVMEYpWt-t93rCur_"
    const FACE_API_SECRET = "GSJUS6P6x41CIrfOAOOxvxtYu5dN_g1P"

    const faceApiUrl = `https://api-us.faceplusplus.com/facepp/v3/compare`

    // 3. Siapkan data untuk dikirim ke Face++
    const formData = new FormData()
    formData.append('api_key', FACE_API_KEY)
    formData.append('api_secret', FACE_API_SECRET)
    formData.append('image_url1', masterPhoto.publicUrl)
    formData.append('image_url2', tempPhoto.publicUrl)

    // 4. Minta AI Face++ untuk membandingkan foto
    const aiResponse = await fetch(faceApiUrl, { method: 'POST', body: formData })
    const aiResult = await aiResponse.json()

    // 5. Ekstrak skor kemiripan asli dari AI atau tangkap pesan errornya
    let similarityScore = 0.0
    let debugMessage = "Verifikasi AI selesai."

    if (aiResult.confidence !== undefined) {
       // Kita bagi 100 agar menjadi format 0.0 - 1.0
       similarityScore = aiResult.confidence / 100.0 
    } else {
       // 🔥 JIKA GAGAL, KITA TANGKAP PESAN ERROR DARI FACE++ DISINI 🔥
       debugMessage = "ERROR FACE++: " + JSON.stringify(aiResult)
    }

    // 6. Segera hapus foto selfie sementara dari storage
    await supabase.storage.from('temp_verifikasi').remove([temp_filename])

    // 7. Kirim respon kembali ke aplikasi Android
    return new Response(
      JSON.stringify({ 
        success: true, 
        similarity: similarityScore,
        message: debugMessage // <-- Pesan ini akan muncul di Logcat Android Anda
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})