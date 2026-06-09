export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetPdf } from '@/lib/pdf-generator'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let budgetId: string, clientEmail: string, subject: string, message: string
    try {
      const body = await request.json()
      budgetId = body.budgetId
      clientEmail = body.clientEmail
      subject = body.subject
      message = body.message
    } catch {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    if (!budgetId || !clientEmail || !subject || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar propiedad y obtener número de presupuesto
    const { data: budget } = await supabase
      .from('budgets')
      .select('budget_number, nombre, client_name')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single()
    if (!budget) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    // Obtener datos del perfil para el remitente
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, full_name')
      .eq('id', user.id)
      .single()

    const senderName = profile?.company_name || profile?.full_name || 'Presuply'

    // Generar PDF
    const pdfBuffer = await generateBudgetPdf(budgetId, supabase, user.id, user.email ?? '')
    const pdfBase64 = pdfBuffer.toString('base64')

    const fileName = `presupuesto-${budget.budget_number}.pdf`

    // Construir HTML del email — sin branding de Presuply, profesional y neutral
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .body { padding: 36px 40px; }
    .message { font-size: 15px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 28px 0; }
    .note { font-size: 13px; color: #9CA3AF; line-height: 1.6; }
    .footer { background: #F9FAFB; padding: 18px 40px; font-size: 12px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="body">
      <p class="message">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>
      <hr class="divider" />
      <p class="note">Encontrará el presupuesto adjunto en formato PDF.</p>
    </div>
    <div class="footer">
      Este mensaje ha sido enviado por ${senderName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </div>
  </div>
</body>
</html>`

    // Enviar via Brevo
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY ?? '',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: 'contacto@presuply.app' },
        to: [{ email: clientEmail }],
        replyTo: { email: user.email ?? 'contacto@presuply.app' },
        subject,
        htmlContent,
        attachment: [
          {
            content: pdfBase64,
            name: fileName,
          },
        ],
      }),
    })

    if (!brevoRes.ok) {
      const errText = await brevoRes.text()
      console.error('Brevo error:', brevoRes.status, errText)
      return NextResponse.json({ error: 'Error al enviar el email' }, { status: 502 })
    }

    // Actualizar estado a 'enviado'
    await supabase
      .from('budgets')
      .update({ status: 'enviado', client_email: clientEmail })
      .eq('id', budgetId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en /api/send-budget:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
