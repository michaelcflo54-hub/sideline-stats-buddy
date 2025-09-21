import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  teamId: string;
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
    const { email, teamId, teamName, teamCode, inviterName, appUrl }: InvitationRequest = await req.json();

    console.log("Sending invitation email to:", email);

    // Get the current user (inviter)
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Create invitation record in database
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        invited_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error('Failed to create invitation');
    }

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
              <li>Accept your team invitation when you log in</li>
              <li>Alternative: Use team code: <strong style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${teamCode}</strong></li>
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