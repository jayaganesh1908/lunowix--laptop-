import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactMessage } from "@/lib/email/contact";

/*
 * The contact form's send path.
 *
 * The form used to run an 800ms timer and then tell the visitor "Message sent.
 * We reply within two working days." Nothing was sent and nobody was going to
 * reply — `lib/email/welcome.ts` had the Resend client wired up, and no route
 * in the app ever imported it.
 *
 * Validation is repeated here rather than trusted from the client, because a
 * route handler is a public endpoint and the browser form is only one caller.
 */

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(20).max(4000),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Some fields need another look.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const result = await sendContactMessage(parsed.data);

  if (result.ok) return NextResponse.json({ ok: true });

  /*
   * 501, not 500, when mail is simply not configured: the request was fine and
   * the deployment is incomplete. The form uses the distinction to tell the
   * visitor the truth rather than claiming a reply is coming.
   */
  if (result.reason === "unconfigured") {
    return NextResponse.json(
      { error: "Mail delivery is not configured on this deployment." },
      { status: 501 },
    );
  }

  return NextResponse.json(
    { error: "The message could not be sent. Please try again." },
    { status: 502 },
  );
}
