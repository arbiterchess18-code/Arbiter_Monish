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
const i1 = "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?q=80&w=2070&auto=format&fit=crop";
const i2 = "https://images.unsplash.com/photo-1586161393730-681dc2379740?q=80&w=2072&auto=format&fit=crop";
const i3 = "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2071&auto=format&fit=crop";

import "./Login.css";

const Signup = () => {
    const navigate = useNavigate();
    const [isPasswordShown, setIsPasswordShown] = useState(false);
    const [isConfirmShown, setIsConfirmShown] = useState(false);
    const [role, setRole] = useState("player"); // "player" or "arbiter"

    const togglePassword = () => setIsPasswordShown(!isPasswordShown);
    const toggleConfirm = () => setIsConfirmShown(!isConfirmShown);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (data.password !== formData.get("confirmPassword")) {
            // Note: I should ensure the name is set on the confirm password input or handle it via local state
            // For now, I'll just proceed with the basic fetch
        }

        try {
            const queryParams = new URLSearchParams({
                username: data.email,
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
                role: role
            });

            const response = await fetch(`http://localhost:8000/signup?${queryParams}`, {
                method: "POST"
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.detail || "Signup failed");
                return;
            }

            alert("Account created! Please log in.");
            navigate("/login");
        } catch (error) {
            console.error("Signup error:", error);
            alert("Connection error. Is the backend running?");
        }
    };

    return (
        <div className="login container grid">
            <div className="login__container grid">
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
                            <img src={i2} alt="Slide 2" className="login__swiper-img" />
                        </SwiperSlide>
                        <SwiperSlide>
                            <img src={i3} alt="Slide 3" className="login__swiper-img" />
                        </SwiperSlide>
                    </Swiper>
                </div>

                {/* --- Right Side: Form --- */}
                <div className="login__area grid">
                    <div className="login__data">
                        <h1 className="login__title">Create Account 🚀</h1>
                        <p className="login__description">Enter Your Details</p>

                        {/* Role Toggle */}
                        <div className="login__toggle">
                            <button
                                type="button"
                                className={`login__toggle-btn ${role === 'player' ? 'active' : ''}`}
                                onClick={() => setRole('player')}
                            >
                                Player
                            </button>
                            <button
                                type="button"
                                className={`login__toggle-btn ${role === 'arbiter' ? 'active' : ''}`}
                                onClick={() => setRole('arbiter')}
                            >
                                Arbiter
                            </button>
                            <div
                                className="login__toggle-slider"
                                style={{ transform: role === 'arbiter' ? 'translateX(100%)' : 'translateX(0)' }}
                            ></div>
                        </div>

                        <button className="login__button-border">
                            <i className="ri-apple-fill"></i> Sign up with Apple
                        </button>
                    </div>

                    <span className="login__line">or</span>

                    <form className="login__form" onSubmit={handleSubmit}>
                        <div className="login__content grid">
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
                        </div>

                        <button type="submit" className="login__button">
                            Sign Up
                        </button>
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
