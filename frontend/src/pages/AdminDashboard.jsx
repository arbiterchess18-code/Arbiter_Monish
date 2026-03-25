import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ShieldCheck, UserPlus } from "lucide-react";

const AdminDashboard = () => {
  const [whitelist, setWhitelist] = setWhitelist => useState([]);
  const [newFideId, setNewFideId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchWhitelist = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/arbiters/whitelist`);
      if (res.ok) {
        const data = await res.json();
        setWhitelist(data);
      } else {
        const errData = await res.json();
        toast({
          title: "Error fetching whitelist",
          description: errData.detail || "You may not be an Admin.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const handleAddFideId = async (e) => {
    e.preventDefault();
    if (!newFideId.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/arbiters/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fide_id: newFideId.trim() })
      });
      
      if (res.ok) {
        toast({ title: "Added Successfully", description: `${newFideId} is now verified.` });
        setNewFideId("");
        fetchWhitelist(); // refresh list
      } else {
        const errData = await res.json();
        toast({ title: "Error", description: errData.detail || "Failed to add FIDE ID.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFideId = async (fideId) => {
    if (!confirm(`Are you sure you want to revoke signup access for FIDE ID ${fideId}?`)) return;

    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/admin/arbiters/whitelist/${fideId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        toast({ title: "Removed Successfully", description: `${fideId} has been revoked.` });
        fetchWhitelist(); // refresh list
      } else {
        const errData = await res.json();
        toast({ title: "Error", description: errData.detail || "Failed to remove FIDE ID.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network Error", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage the secure chess platform overrides and whitelists.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Verified Arbiter Whitelist</CardTitle>
          </div>
          <CardDescription>
            Arbiters must have their FIDE ID verified in this whitelist before they can create an account on Chaduranga.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddFideId} className="flex gap-4 mb-8">
            <Input 
              type="text" 
              placeholder="Enter valid FIDE ID..." 
              value={newFideId}
              onChange={(e) => setNewFideId(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={submitting || !newFideId.trim()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add to Whitelist
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-3 bg-muted p-4 font-medium border-b text-sm">
                <div>FIDE ID</div>
                <div>Added Date</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {whitelist.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No verified arbiters found. Add one above.
                  </div>
                ) : (
                  whitelist.map((item) => (
                    <div key={item.id} className="grid grid-cols-3 p-4 items-center border-b last:border-0 text-sm hover:bg-muted/50 transition-colors">
                      <div className="font-mono">{item.fide_id}</div>
                      <div className="text-muted-foreground">
                        {item.added_at ? new Date(item.added_at).toLocaleDateString() : 'Legacy Import'}
                      </div>
                      <div className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveFideId(item.fide_id)}
                          title="Revoke Verification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
