import { createClient } from '@supabase/supabase-js'

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id, round } = req.query
  if (!id || !isValidUUID(id)) return res.status(400).json({ error: 'Invalid id' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: candidate } = await supabase
    .from('hr_candidates')
    .select('id, name, email, role_applied, stage')
    .eq('id', id)
    .single()

  if (!candidate) return res.status(404).json({ error: 'Candidate not found' })

  let query = supabase.from('hr_interview_slots').select('*').eq('candidate_id', id)
  if (round) query = query.eq('round', parseInt(round))
  const { data: slots } = await query.order('scheduled_at', { ascending: false }).limit(1)

  const slot = slots?.[0] || null

  return res.status(200).json({ candidate, slot })
}
