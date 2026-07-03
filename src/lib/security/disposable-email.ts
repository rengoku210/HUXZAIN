/**
 * Disposable / temporary email detection.
 *
 * Used to block throwaway-mailbox registrations (a common vector for fake
 * accounts, spam listings and OTP abuse). Enforced in TWO places for defence in
 * depth — the client (signup UX) and the server `requestOtp` handler (the real
 * gate, since the client can be bypassed).
 *
 * The domain set below is a curated list of the most common disposable-email
 * providers. It is intentionally a plain exported `Set` so it can be extended
 * from an admin-maintained table or a remote list in the future without changing
 * any call sites.
 */

// Common disposable / temporary mailbox domains (lowercased, no leading @).
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "0-mail.com", "0clickemail.com", "10minutemail.com", "10minutemail.net",
  "20minutemail.com", "30minutemail.com", "33mail.com", "guerrillamail.com",
  "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "guerrillamailblock.com",
  "sharklasers.com", "grr.la", "spam4.me", "mailinator.com", "mailinator.net",
  "mailinator2.com", "notmailinator.com", "reallymymail.com", "mailnesia.com",
  "trashmail.com", "trashmail.net", "trashmail.me", "trbvm.com", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "temp-mail.org", "temp-mail.io", "tempmail.com",
  "tempmail.net", "tempmailo.com", "tempr.email", "tmail.ws", "tmailinator.com",
  "throwawaymail.com", "throwam.com", "yopmail.com", "yopmail.net", "yopmail.fr",
  "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj",
  "speed.1s.fr", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "getnada.com", "nada.email", "getairmail.com", "dispostable.com", "fakeinbox.com",
  "fakemailgenerator.com", "emailondeck.com", "mohmal.com", "mytemp.email",
  "maildrop.cc", "mailcatch.com", "mintemail.com", "mailexpire.com", "spamgourmet.com",
  "spambox.us", "spam.la", "binkmail.com", "bobmail.info", "chammy.info",
  "devnullmail.com", "letthemeatspam.com", "mailin8r.com", "mailnull.com",
  "sogetthis.com", "spamherelots.com", "superrito.com", "thisisnotmyrealemail.com",
  "tradermail.info", "veryrealemail.com", "spam4.me", "mvrht.com", "harakirimail.com",
  "inboxbear.com", "inboxkitten.com", "tempinbox.com", "email-temp.com", "burnermail.io",
  "cloud-mail.top", "discard.email", "discardmail.com", "kurzepost.de", "objectmail.com",
  "proxymail.eu", "rcpt.at", "trash-mail.at", "trashmail.at", "wegwerfemail.de",
  "einrot.com", "fleckmail.de", "muellmail.com", "e4ward.com", "emltmp.com",
  "tempail.com", "10mail.org", "byom.de", "moakt.com", "tafmail.com", "vjuum.com",
  "yepmail.net", "zetmail.com", "1secmail.com", "1secmail.org", "1secmail.net",
]);

/**
 * Extracts the lowercased domain portion of an email address.
 * Returns "" if the address has no parseable domain.
 */
export function getEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * Returns true if the email uses a known disposable / temporary mailbox domain.
 * Matches the exact domain and any subdomain of a disposable domain
 * (e.g. `foo.mailinator.com`).
 */
export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Subdomain check: mail.mailinator.com -> mailinator.com
  return [...DISPOSABLE_EMAIL_DOMAINS].some((d) => domain.endsWith("." + d));
}

/** Shared, user-facing rejection message. */
export const DISPOSABLE_EMAIL_MESSAGE =
  "Temporary or disposable email addresses are not allowed. Please use a permanent email address.";
