import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { hrId, to, subject, body } = req.body;

    if (!hrId || !to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("hr_mail_profiles")
      .select("*")
      .eq("hr_id", hrId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "SMTP profile not found" });
    }

    const transporter = nodemailer.createTransport({
      host: profile.smtp_host,
      port: profile.smtp_port,
      secure: profile.smtp_port === 465, 
      auth: {
        user: profile.smtp_user,
        pass: profile.smtp_pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${profile.from_name || profile.smtp_user}" <${profile.from_email}>`,
      to,
      subject,
      html: body,
    });

    console.log("Email sent:", info.messageId);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
