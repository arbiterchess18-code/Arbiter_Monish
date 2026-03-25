import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";

// Swiper Styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "remixicon/fonts/remixicon.css";

// Online Chess Images
const i1 =
  "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070&auto=format&fit=crop";
const i3 =
  "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2071&auto=format&fit=crop";

import "./Login.css";

const Signup = () => {
  const navigate = useNavigate();
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [isConfirmShown, setIsConfirmShown] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [role, setRole] = useState("player"); // "player", "arbiter", or "organization"
  const [signupAuthMessage, setSignupAuthMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState("");
  const [signupVerificationToken, setSignupVerificationToken] = useState("");
  const [verifying, setVerifying] = useState(false);

  const restrictedSignupRoles = new Set(["organization"]);

  const togglePassword = () => setIsPasswordShown(!isPasswordShown);
  const toggleConfirm = () => setIsConfirmShown(!isConfirmShown);

  const syncOneSignalUser = async (userId, email) => {
    if (!window.OneSignalDeferred || !userId || !email) {
      return;
    }

    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.login(String(userId));
        await OneSignal.User.addEmail(email);
      } catch (error) {
        console.error("OneSignal user sync failed:", error);
      }
    });
  };

  const handleRoleChange = (selectedRole) => {
    if (restrictedSignupRoles.has(selectedRole)) {
      setRole("player");
      setSignupAuthMessage("You are not authorized for this signup.");
      return;
    }

    setRole(selectedRole);
    setSignupAuthMessage("");
  };

  const handleGoogleSignup = () => {
    if (restrictedSignupRoles.has(role)) {
      setSignupAuthMessage("You are not authorized for this signup.");
      return;
    }

    const params = new URLSearchParams({ mode: "signup", role });
    window.location.href = `${apiUrl}/auth/google/login?${params.toString()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (restrictedSignupRoles.has(role)) {
      setSignupAuthMessage("You are not authorized for this signup.");
      return;
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (data.password !== formData.get("confirmPassword")) {
      alert("Password and confirm password do not match.");
      return;
    }

    try {
      const payload = {
        username: data.email,
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        role,
      };

      if (data.fideId && data.fideId.trim() !== "") {
        payload.fide_id = data.fideId.trim();
      }

      const response = await apiFetch(`${apiUrl}/signup?role=${role}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Signup failed");
        return;
      }

      // Auto-login after successful signup
      const loginBody = new URLSearchParams();
      loginBody.append("username", data.email);
      loginBody.append("password", data.password);

      const loginResponse = await apiFetch(`${apiUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: loginBody,
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        sessionStorage.setItem("userData", JSON.stringify(loginData.userData));
        window.dispatchEvent(new Event("authChange"));

        await syncOneSignalUser(
          loginData.userData?.user_id,
          loginData.userData?.email,
        );

        // Redirect based on role
        if (loginData.userData.role === "arbiter") {
          navigate("/arbiter-userhome");
        } else {
          navigate("/player-userhome");
        }
      } else {
        alert("Account created! Please log in with your credentials.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Connection error. Is the backend running?");
    }
  };

  return (
    <div className="login">
      <div className="login__container">
        {/* --- Left Side: Slider --- */}
        <div className="login__swiper">
          <div className="login__swiper-data">
            <p className="login__swiper-subtitle">Join Us</p>
            <h1 className="login__swiper-title">
              Create Your Account <br /> Start Managing Tournaments
            </h1>
          </div>

          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            effect="fade"
            loop={true}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="login__swiper-wrapper"
          >
            <SwiperSlide>
              <img src={i1} alt="Slide 1" className="login__swiper-img" />
            </SwiperSlide>
            <SwiperSlide>
              <img src={i3} alt="Slide 2" className="login__swiper-img" />
            </SwiperSlide>
          </Swiper>
        </div>

        {/* --- Right Side: Form --- */}
        <div className="login__area">
          <div className="login__data">
            <h1 className="login__title">Create Account 🚀</h1>
            <p className="login__description">Enter Your Details</p>

            {/* Role Dropdown */}
            <div className="login__box">
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="login__input"
              >
                <option value="player">Player</option>
                <option value="arbiter">Arbiter</option>
              </select>
            </div>

            {signupAuthMessage && (
              <p
                style={{
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "8px",
                }}
              >
                {signupAuthMessage}
              </p>
            )}

            {otpSessionToken && (
              <div className="login__box" style={{ marginBottom: "8px" }}>
                <input
                  name="signupOtp"
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
            )}

            {role !== "arbiter" && (
              <button
                type="button"
                className="login__button-border"
                onClick={handleGoogleSignup}
              >
                <i className="ri-google-fill"></i> Sign up with Google
              </button>
            )}
          </div>

          <span className="login__line">or</span>

          <form className="login__form" onSubmit={handleSubmit}>
            <div className="login__content">
              {/* First Name */}
              <div className="login__box">
                <input
                  name="firstName"
                  type="text"
                  placeholder="First Name"
                  className="login__input"
                  required
                />
                <i className="ri-user-line"></i>
              </div>

              {/* Last Name */}
              <div className="login__box">
                <input
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  className="login__input"
                  required
                />
                <i className="ri-user-line"></i>
              </div>

              {/* Email */}
              <div className="login__box">
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="login__input"
                  required
                />
                <i className="ri-mail-line"></i>
              </div>

              {/* Password */}
              <div className="login__box">
                <input
                  name="password"
                  type={isPasswordShown ? "text" : "password"}
                  placeholder="Password"
                  className="login__input"
                  required
                />

                <i
                  className={
                    isPasswordShown
                      ? "ri-eye-off-line login__eye"
                      : "ri-eye-line login__eye"
                  }
                  onClick={togglePassword}
                ></i>
              </div>

              {/* Confirm Password */}
              <div className="login__box">
                <input
                  type={isConfirmShown ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="login__input"
                  name="confirmPassword"
                  required
                />
                <i
                  className={
                    isConfirmShown
                      ? "ri-eye-off-line login__eye"
                      : "ri-eye-line login__eye"
                  }
                  onClick={toggleConfirm}
                ></i>
              </div>

              {/* FIDE ID */}
              <div
                className="login__box flex-col items-start gap-1"
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <label
                    htmlFor="fideId"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--title-color)",
                    }}
                  >
                    FIDE ID{" "}
                    {role === "arbiter" && (
                      <span style={{ color: "#dc2626" }}>*</span>
                    )}
                  </label>
                  {role !== "arbiter" && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        color: "var(--text-color)",
                        backgroundColor: "var(--body-color)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--text-color-light)",
                      }}
                    >
                      Optional
                    </span>
                  )}
                </div>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    id="fideId"
                    name="fideId"
                    type="text"
                    placeholder="e.g., 1503014"
                    className="login__input"
                    style={{ paddingLeft: "2rem" }}
                    required={role === "arbiter"}
                  />
                  <i
                    className="ri-id-card-line"
                    style={{
                      position: "absolute",
                      left: "0",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--title-color)",
                    }}
                  ></i>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-color)",
                    marginTop: "4px",
                    textAlign: "left",
                  }}
                >
                  Link your FIDE ID to automatically sync your rating & title.
                </p>
              </div>
            </div>

            <button type="submit" className="login__button">
              Submit
            </button>

            <Link to="/forgot-password" className="login__forgot">
              Forgot Password?
            </Link>
          </form>

          <p className="login__switch">
            Already have an account?
            <Link to="/login" className="login__sign">
              {" "}
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
