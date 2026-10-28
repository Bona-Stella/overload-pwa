import type { Contact, ContactForm, Identity } from './api.ts'

export type AccountChallenge = { id: string; candidateId?: string; expiresAt: number }
export type AccountState = {
  identities: Identity[]
  contact: Contact | null
  loaded: boolean
  challenge: AccountChallenge | null
  form: ContactForm | null
  resendAt: number
  verifyAt: number
  // UI feedback only: never a server authorization source, and never inferred from LOGIN or VERIFIED contact.
  confirmedAt: number | null
}
export const emptyAccount = (): AccountState => ({ identities: [], contact: null, loaded: false, challenge: null, form: null, resendAt: 0, verifyAt: 0, confirmedAt: null })
