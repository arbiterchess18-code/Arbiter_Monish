import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function decodeUserData(encoded) {
  if (!encoded) {
    return null;
  }

  try {
    const base64 = decodeURIComponent(encoded)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    return JSON.parse(atob(padded));
  } catch (error) {
    console.error("Failed to decode OAuth user data:", error);
    return null;
  }
}

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userData = decodeUserData(params.get("user_data"));

    if (!userData || !userData.role) {
      navigate("/login?oauth=failed", { replace: true });
      return;
    }

    sessionStorage.setItem("userData", JSON.stringify(userData));
    window.dispatchEvent(new Event("authChange"));

    if (userData.role === "arbiter" || userData.role === "organization") {
      navigate("/arbiter-userhome", { replace: true });
    } else {
      navigate("/player-userhome", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Completing Google sign-in...</h1>
        <p className="mt-2 text-muted-foreground">
          Please wait while we log you in.
        </p>
      </div>
    </div>
  );
}
