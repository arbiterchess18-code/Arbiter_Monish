import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import "./Login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState("");
  const [step, setStep] = useState("email");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        alert(payload.detail || "Unable to process request");
        return;
      }

      setMessage(payload.message || "OTP has been sent to your email.");
      if (payload.otp_session_token) {
        setOtpSessionToken(payload.otp_session_token);
        setStep("otp");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("Connection error. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/auth/verify-reset-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp_session_token: otpSessionToken, otp }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        alert(payload.detail || "Invalid OTP");
        return;
      }

      navigate(
        `/reset-password?token=${encodeURIComponent(payload.reset_token)}`,
      );
    } catch (error) {
      console.error("OTP verify error:", error);
      alert("Connection error. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login container grid">
      <div
        className="login__container grid"
        style={{ gridTemplateColumns: "1fr" }}
      >
        <div
          className="login__area grid"
          style={{ maxWidth: "540px", margin: "0 auto" }}
        >
          <div className="login__data">
            <h1 className="login__title">Forgot Password</h1>
            <p className="login__description">
              Enter your email and we will send you a password reset link.
            </p>
          </div>

          {step === "email" ? (
            <form className="login__form" onSubmit={handleSubmit}>
              <div className="login__content grid">
                <div className="login__box">
                  <input
                    type="email"
                    placeholder="Email"
                    className="login__input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <i className="ri-mail-line"></i>
                </div>
              </div>

              {message && (
                <p
                  style={{
                    color: "hsl(var(--primary))",
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="login__button"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form className="login__form" onSubmit={handleVerifyOtp}>
              <div className="login__content grid">
                <div className="login__box">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    className="login__input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <i className="ri-lock-password-line"></i>
                </div>
              </div>

              {message && (
                <p
                  style={{
                    color: "hsl(var(--primary))",
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="login__button"
                disabled={submitting}
              >
                {submitting ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="login__button-border"
                disabled={submitting}
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setMessage("");
                }}
              >
                Change Email
              </button>
            </form>
          )}

          <p className="login__switch">
            Remembered your password?{" "}
            <Link to="/login" className="login__sign">
              Log In
            </Link>
          </p>

          <p className="login__switch" style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="login__sign"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Back to Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
