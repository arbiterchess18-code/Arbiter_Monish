import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";

// Swiper Styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "remixicon/fonts/remixicon.css";

// Online Chess Images
const img1 = "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070&auto=format&fit=crop";
const img2 = "https://images.unsplash.com/photo-1586161393730-681dc2379740?q=80&w=2072&auto=format&fit=crop";
const img3 = "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2071&auto=format&fit=crop";

import "./Login.css";

const Login = () => {
    const navigate = useNavigate();
    const [isPasswordShown, setIsPasswordShown] = useState(false);

    const togglePassword = () => setIsPasswordShown(!isPasswordShown);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get("email");
        const password = formData.get("password");

        // Bypass Logic
        if (email === "arbiterchess18@gmail.com" && password === "12345678") {
            const userData = {
                firstName: "Arbiter",
                lastName: "Admin",
                email: email,
                role: "arbiter"
            };
            localStorage.setItem("userData", JSON.stringify(userData));
            localStorage.setItem("authToken", "demo-token"); // Simulating login
            window.dispatchEvent(new Event("authChange"));

            // Role-based redirection
            navigate("/arbiter-userhome");
        } else {
            // Defaulting to player for any other login (simulated)
            const userData = {
                firstName: "Guest",
                lastName: "User",
                email: email,
                role: "player"
            };
            localStorage.setItem("userData", JSON.stringify(userData));
            localStorage.setItem("authToken", "demo-token");
            window.dispatchEvent(new Event("authChange"));

            navigate("/player-userhome");
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
                            <img src={img2} alt="Slide 2" className="login__swiper-img" />
                        </SwiperSlide>
                        <SwiperSlide>
                            <img src={img3} alt="Slide 3" className="login__swiper-img" />
                        </SwiperSlide>
                    </Swiper>
                </div>

                {/* --- Right Side: Form --- */}
                <div className="login__area grid">
                    <div className="login__data">
                        <h1 className="login__title">Welcome Back 👋</h1>
                        <p className="login__description">Please enter your details.</p>

                        <button className="login__button-border">
                            <i className="ri-apple-fill"></i> Sign in with Apple
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

                        <a href="#" className="login__forgot">
                            Forgot Password?
                        </a>
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
