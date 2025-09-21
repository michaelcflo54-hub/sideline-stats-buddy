import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  role: string;
  feedback: string;
  senderName: string;
  senderEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role, feedback, senderName, senderEmail }: FeedbackRequest = await req.json();

    console.log("Sending feedback email:", { role, senderName, senderEmail });

    const emailResponse = await resend.emails.send({
      from: "Down & Distance <noreply@downndistance.com>",
      to: ["feedback@downndistance.com"],
      subject: `Feedback from ${role}: ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Feedback from Down & Distance User</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #666;">Sender Details</h3>
            <p><strong>Name:</strong> ${senderName}</p>
            <p><strong>Email:</strong> ${senderEmail}</p>
            <p><strong>Role:</strong> ${role}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Feedback / Requirements</h3>
            <div style="white-space: pre-wrap; line-height: 1.6;">${feedback}</div>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This feedback was sent from the Down & Distance team management platform.
          </p>
        </div>
      `,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
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