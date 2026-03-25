import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import "./Login.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [isConfirmShown, setIsConfirmShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      alert("Invalid reset link");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: newPassword }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        alert(payload.detail || "Could not reset password");
        return;
      }

      alert("Password reset successful. Please login with your new password.");
      navigate("/login");
    } catch (error) {
      console.error("Reset password error:", error);
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
            <h1 className="login__title">Reset Password</h1>
            <p className="login__description">
              Create a new password for your account.
            </p>
          </div>

          {!token ? (
            <div>
              <p
                className="login__description"
                style={{ marginBottom: "1rem" }}
              >
                Invalid or missing reset token.
              </p>
              <Link to="/forgot-password" className="login__sign">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form className="login__form" onSubmit={handleSubmit}>
              <div className="login__content grid">
                <div className="login__box">
                  <input
                    type={isPasswordShown ? "text" : "password"}
                    placeholder="New Password"
                    className="login__input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <i
                    className={
                      isPasswordShown
                        ? "ri-eye-off-line login__eye"
                        : "ri-eye-line login__eye"
                    }
                    onClick={() => setIsPasswordShown((v) => !v)}
                  ></i>
                </div>

                <div className="login__box">
                  <input
                    type={isConfirmShown ? "text" : "password"}
                    placeholder="Confirm New Password"
                    className="login__input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <i
                    className={
                      isConfirmShown
                        ? "ri-eye-off-line login__eye"
                        : "ri-eye-line login__eye"
                    }
                    onClick={() => setIsConfirmShown((v) => !v)}
                  ></i>
                </div>
              </div>

              <button
                type="submit"
                className="login__button"
                disabled={submitting}
              >
                {submitting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <p className="login__switch">
            <Link to="/login" className="login__sign">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
