import "server-only";

/**
 * Whether mail is configured — split out so the health check can report it
 * without importing the Resend SDK.
 *
 * The rules live here rather than being restated in each caller because there
 * are two of them and they differ: password reset needs only an API key, while
 * the contact form also needs somewhere to deliver to. Stating that twice is how
 * a health check ends up reporting `mail: true` on a deployment where the
 * contact form still returns 501.
 */

/**
 * Read lazily, not captured at module load, so a caller never has to assert the
 * value is present: it checks `*Configured()` and then reads it in the same tick.
 */
export const apiKey = () => process.env.RESEND_API_KEY?.trim() || "";
export const contactToAddress = () => process.env.CONTACT_TO_EMAIL?.trim() || "";

/** The default sender, usable without owning a domain. See `senderIsShared`. */
export const SHARED_SENDER = "Lunowix <onboarding@resend.dev>";

export const fromAddress = () => process.env.RESEND_FROM_EMAIL?.trim() || SHARED_SENDER;

/** Password reset needs an API key and nothing else. */
export const resetMailConfigured = () => Boolean(apiKey());

/** The contact form also needs an inbox to deliver to. */
export const contactMailConfigured = () => Boolean(apiKey() && contactToAddress());

/**
 * True while sending through Resend's shared `onboarding@resend.dev`.
 *
 * Worth surfacing because it is not a failure and not success either: Resend
 * accepts the send and returns 200, but delivers ONLY to the address the account
 * was signed up with. Everyone else silently receives nothing. That looks
 * identical to a working deployment right up until the first real user asks for
 * a password reset, so the health check names it rather than reporting a plain
 * `mail: true`.
 */
export const senderIsShared = () => fromAddress() === SHARED_SENDER;
