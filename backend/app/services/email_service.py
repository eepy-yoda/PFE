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
        self.smtp_password = os.getenv("SMTP_PASSWORD") # App Password for Gmail
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)

    def send_verification_email(self, to_email: str, token: str):
        if not self.smtp_user or not self.smtp_password:
            print(f"MOCK EMAIL SENT TO {to_email}: Verification Token is {token}")
            print("To send real emails, please set SMTP_USER and SMTP_PASSWORD in .env")
            return True

        # Construct verification link
        # In a real app, this would be your frontend URL
        verify_link = f"http://localhost:8000/api/v1/auth/verify/{token}"

        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = "Verify your AgencyFlow Account"

        body = f"""
        Hello!
        
        Thank you for joining AgencyFlow. Please click the link below to verify your email:
        {verify_link}
        
        If you didn't create an account, please ignore this email.
        """
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
            print(f"Error sending email: {e}")
            return False

email_service = EmailService()
