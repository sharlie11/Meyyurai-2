"""
Meyyurai Production SMS Provider Service
Provides secure, pluggable SMS delivery for mobile OTP authentication and emergency alerts.
Supports MSG91, Twilio, Fast2SMS, and an explicit NotConfiguredProvider when credentials are unset.
"""

import os
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional

logger = logging.getLogger("meyyurai.sms")

# Test hook storage (only populated during automated test runs)
_TEST_CAPTURED_OTPS: Dict[str, str] = {}


def set_test_captured_otp(phone: str, otp: str) -> None:
    """Testing hook: capture OTP in memory for test assertions only."""
    _TEST_CAPTURED_OTPS[phone] = otp


def get_test_captured_otp(phone: str) -> Optional[str]:
    """Testing hook: retrieve captured OTP for test validation."""
    return _TEST_CAPTURED_OTPS.get(phone)


def clear_test_captured_otps() -> None:
    """Testing hook: clear captured OTPs."""
    _TEST_CAPTURED_OTPS.clear()


class BaseSMSProvider:
    """Base interface for SMS providers."""
    name: str = "base"

    def is_configured(self) -> bool:
        raise NotImplementedError

    def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        raise NotImplementedError


class MSG91Provider(BaseSMSProvider):
    """
    MSG91 SMS Gateway Provider
    Environment Variables required:
      - MSG91_AUTH_KEY: Your MSG91 API Authkey
      - MSG91_TEMPLATE_ID: DLT / Flow Template ID for OTP
      - MSG91_SENDER_ID: 6-character registered Sender ID (e.g. MEYYUR)
    """
    name = "msg91"

    def __init__(self):
        self.auth_key = os.getenv("MSG91_AUTH_KEY", "").strip()
        self.template_id = os.getenv("MSG91_TEMPLATE_ID", "").strip()
        self.sender_id = os.getenv("MSG91_SENDER_ID", "MEYYUR").strip()

    def is_configured(self) -> bool:
        return bool(self.auth_key and (self.template_id or self.sender_id))

    def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        clean_phone = phone.replace("+", "").strip()
        if not clean_phone.startswith("91") and len(clean_phone) == 10:
            clean_phone = "91" + clean_phone

        try:
            if self.template_id:
                # MSG91 Flow API
                url = "https://control.msg91.com/api/v5/flow/"
                payload = {
                    "template_id": self.template_id,
                    "sender": self.sender_id,
                    "short_url": "0",
                    "recipients": [
                        {
                            "mobiles": clean_phone,
                            "otp": otp,
                            "app_name": "Meyyurai"
                        }
                    ]
                }
            else:
                # MSG91 Direct SMS API
                url = "https://api.msg91.com/api/v2/sendsms"
                payload = {
                    "sender": self.sender_id,
                    "route": "4",
                    "country": "91",
                    "sms": [
                        {
                            "message": f"Your Meyyurai citizen verification code is {otp}. Valid for 5 minutes. Do not share.",
                            "to": [clean_phone]
                        }
                    ]
                }

            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={
                    "authkey": self.auth_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=10) as resp:
                status_code = resp.getcode()
                response_text = resp.read().decode("utf-8")
                if status_code in (200, 201, 202):
                    return {
                        "success": True,
                        "provider": self.name,
                        "status": "DELIVERED",
                        "message": "Verification code dispatched via MSG91."
                    }
                else:
                    logger.error("MSG91 error status %s: %s", status_code, response_text)
                    return {
                        "success": False,
                        "provider": self.name,
                        "status": "GATEWAY_ERROR",
                        "message": f"MSG91 returned status code {status_code}"
                    }
        except Exception as e:
            logger.error("MSG91 request exception: %s", e)
            return {
                "success": False,
                "provider": self.name,
                "status": "GATEWAY_EXCEPTION",
                "message": "Failed to connect to MSG91 SMS gateway."
            }


class TwilioProvider(BaseSMSProvider):
    """
    Twilio SMS Provider
    Environment Variables required:
      - TWILIO_ACCOUNT_SID: Twilio Account SID
      - TWILIO_AUTH_TOKEN: Twilio Auth Token
      - TWILIO_FROM_NUMBER: Twilio Sender Number or Alphanumeric Sender
    """
    name = "twilio"

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        self.from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        dest_phone = phone if phone.startswith("+") else f"+91{phone}"
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        
        post_data = urllib.parse.urlencode({
            "From": self.from_number,
            "To": dest_phone,
            "Body": f"Your Meyyurai verification code is {otp}. Valid for 5 minutes."
        }).encode("utf-8")

        import base64
        credentials = f"{self.account_sid}:{self.auth_token}"
        base64_auth = base64.b64encode(credentials.encode("ascii")).decode("ascii")

        req = urllib.request.Request(
            url,
            data=post_data,
            headers={
                "Authorization": f"Basic {base64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.getcode() in (200, 201):
                    return {
                        "success": True,
                        "provider": self.name,
                        "status": "DELIVERED",
                        "message": "Verification code dispatched via Twilio."
                    }
                return {
                    "success": False,
                    "provider": self.name,
                    "status": "GATEWAY_ERROR",
                    "message": f"Twilio returned status {resp.getcode()}"
                }
        except Exception as e:
            logger.error("Twilio exception: %s", e)
            return {
                "success": False,
                "provider": self.name,
                "status": "GATEWAY_EXCEPTION",
                "message": "Failed to connect to Twilio SMS gateway."
            }


class Fast2SMSProvider(BaseSMSProvider):
    """
    Fast2SMS Gateway Provider (India OTP route)
    Environment Variables required:
      - FAST2SMS_API_KEY: Fast2SMS API Key
    """
    name = "fast2sms"

    def __init__(self):
        self.api_key = os.getenv("FAST2SMS_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        clean_phone = phone.replace("+91", "").replace("+", "").strip()
        url = "https://www.fast2sms.com/dev/bulkV2"

        payload = {
            "variables_values": otp,
            "route": "otp",
            "numbers": clean_phone
        }
        data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "authorization": self.api_key,
                "Content-Type": "application/json"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_body = json.loads(resp.read().decode("utf-8"))
                if res_body.get("return") is True:
                    return {
                        "success": True,
                        "provider": self.name,
                        "status": "DELIVERED",
                        "message": "Verification code dispatched via Fast2SMS."
                    }
                return {
                    "success": False,
                    "provider": self.name,
                    "status": "GATEWAY_ERROR",
                    "message": res_body.get("message", "Fast2SMS delivery error")
                }
        except Exception as e:
            logger.error("Fast2SMS exception: %s", e)
            return {
                "success": False,
                "provider": self.name,
                "status": "GATEWAY_EXCEPTION",
                "message": "Failed to connect to Fast2SMS gateway."
            }


class NotConfiguredProvider(BaseSMSProvider):
    """
    Default provider when no third-party SMS provider credentials exist in the environment.
    Explicitly flags status as NOT_CONFIGURED.
    Never exposes or logs plaintext OTP.
    """
    name = "none"

    def is_configured(self) -> bool:
        return False

    def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        return {
            "success": False,
            "provider": "none",
            "status": "NOT_CONFIGURED",
            "message": (
                "SMS Gateway is not configured. Real SMS cannot be delivered to +91 "
                f"{phone[-10:]}. Please configure MSG91_AUTH_KEY, TWILIO_ACCOUNT_SID, "
                "or FAST2SMS_API_KEY in your environment."
            )
        }


def get_sms_provider() -> BaseSMSProvider:
    """Factory to return the active, configured SMS provider based on environment variables."""
    # 1. Check MSG91
    msg91 = MSG91Provider()
    if msg91.is_configured():
        return msg91

    # 2. Check Twilio
    twilio = TwilioProvider()
    if twilio.is_configured():
        return twilio

    # 3. Check Fast2SMS
    fast2sms = Fast2SMSProvider()
    if fast2sms.is_configured():
        return fast2sms

    # 4. Fallback to unconfigured provider
    return NotConfiguredProvider()
