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
const img1 =
  "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070&auto=format&fit=crop";
const img3 =
  "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2071&auto=format&fit=crop";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [isPasswordShown, setIsPasswordShown] = useState(false);

  const togglePassword = () => setIsPasswordShown(!isPasswordShown);

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${apiUrl}/auth/google/login?mode=login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      // OAuth2PasswordRequestForm expects username and password as URL-encoded form data
      const body = new URLSearchParams();
      body.append("username", email); // Using email as username for now as per form
      body.append("password", password);

      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.detail || "Login failed");
        return;
      }

      const data = await response.json();

      sessionStorage.setItem("token", data.access_token);
      sessionStorage.setItem("userData", JSON.stringify(data.userData));
      window.dispatchEvent(new Event("authChange"));

      // Role-based redirection
      if (data.userData.role === "arbiter") {
        navigate("/arbiter-userhome");
      } else {
        navigate("/player-userhome");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Connection error. Is the backend running?");
    }
  };

  return (
    <div className="login container grid">
      <div className="login__container grid">
        {/* --- Left Side: Slider --- */}
        <div className="login__swiper">
          <div className="login__swiper-data">
            <p className="login__swiper-subtitle">Welcome Back</p>
            <h1 className="login__swiper-title">
              Hello Developer, <br /> Sign In To Get Started
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
              <img src={img1} alt="Slide 1" className="login__swiper-img" />
            </SwiperSlide>
            <SwiperSlide>
              <img src={img3} alt="Slide 2" className="login__swiper-img" />
            </SwiperSlide>
          </Swiper>
        </div>

        {/* --- Right Side: Form --- */}
        <div className="login__area grid">
          <div className="login__data">
            <h1 className="login__title">Welcome Back 👋</h1>
            <p className="login__description">Please enter your details.</p>

            <button
              type="button"
              className="login__button-border"
              onClick={handleGoogleLogin}
            >
              <i className="ri-google-fill"></i> Continue with Google
            </button>
          </div>

          <span className="login__line">or</span>

          <form className="login__form" onSubmit={handleSubmit}>
            <div className="login__content grid">
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
            </div>

            <Link to="/forgot-password" className="login__forgot">
              Forgot Password?
            </Link>
            <button type="submit" className="login__button">
              Log In
            </button>
          </form>

          <p className="login__switch">
            Don’t have an account?{" "}
            <Link to="/signup" className="login__sign">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
