import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Trophy, Briefcase, Star } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const ArbitersPage = () => {
  const navigate = useNavigate();
  const [arbiters, setArbiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    fetchArbiters();
  }, []);

  const fetchArbiters = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/users/arbiters`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setArbiters(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch arbiters:", err);
      setError("Failed to load arbiters list");
      // Fallback with mock data
      setArbiters(mockArbiters);
    } finally {
      setLoading(false);
    }
  };

  const filteredArbiters = arbiters
    .filter(
      (arbiter) =>
        `${arbiter.first_name} ${arbiter.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        arbiter.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === "name") {
        return `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`,
        );
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Registered Arbiters"
          description="View all arbiters registered in the Chaduranga application."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading arbiters...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Registered Arbiters"
        description="View all arbiters registered in the Chaduranga application."
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="rating">Sort by Rating</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Arbiters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArbiters.length > 0 ? (
          filteredArbiters.map((arbiter, index) => (
            <motion.div
              key={arbiter.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative overflow-hidden rounded-lg border border-border bg-card p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>

              <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold">
                      {arbiter.first_name} {arbiter.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {arbiter.title || "Arbiter"}
                    </p>
                  </div>
                  {arbiter.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{arbiter.email}</span>
                  </div>
                  {arbiter.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{arbiter.location}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3">
                  <div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="text-2xl font-bold">
                        {arbiter.rating || "-"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      <span className="text-2xl font-bold">
                        {arbiter.tournaments_conducted || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Events</p>
                  </div>
                </div>

                {/* Bio/Description */}
                {arbiter.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {arbiter.bio}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/arbiters/${arbiter.user_id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      window.location.href = `mailto:${arbiter.email}`;
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Contact
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center h-96">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No arbiters found</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {filteredArbiters.length}
          </div>
          <p>Arbiters Registered</p>
        </div>
      </div>
    </div>
  );
};

// Mock data for fallback
const mockArbiters = [
  {
    user_id: 1,
    first_name: "John",
    last_name: "Smith",
    email: "john@chess.com",
    title: "Senior Arbiter",
    location: "New York, USA",
    rating: 2650,
    tournaments_conducted: 45,
    is_verified: true,
    bio: "Experienced arbiter with 15+ years in professional chess tournaments.",
  },
  {
    user_id: 2,
    first_name: "Maria",
    last_name: "Garcia",
    email: "maria@chess.com",
    title: "International Arbiter",
    location: "Madrid, Spain",
    rating: 2720,
    tournaments_conducted: 62,
    is_verified: true,
    bio: "FIDE International Arbiter specializing in team tournaments.",
  },
  {
    user_id: 3,
    first_name: "Raj",
    last_name: "Patel",
    email: "raj@chess.com",
    title: "Arbiter",
    location: "Mumbai, India",
    rating: 2590,
    tournaments_conducted: 28,
    is_verified: true,
    bio: "Certified arbiter with expertise in rapid and blitz tournaments.",
  },
];

export default ArbitersPage;
