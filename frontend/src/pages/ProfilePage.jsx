import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/lib/role-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit2, Save, X, User, Bell, Camera, TrendingUp, Trophy,
  Shield, Briefcase, MapPin, Star, Calendar, DollarSign, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { mockRatingHistory, mockArbiterVacancies } from "@/lib/mock-data";
import { getUserProfile, updateUserProfile } from "@/lib/tournament-service";

// ── Arbiter titles that unlock the Verified Arbiter badge
const ARBITER_TITLES = ["IA", "FA", "NA"];

// ── Mock notification prefs (replace with API data later)
const defaultNotifPrefs = {
  tournament_start: true,
  round_announcements: true,
  result_updates: true,
  organizer_approvals: false,
  rating_changes: true,
  new_tournaments: false,
};
const notifLabels = {
  tournament_start: { label: "Tournament Starts", desc: "When a joined tournament begins" },
  round_announcements: { label: "Round Announcements", desc: "New round pairings released" },
  result_updates: { label: "Result Updates", desc: "When match results are posted" },
  organizer_approvals: { label: "Organizer Approvals", desc: "Status of your organizer application" },
  rating_changes: { label: "Rating Changes", desc: "Your rating updates after events" },
  new_tournaments: { label: "New Tournaments", desc: "Newly created tournaments near you" },
};

// ── Mock arbiter applications
const mockApplications = [
  {
    id: "a1",
    tournament: "Online Rapid Series Finals",
    date: "2026-03-20",
    compensation: "$100 flat",
    status: "pending",
    applied_at: "2026-03-01",
  },
];

// ── Mock user profile (replace with API call later)
const mockProfile = {
  name: "Alex Thompson",
  bio: "Passionate chess player focusing on positional play. Regular participant in local and online tournaments.",
  acf_id: "ACF-2024-1847",
  fide_id: "1234567",
  chess_title: "CM",
  rating: 1968,
  national_rating: 1920,
  playing_preferences: ["Classical", "Rapid"],
  country: "AUS",
  profile_picture_url: null,
  updated_at: "2026-02-28T10:30:00Z",
};

const PREFERENCE_OPTIONS = ["Classical", "Rapid", "Blitz", "Bullet", "Correspondence", "Puzzle"];
const TITLE_OPTIONS = ["GM", "WGM", "IM", "WIM", "FM", "WFM", "CM", "WCM", "NM", "IA", "FA", "NA", "None"];
const APPLICATION_STATUS_COLORS = {
  pending: "bg-info/15 text-info border-info/30",
  reviewed: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const isArbiterRole = role === "arbiter";
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(mockProfile);
  const [draftProfile, setDraftProfile] = useState(mockProfile);
  const [historyData, setHistoryData] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("notifPrefs");
      return saved ? JSON.parse(saved) : defaultNotifPrefs;
    } catch {
      return defaultNotifPrefs;
    }
  });
  const [notifUpdatedAt] = useState("2026-02-28T10:30:00Z");
  const [activeTab, setActiveTab] = useState("profile");
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load real user profile from the backend
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (data) {
          const mapped = {
            ...mockProfile,
            name: data.name || `${data.first_name} ${data.last_name}`.trim(),
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            fide_id: data.fide_id || "",
            rating: data.fide_rating || "—",
            rapid_rating: data.rapid_rating || "—",
            blitz_rating: data.blitz_rating || "—",
            national_rating: data.national_rating || "—",
            national_rank: data.national_rank || null,
            chess_title: data.title || "",
            country: data.country || "India",
            profile_picture_url: data.profile_picture_url || null,
            updated_at: data.updated_at,
          };
          setProfile(mapped);
          setDraftProfile(mapped);

          if (data.rating_history) {
             const cleanedHistory = data.rating_history.map(item => ({
                period: item.period.split('-')[1] || item.period,
                classical: item.classical_rating > 0 ? item.classical_rating : null,
                rapid: item.rapid_rating > 0 ? item.rapid_rating : null,
                blitz: item.blitz_rating > 0 ? item.blitz_rating : null,
             }));
             setHistoryData(cleanedHistory);
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    };
    loadProfile();
  }, []);

  const isArbiter = ARBITER_TITLES.includes(profile.chess_title);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateUserProfile({
        first_name: draftProfile.first_name || draftProfile.name?.split(" ")[0] || "",
        last_name: draftProfile.last_name || draftProfile.name?.split(" ").slice(1).join(" ") || "",
        fide_id: draftProfile.fide_id || null,
        fide_rating: parseInt(draftProfile.rating) || 0,
        national_rating: parseInt(draftProfile.national_rating) || 0,
        country: draftProfile.country,
        profile_picture_url: draftProfile.profile_picture_url
      });

      // Merge the API response back — including FIDE-synced ratings and title
      const updated = {
        ...draftProfile,
        name: result.name,
        first_name: result.first_name,
        last_name: result.last_name,
        fide_id: result.fide_id,
        rating: result.fide_rating || draftProfile.rating,
        rapid_rating: result.rapid_rating || draftProfile.rapid_rating,
        blitz_rating: result.blitz_rating || draftProfile.blitz_rating,
        national_rating: result.national_rating,
        national_rank: result.national_rank ?? draftProfile.national_rank,
        chess_title: result.title || draftProfile.chess_title,
        country: result.country || draftProfile.country,
        profile_picture_url: result.profile_picture_url,
        updated_at: result.updated_at,
      };
      setProfile(updated);
      setDraftProfile(updated);

      // Re-fetch the full profile to get the fresh rating history chart
      try {
        const fresh = await getUserProfile();
        if (fresh) {
          const refreshed = {
            ...updated,
            name: fresh.name || updated.name,
            first_name: fresh.first_name || updated.first_name,
            last_name: fresh.last_name || updated.last_name,
            rating: fresh.fide_rating || updated.rating,
            rapid_rating: fresh.rapid_rating || updated.rapid_rating,
            blitz_rating: fresh.blitz_rating || updated.blitz_rating,
            national_rank: fresh.national_rank ?? updated.national_rank,
            chess_title: fresh.title || updated.chess_title,
            country: fresh.country || updated.country,
          };
          setProfile(refreshed);
          setDraftProfile(refreshed);
          if (fresh.rating_history) {
            const cleanedHistory = fresh.rating_history.map(item => ({
              period: item.period.split('-')[1] || item.period,
              classical: item.classical_rating > 0 ? item.classical_rating : null,
              rapid: item.rapid_rating > 0 ? item.rapid_rating : null,
              blitz: item.blitz_rating > 0 ? item.blitz_rating : null,
            }));
            setHistoryData(cleanedHistory);
          }
        }
      } catch (_) {
        // Non-critical: ratings already shown from PATCH response
      }

      // Sync specific fields to session storage so navbar updates immediately
      const savedUserData = sessionStorage.getItem("userData");
      if (savedUserData) {
        const parsedData = JSON.parse(savedUserData);
        parsedData.profile_picture_url = result.profile_picture_url;
        parsedData.firstName = result.first_name || result.name?.split(" ")[0] || parsedData.firstName;
        sessionStorage.setItem("userData", JSON.stringify(parsedData));
      }

      setEditing(false);
      toast.success("Profile saved successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };


  const handleCancel = () => {
    setDraftProfile(profile);
    setPreviewUrl(null);
    setEditing(false);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Initial loading state can be added here if needed
    const loadingToast = toast.loading("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "chess_arena_unsigned");

      const res = await fetch("https://api.cloudinary.com/v1_1/dwpow6jer/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Cloudinary upload failed");

      const data = await res.json();
      const secureUrl = data.secure_url;

      // 1. Instantly save exclusively this field to the backend
      await updateUserProfile({
        profile_picture_url: secureUrl
      });

      // 2. Update local state
      setProfile((p) => ({ ...p, profile_picture_url: secureUrl }));
      setDraftProfile((p) => ({ ...p, profile_picture_url: secureUrl }));

      // 3. Update session storage for global UI sync
      const savedUserData = sessionStorage.getItem("userData");
      if (savedUserData) {
        const parsedData = JSON.parse(savedUserData);
        parsedData.profile_picture_url = secureUrl;
        sessionStorage.setItem("userData", JSON.stringify(parsedData));
      }

      setPreviewUrl(null); // Clear preview so we use the confirmed URL

      toast.success("Profile image updated successfully!", { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image. Please try again.", { id: loadingToast });
    }
  };

  const togglePref = (pref) => {
    setDraftProfile((p) => ({
      ...p,
      playing_preferences: p.playing_preferences.includes(pref)
        ? p.playing_preferences.filter((x) => x !== pref)
        : [...p.playing_preferences, pref],
    }));
  };

  const handleSaveNotifs = () => {
    localStorage.setItem("notifPrefs", JSON.stringify(notifPrefs));
    toast.success("Notification preferences saved!");
    // TODO: call PATCH /api/users/notification-preferences
  };

  const handleApply = (vacancy) => {
    toast.success(`Applied to "${vacancy.tournament}"!`);
    // TODO: call POST /api/arbiter/applications
  };

  const avatarSrc = previewUrl || (editing ? draftProfile.profile_picture_url : profile.profile_picture_url);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="My Profile"
        description="Your chess identity & account settings"
        action={
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1.5" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <div className="h-4 w-4 animate-spin border-2 border-primary-foreground border-t-transparent rounded-full mr-1.5" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => { setDraftProfile(profile); setEditing(true); }}>
                <Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" />Notifications
          </TabsTrigger>
          {isArbiterRole && (
            <TabsTrigger value="arbiter">
              <Shield className="h-3.5 w-3.5 mr-1.5" />Arbiter
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─────────────────────── PROFILE TAB ─────────────────────── */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">

            {/* Left column */}
            <div className="md:col-span-2 space-y-4">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
                {/* Avatar + name row */}
                <div className="flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden chess-gradient flex items-center justify-center border-2 border-border">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-9 w-9 text-primary-foreground" />
                      )}
                    </div>
                    {editing && (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl font-bold">{profile.name}</h2>
                      {profile.chess_title && (
                        <Badge variant="outline" className="text-chess-gold border-chess-gold/40 font-bold text-xs">
                          {profile.chess_title}
                        </Badge>
                      )}
                      {isArbiter && (
                        <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs gap-1">
                          <Shield className="h-3 w-3" /> Verified Arbiter
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                      {profile.country && (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.country}</span>
                      )}
                      <span>FIDE: {profile.fide_id || "—"}</span>
                    </div>

                    {/* Playing preferences as pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {profile.playing_preferences.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio</Label>
                  {editing ? (
                    <Textarea
                      className="mt-1.5"
                      value={draftProfile.bio}
                      onChange={(e) => setDraftProfile((p) => ({ ...p, bio: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                  )}
                </div>
              </motion.div>

              {/* Editable fields */}
              {editing && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stat-card space-y-4">
                  <h3 className="text-sm font-semibold">Edit Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input className="mt-1.5" value={draftProfile.first_name || ""} onChange={(e) => setDraftProfile((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input className="mt-1.5" value={draftProfile.last_name || ""} onChange={(e) => setDraftProfile((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                    </div>
                    <div>
                      <Label>FIDE ID</Label>
                      <Input className="mt-1.5" value={draftProfile.fide_id} onChange={(e) => setDraftProfile((p) => ({ ...p, fide_id: e.target.value }))} placeholder="e.g. 1234567" />
                    </div>
                    <div>
                      <Label>FIDE Rating</Label>
                      <Input className="mt-1.5" type="number" value={draftProfile.rating || ""} onChange={(e) => setDraftProfile((p) => ({ ...p, rating: parseInt(e.target.value) || 0 }))} placeholder="e.g. 1800" />
                    </div>
                    <div>
                      <Label>National Rating</Label>
                      <Input className="mt-1.5" type="number" value={draftProfile.national_rating || ""} onChange={(e) => setDraftProfile((p) => ({ ...p, national_rating: parseInt(e.target.value) || 0 }))} placeholder="e.g. 1750" />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input className="mt-1.5" value={draftProfile.country} onChange={(e) => setDraftProfile((p) => ({ ...p, country: e.target.value }))} placeholder="e.g. India" />
                    </div>
                  </div>


                  <div>
                    <Label>Playing Preferences</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PREFERENCE_OPTIONS.map((opt) => {
                        const selected = draftProfile.playing_preferences.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => togglePref(opt)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:border-primary/60"
                              }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Rating history chart */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Multi-Rating History
                  </h3>
                </div>
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                      <YAxis domain={['dataMin - 20', 'dataMax + 20']} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="classical" name="Classical" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                      <Line type="monotone" dataKey="rapid" name="Rapid" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                      <Line type="monotone" dataKey="blitz" name="Blitz" stroke="#d97706" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                    No rating history available
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right column – quick stats */}
            <div className="space-y-4">
              {[
                { label: "Classical", value: profile.rating, icon: <Star className="h-4 w-4 text-slate-900" /> },
                { label: "Rapid", value: profile.rapid_rating, icon: <TrendingUp className="h-4 w-4 text-blue-900" /> },
                { label: "Blitz", value: profile.blitz_rating, icon: <TrendingUp className="h-4 w-4 text-amber-600" /> },
                { label: "National Rank", value: profile.national_rank ? `#${profile.national_rank}` : "—", icon: <Trophy className="h-4 w-4 text-amber-600" /> },
                { label: "Title", value: profile.chess_title || "—", icon: <Shield className="h-4 w-4 text-purple-400" /> },
                { label: "Country", value: profile.country || "—", icon: <MapPin className="h-4 w-4 text-info" /> },
              ].map(({ label, value, icon }) => (
                <motion.div key={label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="stat-card flex items-center gap-3 py-3">
                  <div className="p-2 rounded-lg bg-muted">{icon}</div>
                  <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="font-bold text-lg">{value}</div>
                  </div>
                </motion.div>
              ))}

              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="stat-card py-3">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Format Preferences</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.playing_preferences.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {p}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        {/* ─────────────────────── NOTIFICATIONS TAB ─────────────────────── */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notification Preferences
              </CardTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Updated {new Date(notifUpdatedAt).toLocaleDateString()}
              </span>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.keys(notifLabels).map((key, i) => (
                <div
                  key={key}
                  className={`flex items-center justify-between py-3 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">{notifLabels[key].label}</p>
                    <p className="text-xs text-muted-foreground">{notifLabels[key].desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                  />
                </div>
              ))}
              <div className="pt-3 flex justify-end">
                <Button size="sm" onClick={handleSaveNotifs}>
                  <Save className="h-4 w-4 mr-1.5" /> Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────── ARBITER TAB ─────────────────────── */}
        <TabsContent value="arbiter" className="mt-4 space-y-4">

          {/* Arbiter Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Arbiter Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isArbiter ? (
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 gap-1 px-3 py-1">
                    <Shield className="h-3.5 w-3.5" /> Verified Arbiter
                  </Badge>
                  <span className="text-sm text-muted-foreground">Your title ({profile.chess_title}) qualifies you as a verified arbiter.</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You don't currently hold an arbiter title (IA/FA/NA). Apply for arbiter vacancies below to get started.
                </p>
              )}
            </CardContent>
          </Card>

          {/* My Applications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> My Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mockApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applications yet.</p>
              ) : (
                <div className="space-y-3">
                  {mockApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between border rounded-lg p-3 gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">{app.tournament}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />{app.date}
                          <DollarSign className="h-3 w-3 ml-1" />{app.compensation}
                        </p>
                        <p className="text-xs text-muted-foreground">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className={APPLICATION_STATUS_COLORS[app.status]}>
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Vacancies */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-chess-gold" /> Recommended Vacancies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockArbiterVacancies.filter((v) => v.status === "open").map((v) => (
                <div key={v.id} className="flex items-start justify-between border rounded-lg p-3 gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{v.tournament}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{v.date}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{v.compensation}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleApply(v)}>
                    Apply
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
