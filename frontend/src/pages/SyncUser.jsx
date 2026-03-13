import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useAuth } from "@clerk/react";
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";

export default function SyncUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function syncDetailedUser() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        navigate("/login");
        return;
      }

      try {
        // Collect identity data from Clerk
        const clerk_user_id = user.id;
        const email = user.primaryEmailAddress?.emailAddress || "";
        const first_name = user.firstName || "";
        const last_name = user.lastName || "";
        
        // Grab the pending role they picked in Signup.jsx (defaults to player if empty/missing)
        const role = localStorage.getItem("pendingRole") || "player";
        
        // Grab token securely via Clerk
        const token = await getToken();

        // Push to local PostgreSQL using raw fetch so we don't cause circular dependencies
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            clerk_user_id,
            email,
            first_name,
            last_name,
            role,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to sync user with backend database.");
        }

        const data = await response.json();
        const { userData } = data;

        // Store validated pgsql user data and clean up setup variables
        sessionStorage.setItem("userData", JSON.stringify(userData));
        setRole(userData.role);
        localStorage.removeItem("pendingRole");

        // Route them to their proper home based on DB role
        if (userData.role === "arbiter") {
          navigate("/arbiter-userhome");
        } else if (userData.role === "organization") {
          navigate("/orbiter");
        } else {
          navigate("/player-userhome");
        }

      } catch (err) {
        console.error("Sync Error:", err);
        setError("There was a problem syncing your account. Please try logging in again.");
      }
    }

    syncDetailedUser();
  }, [isLoaded, isSignedIn, user, navigate, setRole, getToken]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-destructive/10 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Sync Failed</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="loader"></div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Synchronizing your account...
        </p>
      </div>
    </div>
  );
}
