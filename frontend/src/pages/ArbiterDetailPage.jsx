import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MapPin,
  Trophy,
  Briefcase,
  Star,
  Phone,
  ArrowLeft,
  Award,
  Calendar,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const ArbiterDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [arbiter, setArbiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArbiterDetails();
  }, [id]);

  const fetchArbiterDetails = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/users/${id}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setArbiter(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch arbiter details:", err);
      setError("Failed to load arbiter details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/arbiters")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Arbiters
        </Button>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading arbiter details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !arbiter) {
    return (
      <div className="space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/arbiters")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Arbiters
        </Button>
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive text-center">
          {error || "Arbiter not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Button
        variant="ghost"
        onClick={() => navigate("/arbiters")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Arbiters
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="rounded-lg border border-border bg-card p-6 sticky top-4">
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="text-center space-y-2">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">
                    {arbiter.first_name?.[0]}
                    {arbiter.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {arbiter.first_name} {arbiter.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {arbiter.title || "Arbiter"}
                  </p>
                </div>
                {arbiter.is_verified && (
                  <Badge variant="secondary" className="gap-1 justify-center">
                    <Star className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-xl font-bold">
                      {arbiter.rating || "-"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Rating
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <span className="text-xl font-bold">
                      {arbiter.tournaments_conducted || 0}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Events
                  </p>
                </div>
              </div>

              {/* Contact Button */}
              <Button
                className="w-full gap-2"
                onClick={() => {
                  window.location.href = `mailto:${arbiter.email}`;
                }}
              >
                <Mail className="h-4 w-4" />
                Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${arbiter.email}`}
                    className="font-medium hover:text-primary"
                  >
                    {arbiter.email}
                  </a>
                </div>
              </div>
              {arbiter.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{arbiter.location}</p>
                  </div>
                </div>
              )}
              {arbiter.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${arbiter.phone}`}
                      className="font-medium hover:text-primary"
                    >
                      {arbiter.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Experience */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-4">Experience</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
                <p className="text-2xl font-bold">{arbiter.rating || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    Events Conducted
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  {arbiter.tournaments_conducted || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-muted-foreground">Experience</p>
                </div>
                <p className="text-2xl font-bold">
                  {arbiter.experience_years || "Verified"}
                </p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {arbiter.bio && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-3">About</h3>
              <p className="text-muted-foreground leading-relaxed">
                {arbiter.bio}
              </p>
            </div>
          )}

          {/* Specializations */}
          {arbiter.specializations && arbiter.specializations.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-4">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {arbiter.specializations.map((spec, idx) => (
                  <Badge key={idx}>{spec}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-bold mb-4">Availability</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 font-medium">Available</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {arbiter.availability || "Year-round"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ArbiterDetailPage;
