import resend
import os
import httpx
from sqlalchemy.orm import Session
from .. import models
from ..logic.standings import calculate_standings
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")


def send_login_alert_email(
    email: str,
    name: str = "Player",
    ip_address: str = "Unknown",
    user_agent: str = "Unknown",
):
    if not resend.api_key:
        print("RESEND_API_KEY is not configured; login alert email not sent")
        return

    from_email = os.getenv("LOGIN_ALERT_FROM_EMAIL", "onboarding@resend.dev")
    subject = "New login to your Chess Arena account"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2563eb;">New Login Detected</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Your account was just used to sign in.</p>
        <p><strong>IP Address:</strong> {ip_address}</p>
        <p><strong>Device:</strong> {user_agent}</p>
        <p>If this was you, no action is needed.</p>
        <p>If this was not you, please reset your password immediately.</p>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": from_email,
                "to": email,
                "subject": subject,
                "html": html_content,
            }
        )
    except Exception as exc:
        print(f"Failed to send login alert email to {email}: {exc}")


def send_onesignal_signup_email(email: str, name: str = "Player"):
    app_id = os.getenv("ONESIGNAL_APP_ID")
    rest_api_key = os.getenv("ONESIGNAL_REST_API_KEY")
    from_name = os.getenv("ONESIGNAL_EMAIL_FROM_NAME", "Chess Arena")

    if not app_id or not rest_api_key:
        print("OneSignal email skipped: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY missing")
        return

    payload = {
        "app_id": app_id,
        "include_email_tokens": [email],
        "email_subject": "Welcome to Chess Arena",
        "email_from_name": from_name,
        "email_body": (
            f"<div style='font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;"
            f"padding:20px;border-radius:10px;'>"
            f"<h2 style='color:#2563eb;'>Welcome to Chess Arena</h2>"
            f"<p>Hello <strong>{name}</strong>,</p>"
            f"<p>Your account has been created successfully.</p>"
            f"<p>You will receive important updates about your activity and tournaments here.</p>"
            f"</div>"
        ),
    }

    headers = {
        "Authorization": f"Basic {rest_api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            "https://onesignal.com/api/v1/notifications",
            json=payload,
            headers=headers,
            timeout=20.0,
        )
        if response.status_code >= 400:
            print(
                f"OneSignal signup email failed for {email}: {response.status_code} {response.text}")
    except Exception as exc:
        print(f"OneSignal signup email error for {email}: {exc}")


def send_password_reset_email(email: str, reset_url: str, name: str = "Player"):
    if not resend.api_key:
        print("RESEND_API_KEY is not configured; password reset email not sent")
        return

    from_email = os.getenv("PASSWORD_RESET_FROM_EMAIL",
                           "onboarding@resend.dev")
    subject = "Reset your password"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>We received a request to reset your password.</p>
        <p>
            <a href="{reset_url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">
                Reset Password
            </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": from_email,
                "to": email,
                "subject": subject,
                "html": html_content,
            }
        )
    except Exception as exc:
        print(f"Failed to send password reset email to {email}: {exc}")


def send_password_reset_otp_email(email: str, otp: str, name: str = "Player"):
    if not resend.api_key:
        print("RESEND_API_KEY is not configured; password reset OTP email not sent")
        return

    from_email = os.getenv("PASSWORD_RESET_FROM_EMAIL",
                           "onboarding@resend.dev")
    subject = "Your password reset OTP"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2563eb;">Password Reset OTP</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Use the OTP below to reset your password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0;">{otp}</p>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": from_email,
                "to": email,
                "subject": subject,
                "html": html_content,
            }
        )
    except Exception as exc:
        print(f"Failed to send password reset OTP email to {email}: {exc}")


def send_signup_otp_email(email: str, otp: str, name: str = "Player"):
    if not resend.api_key:
        print("RESEND_API_KEY is not configured; signup OTP email not sent")
        return

    from_email = os.getenv("PASSWORD_RESET_FROM_EMAIL",
                           "onboarding@resend.dev")
    subject = "Verify your email for signup"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2563eb;">Email Verification OTP</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>Use this OTP to complete your signup:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0;">{otp}</p>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you did not request this signup, you can safely ignore this email.</p>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": from_email,
                "to": email,
                "subject": subject,
                "html": html_content,
            }
        )
    except Exception as exc:
        print(f"Failed to send signup OTP email to {email}: {exc}")


def send_tournament_started_email(db: Session, tournament_id: int):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        return

    # Get approved players
    registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    for reg in registrations:
        player = reg.user
        if not player.email:
            continue

        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb;">Tournament Started!</h2>
            <p>Hello <strong>{player.first_name or player.username}</strong>,</p>
            <p>The tournament <strong>{tournament.tournament_name}</strong> has officially started!</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Venue:</strong> {tournament.venue_name}</li>
                <li><strong>Rounds:</strong> {tournament.rounds}</li>
                <li><strong>Time Control:</strong> {tournament.time_control}</li>
            </ul>
            <p>Check the pairings on the dashboard to see your first opponent.</p>
            <p>Good luck!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated notification from ChessMgr.</p>
        </div>
        """

        try:
            resend.Emails.send({{
                "from": "onboarding@resend.dev",
                "to": player.email,
                "subject": f"Tournament Started: {tournament.tournament_name}",
                "html": html_content
            }})
        except Exception as e:
            print(f"Failed to send start email to {player.email}: {e}")


def send_tournament_results_email(db: Session, tournament_id: int):
    tournament, standings = calculate_standings(db, tournament_id)
    if not tournament or not standings:
        return

    # Find Top 3
    top_3 = standings[:3]
    top_3_html = "<ul>"
    for p in top_3:
        top_3_html += f"<li><strong>Rank {p['rank']}:</strong> {p['player_name']} - {p['points']} pts</li>"
    top_3_html += "</ul>"

    # Get tie-break names for personalized summary
    tb_config = tournament.tie_break_config or [
        "Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"]
    top_tbs = [tb for tb in tb_config if tb != "Direct Encounter"][:3]

    for p in standings:
        if not p.get("email"):
            continue

        # Personal tie-breaks
        personal_tbs = ""
        for i, label in enumerate(top_tbs, start=1):
            val = p["tb_map"].get(label, 0.0)
            personal_tbs += f"<li><strong>{label} (TB{i}):</strong> {val}</li>"

        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #2563eb;">Tournament Completed: {tournament.tournament_name}</h2>
            <p>Hello <strong>{p['player_name']}</strong>,</p>
            <p>Congratulations on completing the tournament! Here is your final performance summary:</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your Final Rank:</strong> {p['rank']}</p>
                <p style="margin: 5px 0 0 0;"><strong>Your Score:</strong> {p['points']} points</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
                    {personal_tbs}
                </ul>
            </div>

            <h3 style="color: #1e293b; margin-top: 30px;">Tournament Winners (Top 3)</h3>
            {top_3_html}

            <p style="margin-top: 30px;">Thank you for participating! You can view the full live standings and match history on the dashboard.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">This is an automated report from ChessMgr.</p>
        </div>
        """

        try:
            resend.Emails.send({{
                "from": "onboarding@resend.dev",
                "to": p["email"],
                "subject": f"Final Results: {tournament.tournament_name}",
                "html": html_content
            }})
        except Exception as e:
            print(f"Failed to send results email to {p['email']}: {e}")
