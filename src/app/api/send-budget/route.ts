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

    // Helpers de escape
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const budgetLabel = esc(budget.nombre || `Presupuesto #${budget.budget_number}`)
    const senderEsc = esc(senderName)
    const messageHtml = esc(message).replace(/\n/g, '<br />')

    // Construir HTML del email — estilo coherente con emails transaccionales de Presuply
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0d1b2a;border-radius:12px 12px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" valign="middle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 163.4 160.17" width="48" height="48">
                      <path fill="#0f1b2a" d="M129.7,0H32.9C14.8,0,.01,16.25.01,33.83v92.8c-.01,17.84,14.62,33.49,32.81,33.5l96.57.04c18.25,0,33.93-15.02,33.94-32.93l.06-93.21C163.41,15.91,148.1,0,129.7,0z"/>
                      <path fill="#ed6a1d" d="M77.12,84.62c2.47-2.6,5.41-4.32,8.71-4.36l13.34-.17c11.09-.14,19.27-9.93,19.16-20.61-.1-10.61-8.34-20.03-19.36-20.33-7.4-.2-14.48-.26-21.79.05-12.48.52-22.04,10.59-22.2,22.97v40.31s-17.86,18.09-17.86,18.09l-.06-57.86c-.02-21.52,16.83-39.12,38.36-40.54,8.79-.58,17.36-.62,26.03.08,18.87,1.52,32.8,16.41,34.08,34.96,1.37,19.87-12.52,37.32-32.4,39.69-4.7.56-9.17.25-13.94.26-1.57,0-2.86.67-3.93,1.79l-32.73,34.22c-.81.85-2.01,1.05-2.81.29l-9.92-9.44,37.31-39.39z"/>
                      <path fill="#ed6a1d" d="M47.35,136.53c-4.1,1.6-7.51,2.69-12.16,3.7.78-4.8,1.46-8.15,2.52-12.7l9.63,9z"/>
                    </svg>
                  </td>
                  <td style="padding-left:14px;" valign="middle">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Presuply</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:44px 40px 36px;border-left:1px solid #e8eaed;border-right:1px solid #e8eaed;">
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0d1b2a;line-height:1.2;">
                Presupuesto adjunto
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#ed6a1d;font-weight:600;">
                ${budgetLabel}
              </p>
              <p style="margin:0;font-size:15px;line-height:1.75;color:#3c4043;">
                ${messageHtml}
              </p>
              <hr style="border:none;border-top:1px solid #e8eaed;margin:32px 0;" />
              <p style="margin:0;font-size:13px;color:#9aa0a6;line-height:1.6;">
                Este email incluye el presupuesto en PDF como archivo adjunto.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f8;border-radius:0 0 12px 12px;border:1px solid #e8eaed;border-top:none;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${senderEsc}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
