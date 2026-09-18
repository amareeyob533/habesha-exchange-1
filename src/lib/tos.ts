/**
 * Terms of Service versioning + canonical text.
 *
 * Each time the ToS text changes, bump CURRENT_TOS_VERSION (e.g. from
 * "v1.0-2026-09-17" to "v1.1-2026-10-01"). The full text is stored here so
 * the signup flow can show it, the admin can export it, and the TosAgreement
 * audit log records which version each user agreed to + a SHA-256 hash of
 * the text (tamper-proof legal evidence).
 *
 * IMPORTANT: Never edit a released version's text. To change the terms,
 * create a NEW version entry and point CURRENT_TOS_VERSION at it. This
 * preserves the integrity of historical agreements.
 */
import { createHash } from 'crypto'

export interface TosVersion {
  version: string // e.g. "v1.0-2026-09-17"
  effectiveDate: string // ISO date the version became active
  title: string
  sections: TosSection[]
}

export interface TosSection {
  heading: string
  body: string
  severity: 'info' | 'warning' | 'danger'
}

/** The current active ToS version. Bump this when the terms change. */
export const CURRENT_TOS_VERSION = 'v1.0-2026-09-17'

/** All known ToS versions (for historical export). */
export const TOS_VERSIONS: TosVersion[] = [
  {
    version: 'v1.0-2026-09-17',
    effectiveDate: '2026-09-17',
    title: 'Project Disclaimer & Terms of Service',
    sections: [
      {
        heading: 'Educational Simulation',
        severity: 'info',
        body: 'Habesha Exchange is strictly a simulator and educational project created by a Grade 12 student. It is NOT a real financial platform, crypto exchange, or money transfer service.',
      },
      {
        heading: 'No Real Funds',
        severity: 'warning',
        body: 'Do NOT deposit or send real fiat money (ETB/BIRR) or real cryptocurrency (USDT/Crypto) to any account, phone number, or address displayed on this website.',
      },
      {
        heading: 'No Refunds & Zero Liability',
        severity: 'danger',
        body: 'Any funds sent to accounts listed on this platform are non-refundable under any circumstances. By accepting these terms, you acknowledge that you are using a simulation, assume full responsibility, and agree that the platform creators are not liable for any financial losses or unintended transfers made by the user.',
      },
    ],
  },
]

/** Get a TosVersion by its version string. */
export function getTosVersion(version: string): TosVersion | undefined {
  return TOS_VERSIONS.find((v) => v.version === version)
}

/** Get the current active TosVersion. */
export function getCurrentTos(): TosVersion {
  return TOS_VERSIONS.find((v) => v.version === CURRENT_TOS_VERSION) || TOS_VERSIONS[0]
}

/**
 * Produce the full canonical ToS text for a version — the exact text the
 * user agreed to. Used for export, PDF generation, and hash computation.
 */
export function getTosFullText(version: string = CURRENT_TOS_VERSION): string {
  const v = getTosVersion(version) || getCurrentTos()
  const lines: string[] = []
  lines.push(`${v.title}`)
  lines.push(`Version: ${v.version}`)
  lines.push(`Effective Date: ${v.effectiveDate}`)
  lines.push('')
  lines.push('Project Disclaimer & Terms of Service')
  lines.push('')
  for (const s of v.sections) {
    lines.push(s.heading)
    lines.push('')
    lines.push(s.body)
    lines.push('')
  }
  lines.push('By creating an account, you confirm that you have read, understood, and agree to all of the above terms.')
  lines.push('')
  lines.push(`— End of Terms (version ${v.version}) —`)
  return lines.join('\n')
}

/**
 * SHA-256 hash of the canonical ToS text for a version. Stored on each
 * TosAgreement row so you can prove (cryptographically) that the user
 * agreed to this exact text — not a modified version.
 */
export function getTosTextHash(version: string = CURRENT_TOS_VERSION): string {
  return createHash('sha256').update(getTosFullText(version)).digest('hex')
}
