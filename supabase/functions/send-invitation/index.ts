import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  teamName: string;
  teamCode: string;
  inviterName: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, teamName, teamCode, inviterName, appUrl }: InvitationRequest = await req.json();

    console.log("Sending invitation email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Down & Distance <noreply@downndistance.com>",
      to: [email],
      subject: `You're invited to join ${teamName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">You're Invited to Join ${teamName}!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Hi there!
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            <strong>${inviterName}</strong> has invited you to join their team <strong>${teamName}</strong> on the Down & Distance Youth Football Analytics Platform.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Getting Started:</h3>
            <ol style="color: #555; line-height: 1.8;">
              <li>Sign up at the app: <a href="${appUrl}" style="color: #2563eb;">${appUrl}</a></li>
              <li>Use team code: <strong style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${teamCode}</strong></li>
              <li>Contact ${inviterName} to be added to the team</li>
            </ol>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            The Down & Distance platform helps youth football teams track game analytics, manage rosters, and improve performance through data-driven insights.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Join ${teamName}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
            If you have any questions, please contact ${inviterName} directly.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);