import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)

    def send_notification_email(self, to_email: str, subject: str, body: str):
        full_body = f"""
        Hello,

        You have a new notification on AgencyFlow:
        
        {body}
        
        Login to your dashboard to see more details.
        """
        return self._send(to_email, subject, full_body)

    def _send(self, to_email: str, subject: str, body: str):
        if not self.smtp_user or not self.smtp_password:
            print(f"MOCK EMAIL TO {to_email}: [{subject}] {body[:100]}...")
            return True

        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()
            print(f"REAL EMAIL SENT TO {to_email}")
            return True
        except Exception as e:
            print(f"Error sending email to {to_email}: {e}")
            return False

email_service = EmailService()
