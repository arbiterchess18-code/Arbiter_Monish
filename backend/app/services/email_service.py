import resend
import os
from sqlalchemy.orm import Session
from .. import models
from ..logic.standings import calculate_standings
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

def send_tournament_started_email(db: Session, tournament_id: int):
    tournament = db.query(models.Tournament).filter(models.Tournament.tournament_id == tournament_id).first()
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
    tb_config = tournament.tie_break_config or ["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"]
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
