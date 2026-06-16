export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetPdf } from '@/lib/pdf-generator'

function buildHeader(
  isPro: boolean,
  presuplyLogoSvg: string,
  installerLogoDataUri: string | null,
  companyName: string,
): string {
  if (isPro) {
    const logoBlock = installerLogoDataUri
      ? `<img src="${installerLogoDataUri}" alt="${companyName}" style="max-height:60px;max-width:200px;display:block;" />`
      : `<span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${companyName}</span>`
    return `
      <tr>
        <td style="background:#0d1b2a;border-radius:12px 12px 0 0;padding:28px 40px;">
          ${logoBlock}
        </td>
      </tr>`
  }

  // Plan autónomo — branding Presuply
  const logoBlock = presuplyLogoSvg
    ? `<table cellpadding="0" cellspacing="0"><tr>
        <td width="48" valign="middle">${presuplyLogoSvg}</td>
        <td style="padding-left:14px;" valign="middle">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Presuply</span>
        </td>
      </tr></table>`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Presuply</span>`

  return `
    <tr>
      <td style="background:#0d1b2a;border-radius:12px 12px 0 0;padding:28px 40px;">
        ${logoBlock}
      </td>
    </tr>`
}

function buildFooter(isPro: boolean, companyName: string, userEmail: string): string {
  if (isPro) {
    return `
      <tr>
        <td style="background:#f4f6f8;border-radius:0 0 12px 12px;border:1px solid #e8eaed;border-top:none;padding:20px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#9aa0a6;line-height:1.6;">
            &copy; ${new Date().getFullYear()} ${companyName}
          </p>
          <p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.6;">
            ${userEmail}
          </p>
        </td>
      </tr>`
  }

  return `
    <tr>
      <td style="background:#f4f6f8;border-radius:0 0 12px 12px;border:1px solid #e8eaed;border-top:none;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.6;">
          Enviado a trav&eacute;s de
          <a href="https://presuply.app" style="color:#ed6a1d;text-decoration:none;">Presuply</a>
          &middot;
          <a href="https://presuply.app" style="color:#9aa0a6;text-decoration:none;">presuply.app</a>
        </p>
      </td>
    </tr>`
}

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

    // Verificar propiedad y obtener datos del presupuesto
    const { data: budget } = await supabase
      .from('budgets')
      .select('budget_number, nombre, client_name')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single()
    if (!budget) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    // Cargar perfil del remitente
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, full_name, plan_key, logo_url')
      .eq('id', user.id)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pAny = profile as any
    const senderName: string = pAny?.company_name || pAny?.full_name || 'Presuply'
    const planKey: string = pAny?.plan_key ?? 'autonomo'
    const isPro = planKey === 'profesional' || planKey === 'empresa'

    // Cargar logo según plan
    let presuplyLogoSvg = ''
    let installerLogoDataUri: string | null = null

    if (isPro) {
      // Logo del instalador desde Supabase Storage
      const logoPath: string | null = pAny?.logo_url ?? null
      if (logoPath) {
        try {
          const { data: signedData } = await supabase.storage
            .from('logos')
            .createSignedUrl(logoPath, 120)
          if (signedData?.signedUrl) {
            const imgRes = await fetch(signedData.signedUrl)
            if (imgRes.ok) {
              const imgBuffer = await imgRes.arrayBuffer()
              const imgType = imgRes.headers.get('content-type') ?? 'image/jpeg'
              installerLogoDataUri = `data:${imgType};base64,${Buffer.from(imgBuffer).toString('base64')}`
            }
          }
        } catch {
          // Fallback a nombre en texto
        }
      }
    } else {
      // Logo SVG de Presuply desde el filesystem
      try {
        presuplyLogoSvg = fs.readFileSync(
          path.join(process.cwd(), 'public/images/logo.svg'),
          'utf-8',
        )
      } catch {
        // Fallback a texto "Presuply"
      }
    }

    // Generar PDF
    const pdfBuffer = await generateBudgetPdf(budgetId, supabase, user.id, user.email ?? '')
    const pdfBase64 = pdfBuffer.toString('base64')
    const fileName = `presupuesto-${budget.budget_number}.pdf`

    // Helpers de escape
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const budgetLabel = esc(budget.nombre || `Presupuesto #${budget.budget_number}`)
    const senderEsc = esc(senderName)
    const messageHtml = esc(message).replace(/\n/g, '<br />')

    // Construir secciones del email
    const headerHtml = buildHeader(isPro, presuplyLogoSvg, installerLogoDataUri, senderEsc)
    const footerHtml = buildFooter(isPro, senderEsc, esc(user.email ?? ''))

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

          ${headerHtml}

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

          ${footerHtml}

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
        attachment: [{ content: pdfBase64, name: fileName }],
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
