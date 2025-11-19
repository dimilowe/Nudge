import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch creator data
  const { data: demoData, isLoading } = useQuery({
    queryKey: ['/api/demo'],
  });

  const creator = (demoData as any)?.creator;

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      return await apiRequest('/api/profile/username', 'PUT', { username: newUsername });
    },
    onSuccess: () => {
      toast({ title: 'Username updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/demo'] });
      setUsername('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update username', 
        description: error.message || 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest('/api/profile/password', 'PUT', data);
    },
    onSuccess: () => {
      toast({ title: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update password', 
        description: error.message || 'Please check your current password',
        variant: 'destructive' 
      });
    },
  });

  const handleUpdateUsername = () => {
    if (!username.trim()) {
      toast({ title: 'Please enter a username', variant: 'destructive' });
      return;
    }
    updateUsernameMutation.mutate(username);
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Please fill in all password fields', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="page-profile">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gradient mb-3">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Account Information</h2>
              <p className="text-sm text-muted-foreground">View and update your account details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Current Username</label>
              <div className="p-3 bg-muted/50 rounded-lg text-muted-foreground">
                {creator?.name || 'Not set'}
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">Update Username</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50"
                  data-testid="input-new-username"
                />
                <Button
                  onClick={handleUpdateUsername}
                  disabled={updateUsernameMutation.isPending}
                  className="gradient-primary text-white shadow-lg shadow-purple-500/30"
                  data-testid="button-update-username"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUsernameMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Password Reset */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Password & Security</h2>
              <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Current Password</label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-background/50"
                data-testid="input-current-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background/50"
                data-testid="input-new-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-background/50"
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={updatePasswordMutation.isPending}
              className="w-full gradient-primary text-white shadow-lg shadow-purple-500/30"
              data-testid="button-update-password"
            >
              <Lock className="w-4 h-4 mr-2" />
              {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
