// Supabase Edge Function: weekly-progress-report
// Runs in Deno runtime — NO imports from src/. All types are inline.
// Triggered by pg_cron every Sunday at 11:00 UTC (7:00 AM Aruba time, AST UTC-4)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Inline subject labels — cannot import from src/
const SUBJECT_LABELS: Record<string, string> = {
  taal: 'Nederlandse Taal',
  rekenen: 'Rekenen',
  begrijpend_lezen: 'Begrijpend Lezen',
  geschiedenis: 'Geschiedenis',
  aardrijkskunde: 'Aardrijkskunde',
  kennis_der_natuur: 'Kennis der Natuur',
}

interface SubjectProgress {
  subject: string
  current_level: number
  is_stuck: boolean
  total_sessions: number
  last_session_at: string | null
}

interface Child {
  first_name: string
  grade: number
  child_subject_progress: SubjectProgress[]
}

interface FamilyProfile {
  id: string
  display_name: string
  user_id: string
  children: Child[]
}

interface Subscription {
  status: string
  expires_at: string | null
}

function generateReportHTML(parentName: string, children: Child[]): string {
  const childSections = children.map((child) => {
    const subjects = (child.child_subject_progress ?? [])
      .map((p) => {
        const label = SUBJECT_LABELS[p.subject] ?? p.subject
        const stuck = p.is_stuck ? ' ⚠️ vastgelopen' : ''
        const sessions = p.total_sessions > 0 ? ` (${p.total_sessions} sessies)` : ''
        return `<li style="margin: 4px 0;">${label}: <strong>Niveau ${p.current_level}/5</strong>${sessions}${stuck}</li>`
      })
      .join('')

    return `
      <div style="margin: 16px 0; padding: 16px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; color: #0369a1;">${child.first_name} (Klas ${child.grade})</h3>
        ${subjects ? `<ul style="margin: 0; padding-left: 20px; color: #374151;">${subjects}</ul>` : '<p style="color: #6b7280; font-style: italic; margin: 0;">Nog geen lessen gevolgd deze week.</p>'}
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
  <div style="background: #0ea5e9; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ArubaLeren</h1>
    <p style="color: #bae6fd; margin: 8px 0 0 0; font-size: 14px;">Wekelijks Voortgangsbericht</p>
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin: 0 0 16px 0;">Beste <strong>${parentName}</strong>,</p>
    <p style="color: #374151; margin: 0 0 20px 0;">Hier is de voortgang van uw kind(eren) deze week:</p>

    ${childSections}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <a href="https://aruba-leren.com/nl/dashboard"
         style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Bekijk dashboard
      </a>
    </div>

    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
      U ontvangt dit bericht omdat u een actief ArubaLeren abonnement heeft.
    </p>
  </div>
</body>
</html>`
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch all profiles with children and their progress
  const { data: families, error: familiesError } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      user_id,
      children ( first_name, grade, child_subject_progress ( subject, current_level, is_stuck, total_sessions, last_session_at ) )
    `)
    .not('children', 'is', null) as { data: FamilyProfile[] | null; error: unknown }

  if (familiesError || !families) {
    return new Response(JSON.stringify({ error: 'Failed to fetch families', details: familiesError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const family of families) {
    try {
      // Check for active subscription using profile.id (not user_id)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('profile_id', family.id)
        .eq('status', 'active')
        .single() as { data: Subscription | null }

      if (!subscription) {
        skipped++
        continue
      }

      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        skipped++
        continue
      }

      // Get parent email via auth admin API
      const { data: authUser } = await supabase.auth.admin.getUserById(family.user_id)
      const email = authUser?.user?.email

      if (!email) {
        skipped++
        continue
      }

      // Generate HTML report
      const html = generateReportHTML(family.display_name, family.children ?? [])

      // Send via Resend REST API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'ArubaLeren <voortgang@aruba-leren.com>',
          to: [email],
          subject: 'Wekelijks voortgangsbericht - ArubaLeren',
          html,
        }),
      })

      if (response.ok) {
        sent++
      } else {
        const errorText = await response.text()
        console.error(`Failed to send email to ${email}:`, errorText)
        errors++
      }

      // 100ms delay between emails to avoid rate limits
      await new Promise((r) => setTimeout(r, 100))
    } catch (err) {
      console.error(`Error processing family ${family.id}:`, err)
      errors++
    }
  }

  return new Response(
    JSON.stringify({ sent, skipped, errors, total: families.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
